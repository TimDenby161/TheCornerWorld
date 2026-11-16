// Tests docs/assets/globe.js without a browser: the page's scripts run here against a stand-in canvas
// that records what is drawn. Run with `npm run check`. Three things are tested:
//   1. A flick, a wheel zoom and an arrow key each redraw the map once per screen refresh, and stop.
//      (It once redrew twice, then four times, then eight: a single flick froze a phone.)
//   2. The globe and the flat map put every country where d3 puts it. globe.js has its own drawing for
//      these two views because d3's is too slow to run on every frame, so d3 is the reference here.
//   3. The globe unrolling into the flat map, and each level of detail, draw without errors.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const docs = new URL("../docs/", import.meta.url);
const read = (name) => readFileSync(new URL(name, docs), "utf8");
const W = 390, H = 844, RAD = Math.PI / 180;
const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };

// A page with a globe on it. `drawn` collects each country filled since the last refresh, as its
// outline in pixels; `refresh()` plays one screen refresh and returns how many times the map was redrawn.
function page(options = {}) {
  const handlers = {}, drawn = [];
  let path = [], redraws = 0, clock = 0, queue = [], timers = [], unsound = 0;
  const context = (isBase) => ({
    fillStyle: "", strokeStyle: "",
    setTransform() {}, save() {}, restore() {}, translate() {}, scale() {}, clip() {}, fillRect() {}, fillText() {}, strokeText() {}, setLineDash() {}, stroke() {}, closePath() {},
    measureText: (text) => ({ width: text.length * 7 }), createRadialGradient: () => ({ addColorStop() {} }),
    clearRect() { if (isBase) redraws++; },
    beginPath() { path = []; },
    moveTo(x, y) { if (!Number.isFinite(x + y)) unsound++; path.push([[x, y]]); },
    lineTo(x, y) { if (!Number.isFinite(x + y)) unsound++; if (!path.length) path.push([]); path[path.length - 1].push([x, y]); },
    arc(cx, cy, r, from, to, anticlockwise) {
      if (!Number.isFinite(cx + cy + r + from + to)) unsound++;
      if (!path.length) path.push([]);
      let sweep = to - from;
      if (Math.abs(sweep) >= 2 * Math.PI) sweep = anticlockwise ? -2 * Math.PI : 2 * Math.PI;
      else if (!anticlockwise && sweep < 0) sweep += 2 * Math.PI;
      else if (anticlockwise && sweep > 0) sweep -= 2 * Math.PI;
      const steps = Math.max(2, Math.ceil(Math.abs(sweep) / 0.01));
      for (let i = 0; i <= steps; i++) { const a = from + sweep * i / steps; path[path.length - 1].push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    },
    // Countries are the only things filled with a colour written as rgb(...)
    fill() { if (isBase && typeof this.fillStyle === "string" && this.fillStyle.startsWith("rgb(")) drawn.push(path); },
  });
  const canvas = (isBase) => {
    const c = context(isBase);
    return { getContext: () => c, width: 0, height: 0, classList: { toggle() {}, add() {}, remove() {} }, addEventListener(type, f) { handlers[type] = f; },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }), setPointerCapture() {} };
  };
  const css = (name) => (/-a$|shade|gloss|stars|ground/.test(name) ? ".3" : "#345678");
  const win = {
    devicePixelRatio: 2, console, Math, performance: { now: () => clock },
    setTimeout: (f) => { timers.push(f); }, requestAnimationFrame: (f) => { queue.push(f); return queue.length; },
    getComputedStyle: () => ({ getPropertyValue: css }), ResizeObserver: class { observe() {} },
  };
  win.window = win; win.self = win; win.globalThis = win;
  vm.createContext(win);
  for (const file of ["assets/lib/d3.min.js", "assets/lib/topojson-client.min.js", "assets/globe.js"]) vm.runInContext(read(file), win, { filename: file });
  win.world = JSON.parse(read("data/world.json"));
  win.wrap = canvas(false); win.base = canvas(true); win.over = canvas(false); win.options = options;
  vm.runInContext(`var features = topojson.feature(world, world.objects.countries).features;
    var globe = createGlobe({ wrap, base, over, topology: world, object: "countries", features, on: {}, ...options });`, win);
  const refresh = () => { clock += 1000 / 60; const now = queue; queue = []; redraws = 0; drawn.length = 0; for (const f of now) f(clock); return redraws; };
  return {
    win, handlers, drawn, refresh,
    settle() { let n = 0; while (queue.length && n++ < 600) refresh(); return n; },
    later() { for (const f of timers.splice(0)) f(); },
    wait(ms) { clock += ms; },
    unsound: () => unsound,
    run: (code) => vm.runInContext(code, win),
  };
}

const area = (outline) => { let a = 0; for (const ring of outline) for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };

