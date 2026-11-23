// Outlines for parts of countries that Natural Earth doesn't draw at the map's level of detail, written to
// scripts/states/ for build-data.mjs in the same form as fetch-states.mjs. Run with `node scripts/fetch-regions.mjs`.
//
// NOR: Norway in six travel regions, made from its counties (Natural Earth's 1:10m states, thinned to the map's
// detail with the borders between them kept shared, so no gaps open up). Lofoten is cut out of Nordland: the
// islands whose middle is in LOFOTEN below.
// MDA: Moldova and Transnistria, from Natural Earth's 1:50m disputed areas, cut out of the map's own Moldova so the
// two fit together exactly.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoArea, geoCentroid } from "d3";
import { feature, merge } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, simplify, quantile } from "topojson-simplify";
import clip from "polygon-clipping";

const require = createRequire(import.meta.url);
const base = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";
const load = (file) => fetch(base + file).then((r) => { if (!r.ok) throw new Error(`Download failed: ${r.status}`); return r.json(); });
const round = (v) => (Array.isArray(v) ? v.map(round) : Math.round(v * 1e4) / 1e4);
// d3 takes a ring's direction to say which side is inside: a piece that comes out as "all the world but this" is turned round
const rewind = (rings) => (geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI ? rings.map((r) => r.slice().reverse()) : rings);
const props = (id, name, geometry, at) => {
  // Pieces under 15 km² go: specks of island, and slivers where two maps' borders don't quite meet
  const pieces = (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates).map(rewind)
    .filter((p) => geoArea({ type: "Polygon", coordinates: p }) * 6371 ** 2 >= 15);
  geometry = pieces.length === 1 ? { type: "Polygon", coordinates: pieces[0] } : { type: "MultiPolygon", coordinates: pieces };
  // Where the name goes: the middle of the largest piece
  const main = pieces.reduce((a, b) => (geoArea({ type: "Polygon", coordinates: b }) > geoArea({ type: "Polygon", coordinates: a }) ? b : a));
  const [lng, lat] = at || geoCentroid({ type: "Polygon", coordinates: main });
  return { type: "Feature", properties: { id, name, lat: round(lat), lng: round(lng) }, geometry: { type: geometry.type, coordinates: round(geometry.coordinates) } };
};
const write = (code, features) => {
  writeFileSync(new URL(`states/${code}.json`, import.meta.url), JSON.stringify({ type: "FeatureCollection", features }));
  console.log(`${code}: ${features.map((f) => `${f.properties.name} (${f.properties.id})`).join(", ")}`);
};

// ---------- Norway ----------
const REGIONS = [
  ["NO-LOF", "Lofoten", [], [13.6, 68.2]],
  ["NO-NN", "Northern Norway", ["NO-18", "NO-19", "NO-20"]],
  ["NO-TRD", "Trøndelag", ["NO-16", "NO-17"]],
  ["NO-FJ", "Fjord Norway", ["NO-11", "NO-12", "NO-14", "NO-15"]],
  ["NO-EN", "Eastern Norway", ["NO-01", "NO-02", "NO-03", "NO-04", "NO-05", "NO-06", "NO-07", "NO-08"]],
  ["NO-SN", "Southern Norway", ["NO-09", "NO-10"]],
];
const LOFOTEN = [11.8, 67.3, 15.4, 68.5]; // west, south, east, north: Røst to Austvågøy
{
  const states = (await load("ne_10m_admin_1_states_provinces.geojson")).features.filter((f) => f.properties.adm0_a3 === "NOR");
  const counties = [];
  for (const f of states) {
    const id = f.properties.iso_3166_2;
    if (!REGIONS.some(([, , of]) => of.includes(id))) continue; // Svalbard and Bouvet Island are listed apart
    const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    const inLofoten = (p) => { const [x, y] = geoCentroid({ type: "Polygon", coordinates: p }); return x >= LOFOTEN[0] && x <= LOFOTEN[2] && y >= LOFOTEN[1] && y <= LOFOTEN[3]; };
    const lofoten = id === "NO-18" ? polygons.filter(inLofoten) : [];
    if (lofoten.length) counties.push({ type: "Feature", properties: { id: "NO-LOF" }, geometry: { type: "MultiPolygon", coordinates: lofoten } });
    counties.push({ type: "Feature", properties: { id }, geometry: { type: "MultiPolygon", coordinates: polygons.filter((p) => !lofoten.includes(p)) } });
  }
  // Thinned as one topology, so neighbouring counties share each border point for point
  let topo = presimplify(topology({ counties: { type: "FeatureCollection", features: counties } }, 1e5));
  topo = simplify(topo, quantile(topo, 0.3)); // keeps about 30% of the points, near the rest of the map's detail
  const all = topo.objects.counties.geometries;
  write("NOR", REGIONS.map(([id, name, of, at]) => {
    const members = all.filter((g) => (id === "NO-LOF" ? g.properties.id === "NO-LOF" : of.includes(g.properties.id)));
    return props(id, name, merge(topo, members), at);
  }));
}

// ---------- Moldova and Transnistria ----------
{
  const world = require("world-atlas/countries-50m.json");
  const moldova = feature(world, world.objects.countries.geometries.find((g) => g.id === "498")).geometry;
  const disputed = (await load("ne_50m_admin_0_breakaway_disputed_areas.geojson")).features.find((f) => f.properties.BRK_A3 === "B36");
  if (!disputed) throw new Error("Transnistria is not in Natural Earth's disputed areas");
  const coords = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
  const shape = (multi) => (multi.length === 1 ? { type: "Polygon", coordinates: multi[0] } : { type: "MultiPolygon", coordinates: multi });
  const rest = clip.difference(coords(moldova), coords(disputed.geometry));
  const trans = clip.intersection(coords(moldova), coords(disputed.geometry));
  write("MDA", [props("MDA", "Moldova", shape(rest)), props("MD-TR", "Transnistria", shape(trans), [29.5, 47.1])]);
}
