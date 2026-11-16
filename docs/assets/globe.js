// The Corner World: the globe. Draws the world on two canvases, one for the land and one above it for
// everything that moves or lights up (the route, pins, airports, what the pointer is over), and turns
// dragging, pinching, the wheel and the arrow keys into movement. It can also unroll into a flat map.
// It knows nothing about guides or trips: assets/app.js says what to colour and hears what was clicked.
(function () {
"use strict";

const RAD = Math.PI / 180, DEG = 180 / Math.PI, HALF = Math.PI / 2;
const K_MAX = 48;                 // how far in the globe zooms (1 is the whole globe)
const FLAT_W = 5.47, FLAT_H = 2.84; // the flat map's size, in the same units as a globe of radius 1
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const lerp = (a, b, t) => a + (b - a) * t;
const wrap180 = (lng) => ((lng + 180) % 360 + 360) % 360 - 180;
const vec = (lng, lat) => { const l = lng * RAD, p = lat * RAD, c = Math.cos(p); return [c * Math.cos(l), c * Math.sin(l), Math.sin(p)]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Coarser copies of the map's shapes, for when it is zoomed out and the detail is smaller than a pixel.
// The world is thousands of lines ("arcs"), each shared by the countries either side of it, so thinning the
// arcs rather than the countries keeps neighbours meeting exactly. Every point of an arc gets a score:
// the furthest, in radians, the line would stray if the point and the lesser ones around it were dropped
// (the lines are great circles, as d3 draws them). A copy thinned to a tolerance keeps the points that
// score above it, so one scoring serves every level of detail. `floor` is the finest tolerance that
// will be asked for: scores at or under it are not worked out.
function thinner(topology, object, floor) {
  const { scale: [kx, ky], translate: [dx, dy] } = topology.transform;
  const arcs = topology.arcs.map((arc) => { let x = 0, y = 0; return arc.map(([ax, ay]) => [(x += ax) * kx + dx, (y += ay) * ky + dy]); });
  // Each arc's points on the unit sphere, as x, y, z one after another
  const vecs = arcs.map((arc) => {
    const v = new Float64Array(arc.length * 3);
    for (let i = 0; i < arc.length; i++) { const l = arc[i][0] * RAD, p = arc[i][1] * RAD, c = Math.cos(p); v[i * 3] = c * Math.cos(l); v[i * 3 + 1] = c * Math.sin(l); v[i * 3 + 2] = Math.sin(p); }
    return v;
  });

  function score(v) {
    const n = v.length / 3, out = new Float32Array(n), stack = [0, n - 1, Infinity];
    if (n) out[0] = out[n - 1] = Infinity;
    while (stack.length) {
      const cap = stack.pop(), j = stack.pop(), i = stack.pop();
      if (j - i < 2) continue;
      const ax = v[i * 3], ay = v[i * 3 + 1], az = v[i * 3 + 2], bx = v[j * 3], by = v[j * 3 + 1], bz = v[j * 3 + 2], ab = ax * bx + ay * by + az * bz;
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      let worst = 0, at = -1;
      for (let m = i + 1; m < j; m++) {
        const qx = v[m * 3], qy = v[m * 3 + 1], qz = v[m * 3 + 2], qa = qx * ax + qy * ay + qz * az, qb = qx * bx + qy * by + qz * bz;
        // Off the side of the line, or past one of its ends (which is all there is when it starts and ends at the same point)
        const d = len < 1e-9 || qa < ab || qb < ab ? Math.sqrt(Math.max(0, 2 - 2 * Math.max(qa, qb))) : Math.abs(qx * nx + qy * ny + qz * nz) / len;
        if (d > worst) { worst = d; at = m; }
      }
      // A point can't matter more than the one that split the line before it: it only exists once that one is kept
      const mine = Math.min(worst, cap);
      if (mine > floor) { out[at] = mine; stack.push(i, at, mine, at, j, mine); }
    }
    return out;
  }

  const scores = vecs.map(score);

  // How much of the globe a ring covers, near enough, and which way round it runs: the ring laid flat on
  // the plane that touches the globe at its middle. Below zero when it runs clockwise seen from outside,
  // which is how the map data draws the edge of a piece of land. d3.geoArea gives the exact figure but
  // is slow: asked about every ring on the map, it holds the page up for a fifth of a second.
  function flatArea(ring) {
    const n = ring.length - 1, v = new Float64Array(n * 3);
    let mx = 0, my = 0, mz = 0;
    for (let i = 0; i < n; i++) { const q = vec(ring[i][0], ring[i][1]); v[i * 3] = q[0]; v[i * 3 + 1] = q[1]; v[i * 3 + 2] = q[2]; mx += q[0]; my += q[1]; mz += q[2]; }
    const m = Math.hypot(mx, my, mz);
    if (m < 1e-12) return 0;
    mx /= m; my /= m; mz /= m;
    // Two directions across the plane: u, and w a quarter turn anticlockwise from it seen from outside
    let ux = -my, uy = mx, uz = 0;
    if (Math.hypot(ux, uy) < 1e-6) { ux = 1; uy = 0; }
    const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul;
    const wx = my * uz - mz * uy, wy = mz * ux - mx * uz, wz = mx * uy - my * ux;
    let twice = 0, px = v[(n - 1) * 3] * ux + v[(n - 1) * 3 + 1] * uy, py = v[(n - 1) * 3] * wx + v[(n - 1) * 3 + 1] * wy + v[(n - 1) * 3 + 2] * wz;
    for (let i = 0; i < n; i++) {
      const x = v[i * 3] * ux + v[i * 3 + 1] * uy, y = v[i * 3] * wx + v[i * 3 + 1] * wy + v[i * 3 + 2] * wz;
      twice += px * y - x * py; px = x; py = y;
    }
    return twice / 2;
  }

  const thin = (tol) => {
    const thinned = { type: "Topology", objects: topology.objects, arcs: arcs.map((arc, i) => { const mine = scores[i]; return arc.filter((_, j) => mine[j] > tol); }) };
    // An island smaller than the tolerance is left as a line or a sliver with no area. Those go: d3 can
    // read a ring with nothing inside it as "everywhere but here" and flood the globe with it. So does
    // a piece of land whose edge has ended up running the wrong way round.
    const least = tol * tol;
    return topojson.feature(thinned, topology.objects[object]).features.map((f) => {
      const polygons = [];
      for (const rings of f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates) {
        if (rings[0].length < 4) continue;
        const outer = flatArea(rings[0]);
        if (outer >= -least) continue;
        polygons.push(rings.filter((ring, i) => !i || (ring.length >= 4 && Math.abs(flatArea(ring)) > least)));
      }
      return { type: "Feature", geometry: { type: "MultiPolygon", coordinates: polygons } };
    });
  };
  // Each shape's arcs, as points on the unit sphere and as longitude and latitude
  const parts = topology.objects[object].geometries.map((g) => [...new Set(g.arcs.flat(3).map((a) => (a < 0 ? ~a : a)))].map((a) => ({ points: arcs[a], vecs: vecs[a] })));
  return { thin, parts };
}

// A shape's lines as points on the unit sphere (x, y, z one after another), for drawing on the globe
// without d3. A stretch longer than `step` radians gets points added along it, so that drawing straight
// from point to point stays within a fraction of a pixel of the curve the stretch makes on the globe.
function onSphere(geometry, step) {
  const lines = [], cosStep = Math.cos(step);
  const add = (line, closed) => {
    const n = closed ? line.length - 1 : line.length, out = [];
    if (n < 2) return;
    let a = vec(line[0][0], line[0][1]);
    for (let i = 1; i <= (closed ? n : n - 1); i++) {
      const b = vec(line[i % n][0], line[i % n][1]), cos = clamp(dot(a, b), -1, 1);
      out.push(a[0], a[1], a[2]);
      if (cos < cosStep) {
        const angle = Math.acos(cos), pieces = Math.ceil(angle / step), sin = Math.sin(angle);
        for (let j = 1; j < pieces; j++) {
          const wa = Math.sin((1 - j / pieces) * angle) / sin, wb = Math.sin(j / pieces * angle) / sin;
          out.push(a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb);
        }
      }
      a = b;
    }
    if (!closed) out.push(a[0], a[1], a[2]);
    lines.push({ pts: Float32Array.from(out), closed });
  };
  const c = geometry.coordinates;
  if (geometry.type === "Polygon") for (const ring of c) add(ring, true);
  else if (geometry.type === "MultiPolygon") for (const rings of c) for (const ring of rings) add(ring, true);
  else if (geometry.type === "MultiLineString") for (const line of c) add(line, false);
  else if (geometry.type === "LineString") add(c, false);
  return lines;
}

// The same numbers every visit, so the stars don't jump about between page loads
function seeded(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

// `features` are the shapes at full detail, in the order they come in `topology.objects[object]`.
// `detail` is how many pixels a degree must cover on screen before each finer level of detail is drawn.
// A label gives its place as `lng` and `lat`, or as `at`, a function that returns them when first asked.
window.createGlobe = function createGlobe({ wrap, base, over, topology, object, features, dots = [], pins = [], airports = [], labels = [], reducedMotion = false, detail = [40, 12, 4], on = {} }) {
  const B = base.getContext("2d"), O = over.getContext("2d");
  const pathB = d3.geoPath(null, B), pathO = d3.geoPath(null, O);

  // ---------- what is drawn ----------

  // Four levels of detail: full, and three thinned for when a degree is under 40, under 12 and under 4
  // pixels on screen (a phone showing the whole globe is under 4). LOD_TOL is how far, in degrees, each
  // level's lines may stray from the full ones: always under a pixel where the level is used. The second
  // level is made a moment after the page has drawn, and full detail stands in until then.
  // A fifth, looser still, is only for a small globe while it unrolls into the flat map.
  const LOD_PPD = detail, LOD_TOL = [0, 0.02, 0.075, 0.24, 0.5], COARSEST = 3, UNROLLING = 4;
  // The most pixels to a radian each level is drawn at, and so how long a stretch between two points
  // may be (in radians) before its curve on screen would show as a straight line: a third of a pixel out
  const LOD_SCALE = [32000, LOD_PPD[0] / RAD, LOD_PPD[1] / RAD, LOD_PPD[2] / RAD];
  const LOD_STEP = LOD_SCALE.map((scale) => 2 * Math.sqrt(2 * 0.35 / scale));
  const shapes = thinner(topology, object, LOD_TOL[1] * RAD);
  const far = shapes.thin(LOD_TOL[2] * RAD), farthest = shapes.thin(LOD_TOL[3] * RAD);
  const nRaw = d3.geoNaturalEarth1Raw, oRaw = d3.geoOrthographicRaw;
  // Something drawn on the map: its outline at each level (`lod`), and what trace() works out from that
  // the first time each level is drawn, as points on the globe (`ball`) and on the flat map (`sheet`)
  const drawable = (lod) => ({ lod, ball: [null, null, null, null], sheet: [null, null, null, null] });
  const feats = features.map((f, i) => {
    // The cap of the globe that holds the shape (to skip it when that is out of view), and the box that
    // holds it on the flat map
    const sum = [0, 0, 0], box = [[Infinity, Infinity], [-Infinity, -Infinity]];
    for (const arc of shapes.parts[i]) { const q = arc.vecs; for (let j = 0; j < q.length; j += 3) { sum[0] += q[j]; sum[1] += q[j + 1]; sum[2] += q[j + 2]; } }
    const n = Math.hypot(sum[0], sum[1], sum[2]) || 1, v = [sum[0] / n, sum[1] / n, sum[2] / n];
    let low = 1;
    for (const arc of shapes.parts[i]) {
      const q = arc.vecs;
      for (let j = 0; j < q.length; j += 3) { const d = q[j] * v[0] + q[j + 1] * v[1] + q[j + 2] * v[2]; if (d < low) low = d; }
      for (const [lng, lat] of arc.points) {
        const [x, y] = nRaw(lng * RAD, lat * RAD);
        if (x < box[0][0]) box[0][0] = x; if (x > box[1][0]) box[1][0] = x; if (-y < box[0][1]) box[0][1] = -y; if (-y > box[1][1]) box[1][1] = -y;
      }
    }
    const r = Math.acos(clamp(low, -1, 1)) + 0.002;
    // `front`: the shape is wholly on the near side of the globe when its middle is this far round or nearer
    return { ...drawable([f, f, far[i], farthest[i]]), f, v, r, cosR: Math.cos(r), sinR: Math.sin(r), front: r < HALF - 0.02 ? Math.sin(r + 0.01) : 2, flat: box, key: "land", from: null, to: null, col: null, selected: false };
  });
  let level = 0;
  setTimeout(() => {
    const mid = shapes.thin(LOD_TOL[1] * RAD);
    feats.forEach((s, i) => { s.lod[1] = mid[i]; s.ball[1] = s.sheet[1] = null; });
    invalidate(true);
  }, 700);
  for (const list of [dots, pins, airports]) for (const p of list) p.v = vec(p.lng, p.lat);
  labels.sort((a, b) => b.r - a.r);
  const stars = (() => { const rnd = seeded(7); return Array.from({ length: 170 }, () => ({ x: rnd(), y: rnd(), r: 0.4 + rnd() * 1.1, a: 0.25 + rnd() * 0.75 })); })();
  const lines10 = d3.geoGraticule10(), graticule = drawable([lines10, lines10, lines10, lines10]);
  const SPHERE = { type: "Sphere" }, edge = drawable([SPHERE, SPHERE, SPHERE, SPHERE]);

  // ---------- the view ----------

  let W = 0, H = 0, dpr = 1;
  let inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const geom = { cx: 0, cy: 0, R: 100, S: 100 }, goal = { cx: 0, cy: 0, R: 100, S: 100 }; // centre, globe radius, flat scale
  const view = { lng: 12, lat: 22, k: 1 };  // the globe: what it is centred on, and how far in
  const flat = { x: 0, y: 0, k: 1 };        // the flat map: its centre (in map units) and how far in
  let mode = "globe", morph = 0;            // morph runs from 0 (globe) to 1 (flat)
  let morphT = 0;

  const pGlobe = d3.geoOrthographic().clipAngle(90);
  const pFlat = d3.geoNaturalEarth1();
  const flatUnit = d3.geoNaturalEarth1().scale(1).translate([0, 0]);
  const pMorph = d3.geoProjection((l, p) => { const a = oRaw(l, p), b = nRaw(l, p); return [lerp(a[0], b[0], morphT), lerp(a[1], b[1], morphT)]; });
  let proj = pGlobe, viewVec = [1, 0, 0], capCos = 0, capSin = 1, capAngle = HALF, scalePx = 100;
  // The globe's own drawing (trace, below) needs which way is right and which is up on screen, as
  // directions on the globe, and the flat map's needs where its middle falls on the canvas
  let east = [0, 1, 0], north = [0, 0, 1], flatX = 0, flatY = 0;

  const kMaxFlat = () => K_MAX * geom.R / geom.S;

  function project() {
    if (morph <= 0) {
      scalePx = geom.R * view.k;
      proj = pGlobe.scale(scalePx).translate([geom.cx, geom.cy]).rotate([-view.lng, -view.lat]);
      viewVec = vec(view.lng, view.lat);
      const l = view.lng * RAD, p = view.lat * RAD;
      east = [-Math.sin(l), Math.cos(l), 0]; north = [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)];
      // Only the cap of the globe that can be on screen is worth drawing
      const reach = Math.max(Math.hypot(geom.cx, geom.cy), Math.hypot(W - geom.cx, geom.cy), Math.hypot(geom.cx, H - geom.cy), Math.hypot(W - geom.cx, H - geom.cy));
      capAngle = Math.asin(Math.min(1, reach / scalePx)); capCos = Math.cos(capAngle); capSin = Math.sin(capAngle);
    } else if (morph >= 1) {
      scalePx = geom.S * flat.k;
      flatX = geom.cx - flat.x * scalePx; flatY = geom.cy - flat.y * scalePx;
      proj = pFlat.scale(scalePx).translate([flatX, flatY]);
      capCos = -2;
    } else {
      const e = d3.easeCubicInOut(morph);
      morphT = e;
      scalePx = lerp(geom.R * view.k, geom.S * flat.k, e);
      proj = pMorph.scale(scalePx).translate([geom.cx - e * flat.x * scalePx, geom.cy - e * flat.y * scalePx])
        .rotate([-view.lng * (1 - e), -view.lat * (1 - e)]).clipAngle(Math.min(90 + 90 * e, 179.9));
      capCos = -2;
    }
    pathB.projection(proj); pathO.projection(proj);
    // While the globe is unrolling nothing is culled and nobody is studying coastlines: draw it coarse
    const density = scalePx * RAD;
    level = morph > 0 && morph < 1 ? (density >= LOD_PPD[2] ? 2 : UNROLLING) : density >= LOD_PPD[0] ? 0 : density >= LOD_PPD[1] ? 1 : density >= LOD_PPD[2] ? 2 : COARSEST;
  }

  // ---------- putting shapes on the canvas ----------

  // Adds a shape's outline to the path being built on canvas `c`. d3 can do this for any shape and any
  // view, but it works every point out afresh with a good deal of trigonometry, and with the whole world
  // to redraw on every frame of a spin that came to three frames' worth of time on a laptop and far more
  // on a phone. So the two still views have their own drawing: the globe keeps each shape as points on a
  // sphere, which a turn of the globe moves with a few multiplications each; the flat map keeps each
  // shape already laid out flat, which panning and zooming only slide and scale. d3 is left with the
  // second it takes the globe to unroll, at the coarsest level.
  function trace(c, s) {
    if (morph > 0 && morph < 1) return void (c === B ? pathB : pathO)(s.lod[level] || s.lod[COARSEST]);
    if (morph >= 1) {
      for (const line of s.sheet[level] || (s.sheet[level] = onSheet(s.lod[level], level))) {
        const p = line.pts;
        c.moveTo(flatX + p[0] * scalePx, flatY + p[1] * scalePx);
        for (let i = 2; i < p.length; i += 2) c.lineTo(flatX + p[i] * scalePx, flatY + p[i + 1] * scalePx);
        if (line.closed) c.closePath();
      }
      return;
    }
    if (s.lod[level] === SPHERE) return void c.arc(geom.cx, geom.cy, scalePx, 0, 2 * Math.PI);
    const lines = s.ball[level] || (s.ball[level] = onSphere(s.lod[level].geometry || s.lod[level], LOD_STEP[level]));
    const near = s.front != null && dot(s.v, viewVec) > s.front;
    for (const line of lines) {
      if (near) onBallNear(c, line.pts);
      else if (line.closed) onBallRing(c, line.pts);
      else onBallLine(c, line.pts);
    }
  }

  // A shape laid out on the flat map, in the map's own units. d3 does this once for each shape and level:
  // it cuts shapes at the map's left and right edges and curves the long straight stretches.
  const tape = {
    lines: [], pts: null,
    moveTo(x, y) { this.pts = [x, y]; this.lines.push({ pts: this.pts, closed: false }); },
    lineTo(x, y) { this.pts.push(x, y); },
    closePath() { this.lines[this.lines.length - 1].closed = true; },
  };
  const recorders = LOD_SCALE.map((scale) => d3.geoPath(d3.geoNaturalEarth1().scale(scale).translate([0, 0]).precision(0.4), tape));
  function onSheet(shape, lvl) {
    tape.lines = [];
    recorders[lvl](shape);
    return tape.lines.map((line) => ({ pts: Float32Array.from(line.pts, (n) => n / LOD_SCALE[lvl]), closed: line.closed }));
  }

  // A ring that is wholly on the near side of the globe: every point goes straight to the canvas
  function onBallNear(c, p) {
    const cx = geom.cx, cy = geom.cy, e0 = east[0] * scalePx, e1 = east[1] * scalePx, n0 = north[0] * scalePx, n1 = north[1] * scalePx, n2 = north[2] * scalePx;
    c.moveTo(cx + p[0] * e0 + p[1] * e1, cy - p[0] * n0 - p[1] * n1 - p[2] * n2);
    for (let i = 3; i < p.length; i += 3) c.lineTo(cx + p[i] * e0 + p[i + 1] * e1, cy - p[i] * n0 - p[i + 1] * n1 - p[i + 2] * n2);
    c.closePath();
  }

  // Every point of a line as it falls on the canvas, with how far it is towards the viewer (below zero
  // is round the back). Returns where the first point on the near side is in `spots`, or -1.
  let spots = new Float32Array(3 * 4096);
  function place(p) {
    if (spots.length < p.length) spots = new Float32Array(p.length * 2);
    const cx = geom.cx, cy = geom.cy, e0 = east[0] * scalePx, e1 = east[1] * scalePx, n0 = north[0] * scalePx, n1 = north[1] * scalePx, n2 = north[2] * scalePx;
    const v0 = viewVec[0], v1 = viewVec[1], v2 = viewVec[2];
    let first = -1;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2], depth = x * v0 + y * v1 + z * v2;
      spots[i] = cx + x * e0 + y * e1; spots[i + 1] = cy - x * n0 - y * n1 - z * n2; spots[i + 2] = depth;
      if (first < 0 && depth >= 0) first = i;
    }
    return first;
  }

  // A ring that may run round the back of the globe. The part on the near side is drawn point by point.
  // Where the ring goes over the edge, the path follows the edge of the globe round to where the ring
  // comes back, turning as far and the same way as the hidden part of the ring does.
  function onBallRing(c, p) {
    const first = place(p), n = p.length, cx = geom.cx, cy = geom.cy;
    if (first < 0) return;
    let px = spots[first], py = spots[first + 1], pz = spots[first + 2], from = 0, was = 0, turned = 0;
    c.moveTo(px, py);
    for (let k = 3; k <= n; k += 3) {
      const i = (first + k) % n, x = spots[i], y = spots[i + 1], z = spots[i + 2];
      if (z >= 0) {
        if (pz < 0) {
          const t = pz / (pz - z), angle = Math.atan2(py + (y - py) * t - cy, px + (x - px) * t - cx);
          turned += turn(angle - was);
          if (Math.abs(turned) > 0.002) c.arc(cx, cy, scalePx, from, from + turned, turned < 0);
          else c.lineTo(cx + scalePx * Math.cos(angle), cy + scalePx * Math.sin(angle));
        }
        if (k < n) c.lineTo(x, y);
      } else {
        if (pz >= 0) {
          const t = pz / (pz - z);
          from = was = Math.atan2(py + (y - py) * t - cy, px + (x - px) * t - cx); turned = 0;
          c.lineTo(cx + scalePx * Math.cos(from), cy + scalePx * Math.sin(from));
        }
        const angle = Math.atan2(y - cy, x - cx);
        turned += turn(angle - was); was = angle;
      }
      px = x; py = y; pz = z;
    }
    c.closePath();
  }
  const turn = (angle) => (angle > Math.PI ? angle - 2 * Math.PI : angle <= -Math.PI ? angle + 2 * Math.PI : angle);

  // A line that is not a ring (the grid): only the parts on the near side, cut off at the globe's edge
  function onBallLine(c, p) {
    place(p);
    const cx = geom.cx, cy = geom.cy;
    const rim = (px, py, pz, x, y, z) => { const t = pz / (pz - z), dx = px + (x - px) * t - cx, dy = py + (y - py) * t - cy, k = scalePx / (Math.hypot(dx, dy) || 1); return [cx + dx * k, cy + dy * k]; };
    let px = 0, py = 0, pz = -1, pen = false;
    for (let i = 0; i < p.length; i += 3) {
      const x = spots[i], y = spots[i + 1], z = spots[i + 2];
      if (z >= 0) {
        if (!pen) { if (i) { const q = rim(px, py, pz, x, y, z); c.moveTo(q[0], q[1]); c.lineTo(x, y); } else c.moveTo(x, y); pen = true; }
        else c.lineTo(x, y);
      } else if (pen) { const q = rim(px, py, pz, x, y, z); c.lineTo(q[0], q[1]); pen = false; }
      px = x; py = y; pz = z;
    }
  }

  // Screen pixels to one degree at the middle of the view: what decides when pins, airports and names appear
  const ppd = () => (morph >= 1 ? geom.S * flat.k * 0.87 : geom.R * view.k) * RAD;

  function resize() {
    const box = wrap.getBoundingClientRect();
    if (!box.width || !box.height) return;
    W = box.width; H = box.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [base, over]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    layout(false);
  }

  function layout(animate) {
    const fw = Math.max(160, W - inset.left - inset.right), fh = Math.max(160, H - inset.top - inset.bottom);
    goal.cx = inset.left + fw / 2; goal.cy = inset.top + fh / 2;
    goal.R = Math.max(70, Math.min(fw, fh) / 2 - 10);
    goal.S = Math.max(40, Math.min(fw / (FLAT_W + 0.2), fh / (FLAT_H + 0.2)));
    if (!animate || reducedMotion) Object.assign(geom, goal);
    invalidate(true);
  }

  // ---------- colours ----------

  let theme = null;
  function readTheme() {
    const css = getComputedStyle(wrap);
    const get = (name) => css.getPropertyValue(name).trim();
    const rgb = (name) => { const c = d3.rgb(get(name)); return [c.r, c.g, c.b]; };
    theme = {
      fills: { none: rgb("--g-land"), land: rgb("--g-land"), guide: rgb("--g-guide"), trip: rgb("--g-trip"), selected: rgb("--g-selected") },
      oceanLit: get("--g-ocean-lit"), oceanDeep: get("--g-ocean-deep"), oceanFlat: get("--g-ocean-flat"),
      line: get("--g-line"), grid: get("--g-grid"), halo: rgb("--g-halo"), haloA: parseFloat(get("--g-halo-a")) || 0,
      shade: parseFloat(get("--g-shade")) || 0, gloss: parseFloat(get("--g-gloss")) || 0, stars: parseFloat(get("--g-stars")) || 0,
      ground: parseFloat(get("--g-ground")) || 0,
      label: get("--g-label"), ink: get("--g-ink"), paper: get("--g-paper"), edge: get("--g-edge"),
      hoverFill: get("--g-hover"), hoverLine: get("--g-hover-line"),
      trip: get("--g-trip"), selected: get("--g-selected"), guide: get("--g-guide"), muted: get("--g-muted"), airport: get("--g-airport"),
    };
    for (const s of feats) { s.to = theme.fills[s.key]; s.col = s.to.slice(); s.from = s.to; }
    tween = null;
    invalidate(true);
  }

  // Says what each thing looks like now: { fill(feature), selected(feature), dot(dot), showPin(pin), activePin(pin) }.
  // Colours change over a third of a second rather than at once.
  let tween = null;
  function paint(state) {
    let changed = false;
    for (const s of feats) {
      const key = state.fill(s.f);
      s.selected = state.selected(s.f);
      if (key === s.key) continue;
      s.key = key; s.to = theme.fills[key]; changed = true;
    }
    for (const d of dots) d.key = state.dot(d);
    const now = performance.now();
    for (const p of pins) {
      const shown = state.showPin(p);
      if (shown && !p.shown) p.born = now + (p.order || 0) * 45;
      p.shown = shown; p.active = state.activePin(p);
    }
    // Anything part-way through a change carries on from the colour it has reached
    if (changed) { for (const s of feats) if (s.from !== s.to) s.from = s.col.slice(); tween = { t0: now }; }
    invalidate(true);
  }

  // ---------- moving ----------

  let anim = null, inertia = null, zoomGoal = null, morphAnim = null, spinning = false, last = 0;

  function stopMotion() {
    if (anim) { const done = anim.resolve; anim = null; done(false); }
    inertia = null; zoomGoal = null;
  }

  // Slides the picture by this many pixels
  function panBy(dx, dy) {
    if (morph >= 1) {
      flat.x = clamp(flat.x - dx / (geom.S * flat.k), -FLAT_W / 2, FLAT_W / 2);
      flat.y = clamp(flat.y - dy / (geom.S * flat.k), -FLAT_H / 2, FLAT_H / 2);
    } else {
      const per = DEG / (geom.R * view.k);
      // Near the poles a degree of longitude is a short distance, so the globe turns further for the same drag
      view.lng = wrap180(view.lng - dx * per / Math.max(0.3, Math.cos(view.lat * RAD)));
      view.lat = clamp(view.lat + dy * per, -85, 85);
    }
    invalidate(true);
  }

  // Zooms by a factor, keeping whatever is under (x, y) where it is
  function zoomAt(factor, x, y) {
    project();
    const g = x == null ? null : proj.invert([x, y]);
    const held = g && isFinite(g[0]) && isFinite(g[1]) && (morph >= 1 || Math.hypot(x - geom.cx, y - geom.cy) < scalePx * 0.98) ? g : null;
    if (morph >= 1) flat.k = clamp(flat.k * factor, 1, kMaxFlat()); else view.k = clamp(view.k * factor, 1, K_MAX);
    if (held) for (let i = 0; i < 2; i++) { project(); const p = proj(held); if (p) panBy(x - p[0], y - p[1]); }
    invalidate(true);
  }

  function kFor(dest) {
    if (dest.k) return dest.k;
    if (morph >= 1 || mode === "flat") {
      if (dest.ppd) return clamp(dest.ppd / (geom.S * 0.87 * RAD), 1, kMaxFlat());
      if (dest.r) return clamp(0.56 * goal.R / (geom.S * dest.r), 1, kMaxFlat());
      return flat.k;
    }
    if (dest.ppd) return clamp(dest.ppd / (geom.R * RAD), 1, K_MAX);
    if (dest.r) return clamp(0.62 / Math.sin(clamp(dest.r, 0.001, HALF)), 1, K_MAX);
    return view.k;
  }

  // Flies to a place: { lng, lat } and one of k, r (the angle across what should fit, in radians) or ppd
  // (pixels to a degree). `spins` adds whole turns of the globe on the way. Resolves when it gets there.
  function flyTo(dest, opts = {}) {
    stopMotion();
    spinning = false;
    return new Promise((resolve) => {
      const k1 = kFor(dest);
      let at, dur;
      if (mode === "flat") {
        const p = nRaw(dest.lng * RAD, dest.lat * RAD);
        const span = (k) => Math.max(W, H) / (geom.S * k);
        const zi = d3.interpolateZoom([flat.x, flat.y, span(flat.k)], [p[0], -p[1], span(k1)]);
        dur = clamp(zi.duration * 0.9, 450, 1600);
        at = (e) => { const [x, y, w] = zi(e); flat.x = x; flat.y = y; flat.k = clamp(Math.max(W, H) / (geom.S * w), 0.9, kMaxFlat()); };
      } else if (opts.spins) {
        const from = { ...view }, turn = wrap180(dest.lng - view.lng) + 360 * opts.spins;
        dur = 2600;
        at = (e) => {
          view.lng = wrap180(from.lng + turn * e); view.lat = lerp(from.lat, dest.lat, e);
          // Pulls back to the whole globe for the spin, then moves in over the last third
          const out = clamp(e / 0.25, 0, 1), into = d3.easeCubicInOut(clamp((e - 0.55) / 0.45, 0, 1));
          view.k = Math.exp(lerp(lerp(Math.log(from.k), 0, d3.easeCubicOut(out)), Math.log(k1), into));
        };
        opts = { ...opts, ease: d3.easeQuartOut };
      } else {
        const a = [view.lng, view.lat], b = [dest.lng, dest.lat], dist = d3.geoDistance(a, b), along = d3.geoInterpolate(a, b);
        // The smooth zoom-and-pan of a flat map, run along the great circle between the two places. On a
        // long hop it pulls back first, to a little further out than the whole globe at most.
        const span = (k) => 2.2 / k, floor = Math.min(0.84, view.k);
        const zi = d3.interpolateZoom([0, 0, span(view.k)], [dist, 0, span(k1)]);
        dur = clamp(zi.duration * 0.9, 450, 2000);
        at = (e) => {
          const [s, , w] = zi(e), c = dist > 1e-6 ? along(clamp(s / dist, 0, 1)) : b;
          view.lng = c[0]; view.lat = clamp(c[1], -85, 85); view.k = clamp(2.2 / w, floor, K_MAX);
        };
      }
      if (opts.duration) dur = opts.duration;
      if (reducedMotion || opts.instant) { at(1); invalidate(true); return resolve(true); }
      anim = { t0: performance.now(), dur, at, ease: opts.ease || d3.easeCubicInOut, resolve };
      invalidate(true);
    });
  }

  // Frames a set of points, such as the stops of a trip
  function fit(points, opts) {
    if (!points.length) return Promise.resolve(false);
    const sum = points.reduce((s, p) => { const v = vec(p.lng, p.lat); return [s[0] + v[0], s[1] + v[1], s[2] + v[2]]; }, [0, 0, 0]);
    const n = Math.hypot(...sum) || 1, c = [Math.atan2(sum[1], sum[0]) * DEG, Math.asin(clamp(sum[2] / n, -1, 1)) * DEG];
    const r = Math.max(...points.map((p) => d3.geoDistance(c, [p.lng, p.lat])));
    return flyTo({ lng: c[0], lat: c[1], r: Math.max(r * 1.35, 0.03) }, opts);
  }

  function setMode(next) {
    if (next === mode || morphAnim) return;
    stopMotion(); spinning = false; setHover(null);
    if (!feats[0].lod[UNROLLING]) { const loose = shapes.thin(LOD_TOL[UNROLLING] * RAD); feats.forEach((s, i) => { s.lod[UNROLLING] = loose[i]; }); }
    if (next === "flat") {
      if (view.k > 1.4) { const p = nRaw(view.lng * RAD, view.lat * RAD); flat.x = p[0]; flat.y = -p[1]; flat.k = clamp(geom.R * view.k / geom.S, 1, kMaxFlat()); }
      else { flat.x = flat.y = 0; flat.k = 1; }
    } else if (flat.k > 1.4) {
      const g = flatUnit.invert([flat.x, flat.y]);
      if (g && isFinite(g[0]) && isFinite(g[1])) { view.lng = clamp(g[0], -180, 180); view.lat = clamp(g[1], -85, 85); }
      view.k = clamp(geom.S * flat.k / geom.R, 1, K_MAX);
    } else view.k = 1;
    mode = next;
    if (reducedMotion) { morph = next === "flat" ? 1 : 0; invalidate(true); }
    else morphAnim = { t0: performance.now(), dur: 1100, from: morph, to: next === "flat" ? 1 : 0 };
    invalidate(true);
    if (on.view) on.view(snapshot());
  }

  const snapshot = () => ({ mode, ppd: ppd(), k: mode === "flat" ? flat.k : view.k });

  // ---------- the frame ----------

  let raf = 0, dirtyBase = true, dirtyOver = true, overMoving = false, lastAirports = null;
  function invalidate(baseToo) {
    if (baseToo) dirtyBase = true;
    dirtyOver = true;
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = 0;
    const dt = clamp(now - last, 1, 64); last = now;
    let busy = false;

    for (const key of ["cx", "cy", "R", "S"]) {
      if (Math.abs(goal[key] - geom[key]) < 0.3) { if (geom[key] !== goal[key]) { geom[key] = goal[key]; dirtyBase = true; } continue; }
      geom[key] += (goal[key] - geom[key]) * (1 - Math.exp(-dt / 110)); dirtyBase = busy = true;
    }
    if (morphAnim) {
      const t = clamp((now - morphAnim.t0) / morphAnim.dur, 0, 1);
      morph = lerp(morphAnim.from, morphAnim.to, t);
      if (t >= 1) { morph = morphAnim.to; morphAnim = null; }
      dirtyBase = busy = true;
    }
    if (anim) {
      const t = clamp((now - anim.t0) / anim.dur, 0, 1);
      anim.at(anim.ease(t));
      if (t >= 1) { const done = anim.resolve; anim = null; done(true); }
      dirtyBase = busy = true;
    }
    if (zoomGoal) {
      const cur = morph >= 1 ? flat.k : view.k, step = Math.pow(zoomGoal.k / cur, 1 - Math.exp(-dt / 70));
      zoomAt(step, zoomGoal.x, zoomGoal.y);
      if (Math.abs(Math.log(zoomGoal.k / (morph >= 1 ? flat.k : view.k))) < 0.004) zoomGoal = null;
      dirtyBase = busy = true;
    }
    if (inertia) {
      panBy(inertia.vx * dt, inertia.vy * dt);
      const fade = Math.exp(-dt / 320); inertia.vx *= fade; inertia.vy *= fade;
      if (Math.hypot(inertia.vx, inertia.vy) < 0.012) inertia = null;
      dirtyBase = busy = true;
    }
    if (spinning && !anim && !pointers.size && morph === 0) {
      view.lng = wrap180(view.lng + dt * 0.0028); dirtyBase = busy = true;
    }
    if (tween) {
      const t = clamp((now - tween.t0) / 340, 0, 1), e = d3.easeCubicOut(t);
      for (const s of feats) if (s.from !== s.to) s.col = [lerp(s.from[0], s.to[0], e), lerp(s.from[1], s.to[1], e), lerp(s.from[2], s.to[2], e)];
      if (t >= 1) { for (const s of feats) { s.col = s.to.slice(); s.from = s.to; } tween = null; }
      dirtyBase = busy = true;
    }

    if (dirtyBase) { drawBase(); dirtyBase = false; dirtyOver = true; }
    if (dirtyOver || overMoving) { drawOver(now); dirtyOver = false; }
    // Only if nothing above has asked for the next frame already (panBy and zoomAt do). Asking twice
    // draws twice next time, each of those asks twice again, and within a second of a flick or a zoom
    // the map is being drawn hundreds of times a frame.
    if ((busy || overMoving) && !raf) raf = requestAnimationFrame(frame);
  }

  function visible(s) {
    if (morph <= 0) return capAngle + s.r >= Math.PI || dot(s.v, viewVec) > capCos * s.cosR - capSin * s.sinR;
    if (morph < 1) return true;
    const x0 = flat.x - geom.cx / scalePx, x1 = flat.x + (W - geom.cx) / scalePx, y0 = flat.y - geom.cy / scalePx, y1 = flat.y + (H - geom.cy) / scalePx;
    return s.flat[1][0] > x0 && s.flat[0][0] < x1 && s.flat[1][1] > y0 && s.flat[0][1] < y1;
  }

  function drawBase() {
    project();
    const c = B, round = 1 - morph, R = geom.R * view.k, { cx, cy } = geom;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    if (theme.stars) {
      const drift = view.lng / 360 * 0.2;
      c.fillStyle = "#fff";
      for (const s of stars) {
        c.globalAlpha = s.a * theme.stars;
        c.beginPath(); c.arc((((s.x + drift) % 1) + 1) % 1 * W, s.y * H, s.r, 0, 7); c.fill();
      }
      c.globalAlpha = 1;
    }
    if (round > 0 && R < Math.max(W, H) * 3) {
      // The shadow the globe stands on, and the glow of its atmosphere
      if (theme.ground) {
        c.save(); c.translate(cx, cy + R * 1.06); c.scale(1, 0.09);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.95);
        g.addColorStop(0, `rgba(11,11,11,${theme.ground * round})`); g.addColorStop(1, "rgba(11,11,11,0)");
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * 0.95, 0, 7); c.fill(); c.restore();
      }
      const [r, g2, b] = theme.halo, halo = c.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.2);
      halo.addColorStop(0, `rgba(${r},${g2},${b},${theme.haloA * round})`); halo.addColorStop(1, `rgba(${r},${g2},${b},0)`);
      c.fillStyle = halo; c.beginPath(); c.arc(cx, cy, R * 1.2, 0, 7); c.fill();
    }

    c.beginPath(); trace(c, edge); c.fillStyle = theme.oceanFlat; c.fill();
    if (round > 0) {
      const sea = c.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R * 1.05);
      sea.addColorStop(0, theme.oceanLit); sea.addColorStop(1, theme.oceanDeep);
      c.globalAlpha = round; c.fillStyle = sea; c.fill(); c.globalAlpha = 1;
    }
    c.beginPath(); trace(c, graticule); c.strokeStyle = theme.grid; c.lineWidth = 0.6; c.stroke();

    c.lineJoin = "round"; c.strokeStyle = theme.line; c.lineWidth = 0.7;
    for (const s of feats) {
      if (!visible(s)) continue;
      c.beginPath(); trace(c, s);
      c.fillStyle = `rgb(${s.col[0] | 0},${s.col[1] | 0},${s.col[2] | 0})`;
      c.fill(); c.stroke();
    }

    if (round > 0 && R < Math.max(W, H) * 3) {
      // Darker towards the edge and a little light top left: what makes a flat disc read as a ball
      c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.clip(); c.globalAlpha = round;
      const shade = c.createRadialGradient(cx, cy, R * 0.62, cx, cy, R);
      shade.addColorStop(0, "rgba(4,10,20,0)"); shade.addColorStop(1, `rgba(4,10,20,${theme.shade})`);
      c.fillStyle = shade; c.fillRect(cx - R, cy - R, R * 2, R * 2);
      const gloss = c.createRadialGradient(cx - R * 0.42, cy - R * 0.48, 0, cx - R * 0.42, cy - R * 0.48, R * 0.95);
      gloss.addColorStop(0, `rgba(255,255,255,${theme.gloss})`); gloss.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = gloss; c.fillRect(cx - R, cy - R, R * 2, R * 2);
      c.restore();
    }
    drawNames();

    const airportsOn = ppd() >= AIRPORT_PPD.large;
    if (airportsOn !== lastAirports && on.view) { lastAirports = airportsOn; on.view(snapshot()); }
  }

  // Country names, where the country is big enough on screen to hold its name
  let measured = false;
  function drawNames() {
    if (morph > 0 && morph < 1) return;
    const c = B;
    c.font = `600 10px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle";
    if ("letterSpacing" in c) c.letterSpacing = "0.9px";
    if (!measured) { for (const l of labels) l.w = c.measureText(l.text).width; measured = true; }
    const fits = (l) => 2 * l.r * scalePx > l.w * 1.55 + 18;
    const placed = [];
    c.fillStyle = theme.label;
    for (const l of labels) {
      l.on = false;
      if (!fits(l)) continue;
      if (!l.v) { if (l.at) { const p = l.at(); l.lng = p.lng; l.lat = p.lat; } l.v = vec(l.lng, l.lat); }
      if (l.kids && l.kids.filter(fits).length * 2 >= l.kids.length) continue; // its states are named instead
      if (l.parent && l.parent.on) continue;
      let alpha = 1;
      if (morph <= 0) { const d = dot(l.v, viewVec); if (d < 0.36) continue; alpha = clamp((d - 0.36) / 0.25, 0, 1); }
      const p = proj([l.lng, l.lat]);
      if (!p || p[0] < -40 || p[0] > W + 40 || p[1] < -10 || p[1] > H + 10) continue;
      const box = [p[0] - l.w / 2 - 4, p[1] - 8, p[0] + l.w / 2 + 4, p[1] + 8];
      if (placed.some((o) => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) continue;
      placed.push(box); l.on = true;
      c.globalAlpha = alpha; c.fillText(l.text, p[0], p[1]);
    }
    c.globalAlpha = 1;
    if ("letterSpacing" in c) c.letterSpacing = "0px";
  }

  // ---------- the layer above: route, markers, whatever is lit up ----------

  const AIRPORT_PPD = { large: 20, medium: 48, small: 90 };
  const PIN_PPD = 16, PIN_NAME_PPD = 60;
  let hits = [], hover = null, lit = null, route = [], preview = null, routeLen = [];

  // Where a point is on screen, or null if it is round the back of the globe or off the canvas
  function spot(p, margin = 24) {
    if (morph <= 0 && dot(p.v, viewVec) < Math.max(capCos, 0.04)) return null;
    const q = proj([p.lng, p.lat]);
    return !q || q[0] < -margin || q[0] > W + margin || q[1] < -margin || q[1] > H + margin ? null : q;
  }

  const sameCountry = (s, id) => Boolean(s.f.country) && (s.f.country.id === id || s.f.country.within === id);

  function drawOver(now) {
    const c = O;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    hits = []; overMoving = false;
    if (morph > 0 && morph < 1) return;
    const density = ppd(), moving = !reducedMotion;
    c.lineJoin = c.lineCap = "round";

    // The selected country's outline, with a glow
    const chosen = feats.filter((s) => s.selected && visible(s));
    if (chosen.length) {
      c.beginPath(); for (const s of chosen) trace(c, s);
      c.save(); c.shadowColor = theme.selected; c.shadowBlur = 16; c.strokeStyle = theme.edge; c.lineWidth = 1.6; c.stroke(); c.restore();
    }
    // What the pointer is over on the map, and what it is over in the list
    if (hover && hover.type === "country") {
      c.beginPath(); for (const s of feats) if (s.f.country === hover.country && visible(s)) trace(c, s);
      c.fillStyle = theme.hoverFill; c.fill(); c.strokeStyle = theme.hoverLine; c.lineWidth = 1.4; c.stroke();
    }
    if (lit && lit.type === "country") {
      const beat = moving ? 0.5 + 0.5 * Math.sin(now / 260) : 1;
      const mine = feats.filter((s) => sameCountry(s, lit.id));
      c.beginPath(); for (const s of mine) if (visible(s)) trace(c, s);
      c.fillStyle = theme.hoverFill; c.fill();
      c.save(); c.shadowColor = theme.edge; c.shadowBlur = 6 + beat * 10; c.strokeStyle = theme.hoverLine; c.lineWidth = 1.6; c.stroke(); c.restore();
      // A country too small to see at this zoom gets a ring round it instead
      if (lit.lng != null && !mine.some((s) => s.r * scalePx > 9)) {
        const q = spot({ lng: lit.lng, lat: lit.lat, v: vec(lit.lng, lit.lat) });
        if (q) { c.beginPath(); c.arc(q[0], q[1], 9 + beat * 4, 0, 7); c.strokeStyle = theme.hoverLine; c.lineWidth = 2; c.stroke(); }
      }
      overMoving = moving;
    }

    // The trip's route, and a ready-made itinerary being looked at
    if (preview && preview.length > 1) {
      c.beginPath(); pathO({ type: "LineString", coordinates: preview.map((p) => [p.lng, p.lat]) });
      c.setLineDash([2, 6]); c.strokeStyle = theme.ink; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
      for (const p of preview) { const q = spot(p); if (!q) continue; c.beginPath(); c.arc(q[0], q[1], 4.5, 0, 7); c.fillStyle = theme.paper; c.fill(); c.strokeStyle = theme.ink; c.lineWidth = 1.5; c.stroke(); }
    }
    if (route.length > 1) {
      const line = { type: "LineString", coordinates: route.map((p) => [p.lng, p.lat]) };
      c.beginPath(); pathO(line);
      c.strokeStyle = theme.trip; c.globalAlpha = 0.22; c.lineWidth = 7; c.stroke(); c.globalAlpha = 1;
      c.setLineDash([7, 6]); c.lineDashOffset = moving ? -(now / 45) % 13 : 0; c.lineWidth = 2.2; c.stroke(); c.setLineDash([]); c.lineDashOffset = 0;
      if (moving) {
        // A dot travelling the route, a couple of seconds to each leg
        const total = routeLen[routeLen.length - 1];
        if (total > 0) {
          const at = (now / (2200 * (route.length - 1)) % 1) * total;
          let i = 1; while (i < routeLen.length - 1 && routeLen[i] < at) i++;
          const legLen = routeLen[i] - routeLen[i - 1], g = legLen > 0 ? d3.geoInterpolate([route[i - 1].lng, route[i - 1].lat], [route[i].lng, route[i].lat])((at - routeLen[i - 1]) / legLen) : [route[i].lng, route[i].lat];
          const q = spot({ lng: g[0], lat: g[1], v: vec(g[0], g[1]) });
          if (q) { c.beginPath(); c.arc(q[0], q[1], 4, 0, 7); c.fillStyle = theme.paper; c.fill(); c.strokeStyle = theme.trip; c.lineWidth = 2; c.stroke(); }
        }
        overMoving = true;
      }
    }

    // Countries too small to click: specks from far out, proper dots once there is room around them
    const close = density >= PIN_PPD;
    for (const d of dots) {
      const q = spot(d); if (!q) continue;
      const plain = d.key === "land" || d.key === "none";
      c.beginPath(); c.arc(q[0], q[1], close ? 2.8 : plain ? 1.5 : 2, 0, 7);
      c.globalAlpha = close ? 1 : plain ? 0.55 : 0.9;
      c.fillStyle = plain ? theme.muted : theme[d.key] || theme.muted; c.fill();
      if (close) { c.strokeStyle = theme.line; c.lineWidth = 1; c.stroke(); }
      c.globalAlpha = 1;
      hits.push({ x: q[0], y: q[1], r: close ? 9 : 4.5, target: { type: "country", country: d.country } });
    }

    // Airports: large ones first as the map is zoomed in, then medium, then airstrips
    if (density >= AIRPORT_PPD.large) {
      for (const size of ["small", "medium", "large"]) {
        if (density < AIRPORT_PPD[size]) continue;
        const d = size === "large" ? 3.6 : 2.8;
        c.beginPath();
        for (const a of airports) {
          if (a.size !== size) continue;
          const q = spot(a, 8); if (!q) continue;
          c.moveTo(q[0], q[1] - d); c.lineTo(q[0] + d, q[1]); c.lineTo(q[0], q[1] + d); c.lineTo(q[0] - d, q[1]); c.closePath();
          hits.push({ x: q[0], y: q[1], r: 8, target: { type: "airport", airport: a } });
        }
        c.globalAlpha = size === "large" ? 0.9 : 0.7;
        c.fillStyle = theme.airport; c.fill(); c.strokeStyle = theme.paper; c.lineWidth = 1; c.stroke();
        c.globalAlpha = 1;
      }
    }

    // Places: all of them once zoomed in, and the selected country's at any zoom, with their names
    c.font = `600 12px ${FONT}`; c.textAlign = "left"; c.textBaseline = "middle";
    const named = [];
    const drawPin = (p, front) => {
      const q = spot(p); if (!q) return;
      const hot = p.active || (lit && lit.type === "place" && lit.pin === p) || (hover && hover.type === "place" && hover.pin === p);
      let size = p.shown ? 5 : 3;
      if (p.shown && p.born && moving) {
        const t = (now - p.born) / 380;
        if (t < 1) { size *= t <= 0 ? 0 : d3.easeBackOut(t); overMoving = true; }
      }
      if (hot) size = Math.max(size, 5) + 1.6;
      if (size <= 0) return;
      if (p.active && moving) {
        const u = (now / 1500) % 1;
        c.beginPath(); c.arc(q[0], q[1], size + 2 + u * 14, 0, 7); c.strokeStyle = theme.trip; c.globalAlpha = 1 - u; c.lineWidth = 2; c.stroke(); c.globalAlpha = 1;
        overMoving = true;
      }
      // Another country's places are small and quiet until pointed at; the selected country's stand out
      const quiet = !front && !hot;
      c.beginPath(); c.arc(q[0], q[1], size, 0, 7);
      c.fillStyle = p.active ? theme.trip : theme.paper; c.fill();
      c.globalAlpha = quiet ? 0.6 : 1;
      c.strokeStyle = p.active ? theme.paper : theme.ink; c.lineWidth = quiet ? 1 : 1.6; c.stroke();
      c.globalAlpha = 1;
      hits.push({ x: q[0], y: q[1], r: 11, target: { type: "place", pin: p } });
      if (!front && !hot && density < PIN_NAME_PPD) return;
      const w = c.measureText(p.name).width, box = [q[0] + 8, q[1] - 9, q[0] + 14 + w, q[1] + 9];
      if (!hot && named.some((o) => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) return;
      named.push(box);
      c.strokeStyle = theme.paper; c.lineWidth = 3.5; c.strokeText(p.name, q[0] + 10, q[1] + 0.5);
      c.fillStyle = theme.ink; c.fillText(p.name, q[0] + 10, q[1] + 0.5);
    };
    if (density >= PIN_PPD) for (const p of pins) if (!p.shown) drawPin(p, false);
    for (const p of pins) if (p.shown && !p.active) drawPin(p, true);
    for (const p of pins) if (p.active) drawPin(p, true);

    // The trip's stops, numbered
    const wee = density < 9; // from far out the stops are close together, so they are drawn smaller
    c.font = `700 ${wee ? 9 : 11}px ${FONT}`; c.textAlign = "center";
    route.forEach((p, i) => {
      const q = spot(p); if (!q) return;
      const hot = lit && lit.type === "stop" && lit.index === i;
      const size = hot ? 13 : wee ? 7.5 : 10;
      if (hot) { c.beginPath(); c.arc(q[0], q[1], size + 5, 0, 7); c.fillStyle = theme.trip; c.globalAlpha = 0.28; c.fill(); c.globalAlpha = 1; }
      c.beginPath(); c.arc(q[0], q[1], size, 0, 7); c.fillStyle = theme.trip; c.fill(); c.strokeStyle = "#fff"; c.lineWidth = wee ? 1.5 : 2; c.stroke();
      c.fillStyle = "#fff"; c.fillText(String(i + 1), q[0], q[1] + 0.5);
      hits.push({ x: q[0], y: q[1], r: size + 2, target: { type: "stop", index: i } });
    });
  }

  // ---------- the pointer ----------

  // What is at this point of the canvas: a stop, a place, an airport, or failing those the country
  function pick(x, y) {
    if (morph > 0 && morph < 1) return null;
    for (let i = hits.length - 1; i >= 0; i--) { const hit = hits[i]; if ((hit.x - x) ** 2 + (hit.y - y) ** 2 <= hit.r ** 2) return hit.target; }
    if (morph <= 0 && Math.hypot(x - geom.cx, y - geom.cy) >= scalePx) return null;
    const g = proj.invert([x, y]);
    if (!g || !isFinite(g[0]) || !isFinite(g[1]) || Math.abs(g[0]) > 180 || Math.abs(g[1]) > 90) return null;
    const at = vec(g[0], g[1]);
    for (const s of feats) if (s.f.country && dot(s.v, at) >= Math.cos(s.r) && d3.geoContains(s.lod[level], g)) return { type: "country", country: s.f.country };
    return null;
  }

  const same = (a, b) => a === b || Boolean(a && b && a.type === b.type && a.country === b.country && a.pin === b.pin && a.airport === b.airport && a.index === b.index);
  function setHover(target, x, y) {
    if (!same(target, hover)) { hover = target; invalidate(false); }
    over.classList.toggle("can-click", Boolean(target));
    if (on.hover) on.hover(target, x, y);
  }

  const pointers = new Map();
  let press = null, pinch = null, trail = [];
  const local = (e) => { const box = over.getBoundingClientRect(); return [e.clientX - box.left, e.clientY - box.top]; };

  function touched() { spinning = false; if (on.interact) on.interact(); }

  over.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const [x, y] = local(e);
    // A press whose release never arrived (it can happen when the window loses focus) must not turn the
    // next press into half of a pinch
    if (e.isPrimary) pointers.clear();
    over.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x, y });
    stopMotion(); touched();
    if (pointers.size === 1) { press = { x, y, t: performance.now(), moved: 0 }; trail = [{ x, y, t: press.t }]; over.classList.add("dragging"); }
    else { press = null; pinch = null; }
    setHover(null);
  });

  over.addEventListener("pointermove", (e) => {
    const [x, y] = local(e), p = pointers.get(e.pointerId);
    if (!p) { if (e.pointerType !== "touch" && !anim && !morphAnim) setHover(pick(x, y), x, y); return; }
    const dx = x - p.x, dy = y - p.y;
    p.x = x; p.y = y;
    if (pointers.size === 1 && press) {
      press.moved += Math.hypot(dx, dy);
      if (press.moved > 4) panBy(dx, dy);
      const now = performance.now();
      trail.push({ x, y, t: now });
      while (trail.length > 2 && now - trail[0].t > 90) trail.shift();
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], gap = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (pinch && pinch.gap > 1 && gap > 1) { zoomAt(gap / pinch.gap, mx, my); panBy(mx - pinch.mx, my - pinch.my); }
      pinch = { gap, mx, my };
    }
  });

  function release(e) {
    if (!pointers.has(e.pointerId)) return;
    const [x, y] = local(e);
    pointers.delete(e.pointerId);
    pinch = null;
    if (pointers.size) return;
    over.classList.remove("dragging");
    const now = performance.now();
    if (press && e.type === "pointerup") {
      if (press.moved <= 6 && now - press.t < 700) { const target = pick(x, y); if (on.pick) on.pick(target, x, y); }
      else if (trail.length > 1 && !reducedMotion) {
        const first = trail[0], span = now - first.t;
        if (span > 8 && span < 200) {
          // Thrown, the map carries on, at up to two pixels a millisecond however hard the flick
          let vx = (x - first.x) / span, vy = (y - first.y) / span;
          const speed = Math.hypot(vx, vy);
          if (speed > 2) { vx *= 2 / speed; vy *= 2 / speed; }
          if (speed > 0.08) { inertia = { vx, vy }; invalidate(true); }
        }
      }
    }
    press = null;
  }
  over.addEventListener("pointerup", release);
  over.addEventListener("pointercancel", release);
  over.addEventListener("pointerleave", (e) => { if (!pointers.size && e.pointerType !== "touch") setHover(null); });

  over.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (morphAnim) return;
    if (anim) stopMotion();
    touched();
    const [x, y] = local(e), cur = morph >= 1 ? flat.k : view.k, max = morph >= 1 ? kMaxFlat() : K_MAX;
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1) * (e.ctrlKey ? 0.012 : 0.0022);
    zoomGoal = { k: clamp((zoomGoal ? zoomGoal.k : cur) * Math.exp(-delta), 1, max), x, y };
    inertia = null;
    invalidate(true);
  }, { passive: false });

  wrap.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: [70, 0], ArrowRight: [-70, 0], ArrowUp: [0, 70], ArrowDown: [0, -70] }[e.key];
    if (step) { e.preventDefault(); stopMotion(); touched(); inertia = { vx: step[0] / 110, vy: step[1] / 110 }; invalidate(true); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomBy(1.7); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomBy(1 / 1.7); }
  });

  function zoomBy(factor) {
    if (morphAnim) return;
    if (anim) stopMotion();
    touched();
    const cur = morph >= 1 ? flat.k : view.k, max = morph >= 1 ? kMaxFlat() : K_MAX;
    zoomGoal = { k: clamp((zoomGoal ? zoomGoal.k : cur) * factor, 1, max), x: null, y: null };
    if (reducedMotion) { zoomAt(zoomGoal.k / cur); zoomGoal = null; }
    invalidate(true);
  }

  // ---------- start ----------

  new ResizeObserver(resize).observe(wrap);
  readTheme();
  resize();

  return {
    paint, flyTo, fit, zoomBy, setMode, resize,
    get mode() { return mode; },
    get ppd() { return ppd(); },
    theme: readTheme,
    insets(next, animate = true) { inset = { ...inset, ...next }; layout(animate); },
    route(points) {
      route = points.map((p) => ({ ...p, v: vec(p.lng, p.lat) }));
      routeLen = route.reduce((list, p, i) => { list.push(i ? list[i - 1] + d3.geoDistance([route[i - 1].lng, route[i - 1].lat], [p.lng, p.lat]) : 0); return list; }, []);
      invalidate(false);
    },
    preview(points) { preview = points ? points.map((p) => ({ ...p, v: vec(p.lng, p.lat) })) : null; invalidate(false); },
    // Lights something up from outside the map: { type: "country", id }, { type: "place", pin } or { type: "stop", index }
    light(target) {
      if (target === lit || (target && lit && target.type === lit.type && target.id === lit.id && target.pin === lit.pin && target.index === lit.index)) return;
      lit = target; invalidate(false);
    },
    get k() { return mode === "flat" ? flat.k : view.k; },
    pins,
    home() { return mode === "flat" ? flyTo({ lng: 0, lat: 0, k: 1 }) : flyTo({ lng: view.lng, lat: 18, k: 1 }); },
    spin(yes) { spinning = yes && !reducedMotion; if (spinning) invalidate(true); },
    // The opening: the globe arrives from a little way off, turning into place
    arrive(dest) {
      if (reducedMotion) { view.lng = dest.lng; view.lat = dest.lat; view.k = 1; return Promise.resolve(invalidate(true)); }
      view.lng = wrap180(dest.lng - 70); view.lat = dest.lat - 14; view.k = 0.72;
      return flyTo({ lng: dest.lng, lat: dest.lat, k: 1 }, { duration: 1700, ease: d3.easeCubicOut });
    },
  };
};
})();