// ---------- 1. one redraw per refresh ----------
{
  const p = page();
  p.settle(); p.later(); p.settle();
  const touch = (type, x) => ({ type, pointerType: "touch", isPrimary: true, pointerId: 1, clientX: x, clientY: 200, button: 0 });
  const moves = {
    "a flick": () => { p.handlers.pointerdown(touch("pointerdown", 200)); for (let i = 1; i <= 3; i++) { p.wait(16); p.handlers.pointermove(touch("pointermove", 200 + i * 20)); } p.handlers.pointerup(touch("pointerup", 260)); },
    "a wheel zoom": () => p.handlers.wheel({ preventDefault() {}, clientX: 195, clientY: 200, deltaY: -240, deltaMode: 0, ctrlKey: false }),
    "an arrow key": () => p.handlers.keydown({ key: "ArrowLeft", preventDefault() {} }),
    "the plus key": () => p.handlers.keydown({ key: "+", preventDefault() {} }),
  };
  for (const [name, move] of Object.entries(moves)) {
    move();
    let most = 0, refreshes = 0;
    while (refreshes < 600) { const n = p.refresh(); if (!n) break; most = Math.max(most, n); refreshes++; }
    expect(most === 1, `After ${name} the map was redrawn ${most} times in one screen refresh (it must be once)`);
    expect(refreshes > 3 && refreshes < 600, `After ${name} the map kept moving for ${refreshes} refreshes (it should glide, then stop)`);
  }
}

// ---------- 2. countries land where d3 puts them ----------
{
  // detail [0, 0, 0] draws the full shapes at every zoom, and those are the shapes this test has too
  const p = page({ reducedMotion: true, detail: [0, 0, 0] });
  const { d3 } = p.win, features = p.run("features");
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 10, S = Math.min(W / 5.67, H / 3.04);
  // Every country d3 draws for a view, as areas in square pixels, smallest first
  const reference = (projection) => {
    const out = [];
    let outline = [];
    const pen = { beginPath() {}, moveTo(x, y) { outline.push([[x, y]]); }, lineTo(x, y) { outline[outline.length - 1].push([x, y]); }, closePath() {}, arc() {} };
    const draw = d3.geoPath(projection, pen);
    for (const f of features) { outline = []; draw(f); if (outline.length) out.push(area(outline)); }
    return out.sort((a, b) => a - b);
  };
  // d3 rounds the edge of the globe off with straight pieces, so a sliver of land there can differ by a few pixels
  const near = (a, b) => Math.abs(a - b) <= 4 + 0.02 * b + 2.5 * Math.sqrt(b);
  const views = [
    ["globe", 12, 22, 1], ["globe", -100, 45, 1], ["globe", 179, -40, 1.6], ["globe", 0, -85, 1], ["globe", -60, 85, 2.5], ["globe", 100, 62, 6], ["globe", 140, -25, 20],
    ["flat", 0, 0, 1], ["flat", 170, 60, 3], ["flat", -150, 20, 9], ["flat", 20, 50, 30],
  ];
  let mode = "globe", compared = 0;
  for (const [want, lng, lat, k] of views) {
    if (want !== mode) { p.run(`globe.setMode("${want}")`); mode = want; }
    p.run(`globe.flyTo({ lng: ${lng}, lat: ${lat}, k: ${k} }, { instant: true })`);
    p.settle();
    const at = d3.geoNaturalEarth1Raw(lng * RAD, lat * RAD);
    const ref = reference(want === "globe"
      ? d3.geoOrthographic().clipAngle(90).scale(R * k).translate([cx, cy]).rotate([-lng, -lat])
      : d3.geoNaturalEarth1().scale(S * k).translate([cx - at[0] * S * k, cy + at[1] * S * k]));
    const got = p.drawn.map(area).filter((a) => a > 30);
    // Zoomed out there are dozens of countries in view; zoomed in over Siberia or the Pacific, a handful
    expect(got.length >= (k <= 3 ? 20 : 3), `${want} view at ${lng}, ${lat} zoom ${k}: only ${got.length} countries were drawn`);
    let missing = 0;
    for (const a of got) {
      // the reference country nearest in size
      let lo = 0, hi = ref.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (ref[mid] < a) lo = mid + 1; else hi = mid; }
      if (!(near(a, ref[lo]) || (lo && near(a, ref[lo - 1])))) missing++;
      compared++;
    }
    expect(missing === 0, `${want} view at ${lng}, ${lat} zoom ${k}: ${missing} of ${got.length} countries are not the size d3 draws them`);
  }
  expect(p.unsound() === 0, `${p.unsound()} points were drawn at positions that are not numbers`);
  console.log(`Globe drawing: ${compared} country outlines checked against d3 in ${views.length} views`);
}

// ---------- 3. every level of detail, and the unrolling ----------
{
  const p = page();
  p.settle(); p.later(); p.settle();
  for (const k of [1, 3, 8, 20, 48]) {
    p.run(`globe.flyTo({ lng: 12, lat: 46, k: ${k} }, { instant: true })`);
    p.refresh();
    expect(p.drawn.length > 10, `Globe at zoom ${k}: only ${p.drawn.length} countries were drawn`);
    p.settle();
  }
  p.run(`globe.flyTo({ lng: 12, lat: 22, k: 1 }, { instant: true }); globe.setMode("flat")`);
  let refreshes = 0, most = 0, fewest = Infinity;
  while (refreshes < 600) { const n = p.refresh(); if (!n) break; most = Math.max(most, n); fewest = Math.min(fewest, p.drawn.length); refreshes++; }
  expect(most === 1, `While unrolling, the map was redrawn ${most} times in one screen refresh`);
  expect(refreshes > 30 && refreshes < 200, `Unrolling took ${refreshes} refreshes (about 66 expected)`);
  expect(fewest > 100, `While unrolling, a frame drew only ${fewest} countries`);
  expect(p.run("globe.mode") === "flat", "The map did not end up flat");
  expect(p.unsound() === 0, `${p.unsound()} points were drawn at positions that are not numbers`);
}

if (failures.length) { for (const f of failures) console.error(`FAIL  ${f}`); process.exit(1); }
console.log("Globe tests passed");
