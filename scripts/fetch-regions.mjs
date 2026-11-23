// Outlines for countries split into travel regions, written to scripts/states/ for build-data.mjs in the same form
// as fetch-states.mjs. Run with `node scripts/fetch-regions.mjs` (every country below) or `node scripts/fetch-regions.mjs NOR`,
// then list the regions with their main towns under `states` in build-data.mjs.
//
// A country is split when its regions are good to visit at different times of year (Lofoten in summer, Oslo a
// month either side), so that the map and the When filter can judge each on its own weather. One that is the same
// all over stays whole.
//
// Each region is a group of the country's states or provinces from Natural Earth's 1:10m map, thinned to the map's
// detail as one, so the borders between regions stay shared point for point and no gaps open up. `carve` cuts
// islands out of a state: those whose middle is in the box (west, south, east, north). Which countries are split was
// settled on 23 November 2026 by rating every month at 2 to 9 places in each of 45 countries with build-weather.mjs's
// rule: those whose places peak in different months are here.
// MDA: Moldova and Transnistria, from Natural Earth's 1:50m disputed areas, cut out of the map's own Moldova so the
// two fit together exactly.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoArea, geoCentroid } from "d3";
import { feature, merge } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, simplify, quantile } from "topojson-simplify";
import clip from "polygon-clipping";

// Each country: its regions as [id, name, states, where its name goes (optional)]. The states are a list of codes,
// "rest" for every state not named elsewhere, { carve, box } (see above), or a test of a state's { id, lat, lng }.
// A region with the country's own code stays the country's own shape (Moldova, Mexico...): the country's card
// covers that part. Where none has, the country is wholly split (Norway, India...) and its card is an overview.
// `from: "50m"` takes Natural Earth's 1:50m states, which meet the map's own borders exactly (it has them for a few
// big countries only); `skip` leaves out states drawn as places of their own (Svalbard, Sicily, the Canaries...).
const REGIONS = {
  NOR: { skip: ["NO-21", "NO-X01~"], regions: [
    ["NO-LOF", "Lofoten", { carve: "NO-18", box: [11.8, 67.3, 15.4, 68.5] }, [13.6, 68.2]], // Røst to Austvågøy
    ["NO-NN", "Northern Norway", ["NO-18", "NO-19", "NO-20"]],
    ["NO-TRD", "Trøndelag", ["NO-16", "NO-17"]],
    ["NO-FJ", "Fjord Norway", ["NO-11", "NO-12", "NO-14", "NO-15"]],
    ["NO-EN", "Eastern Norway", ["NO-01", "NO-02", "NO-03", "NO-04", "NO-05", "NO-06", "NO-07", "NO-08"]],
    ["NO-SN", "Southern Norway", ["NO-09", "NO-10"]],
  ] },
  BRA: { from: "50m", regions: [
    ["BR-AMZ", "Brazilian Amazon", ["BR-AC", "BR-RO", "BR-RR", "BR-AM", "BR-PA", "BR-AP"]],
    ["BR-NEB", "Northeast Brazil", ["BR-MA", "BR-PI", "BR-CE", "BR-RN", "BR-PB", "BR-PE", "BR-AL", "BR-SE", "BR-BA"]],
    ["BR-PAN", "Pantanal & the Centre-West", ["BR-MT", "BR-MS", "BR-GO", "BR-DF", "BR-TO"]],
    ["BRA", "Brazil", "rest"],
  ] },
  CHN: { from: "50m", regions: [
    ["CN-NEC", "Northeast China", ["CN-HL", "CN-JL", "CN-LN"]],
    ["CN-NTH", "Northern China", ["CN-BJ", "CN-TJ", "CN-HE", "CN-SX", "CN-NM", "CN-SD", "CN-HA", "CN-SN"]],
    ["CN-EST", "Eastern China", ["CN-SH", "CN-JS", "CN-ZJ", "CN-AH", "CN-JX", "CN-HB", "CN-HN"]],
    ["CN-STH", "Southern China", ["CN-GD", "CN-GX", "CN-FJ"]],
    ["CN-SWC", "Southwest China", ["CN-YN", "CN-GZ", "CN-SC", "CN-CQ"]],
    ["CN-HAI", "Hainan", ["CN-HI"]],
    ["CN-TIB", "Tibet & Qinghai", ["CN-XZ", "CN-QH"]],
    ["CN-SLK", "Xinjiang & the Silk Road", ["CN-XJ", "CN-GS", "CN-NX"]],
  ] },
  IND: { from: "50m", regions: [
    ["IN-HIM", "Indian Himalaya", ["IN-LA", "IN-JK", "IN-HP", "IN-UT"]],
    ["IN-NEI", "Northeast India", ["IN-SK", "IN-AS", "IN-MN", "IN-NL", "IN-ML", "IN-AR", "IN-MZ", "IN-TR"]],
    ["IN-WCO", "Goa & the West Coast", ["IN-MH", "IN-GA", "IN-KA", "IN-KL", "IN-LD"]],
    ["IN-SEI", "Tamil Nadu & the Southeast", ["IN-TN", "IN-AP", "IN-TG", "IN-PY"]],
    ["IN-ANI", "Andaman Islands", ["IN-AN"]],
    ["IN-NTH", "North India", "rest"],
  ] },
  RUS: { from: "50m", skip: ["UA-43", "UA-40"], regions: [ // Crimea and Sevastopol are Ukraine's on the map
    ["RU-SOU", "Black Sea & Caucasus", ["RU-KDA", "RU-AD", "RU-STA", "RU-KC", "RU-KB", "RU-SE", "RU-IN", "RU-CE", "RU-DA"]],
    ["RUS", "Russia", "rest"],
  ] },
  ZAF: { from: "50m", regions: [["ZA-WC", "Western Cape", ["ZA-WC"]], ["ZAF", "South Africa", "rest"]] },
  MEX: { regions: [["MX-PAC", "Mexican Pacific Coast", ["MX-NAY", "MX-JAL", "MX-COL", "MX-MIC", "MX-GRO"]], ["MEX", "Mexico", "rest"]] },
  ARG: { regions: [["AR-PAT", "Argentine Patagonia", ["AR-Q", "AR-R", "AR-U", "AR-Z", "AR-V"]], ["ARG", "Argentina", "rest"]] },
  CHL: { regions: [
    ["CL-LAK", "Chilean Lake District", ["CL-AR", "CL-LR", "CL-LL"]],
    ["CL-PAT", "Chilean Patagonia", ["CL-AI", "CL-MA"]],
    ["CHL", "Chile", "rest"],
  ] },
  PER: { regions: [["PE-AMZ", "Peruvian Amazon", ["PE-LOR", "PE-UCA", "PE-MDD"]], ["PER", "Peru", "rest"]] },
  COL: { regions: [["CO-AMZ", "Colombian Amazon", ["CO-AMA", "CO-PUT", "CO-CAQ", "CO-GUV", "CO-VAU", "CO-GUA"]], ["COL", "Colombia", "rest"]] },
  ECU: { regions: [
    ["EC-GAL", "Galápagos Islands", ["EC-W"]],
    ["EC-AMZ", "Ecuadorian Amazon", ["EC-U", "EC-D", "EC-Y", "EC-S", "EC-Z", "EC-N"]],
    ["EC-CST", "Ecuador's Pacific Coast", ["EC-E", "EC-M", "EC-SE", "EC-G", "EC-O", "EC-R", "EC-SD"]],
    ["ECU", "Ecuador", "rest"],
  ] },
  BOL: { regions: [
    ["BO-ALT", "Altiplano & Salt Flats", ["BO-L", "BO-O", "BO-P"]],
    ["BO-LOW", "Bolivian Amazon & Lowlands", ["BO-B", "BO-N", "BO-S"]],
    ["BOL", "Bolivia", "rest"],
  ] },
  VNM: { regions: [ // by where each province's middle is
    ["VN-NTH", "Northern Vietnam", (s) => s.lat >= 19.5],
    // From Thanh Hóa's southern neighbours down to the Central Highlands, but not Bình Phước and Tây Ninh in the south-west
    ["VN-CEN", "Central Vietnam", (s) => s.lat >= 11.4 && (s.lat >= 12.5 || s.lng >= 107.2)],
    ["VN-STH", "Southern Vietnam", "rest"],
  ] },
  THA: { regions: [
    ["TH-NTH", "Northern Thailand", ["TH-50", "TH-57", "TH-58", "TH-51", "TH-52", "TH-54", "TH-55", "TH-56", "TH-53", "TH-63", "TH-64", "TH-65"]],
    ["TH-AND", "Andaman Coast", ["TH-85", "TH-82", "TH-83", "TH-81", "TH-92", "TH-91"]],
    ["TH-GLF", "Gulf Islands & the South", ["TH-86", "TH-84", "TH-80", "TH-93", "TH-90", "TH-94", "TH-95", "TH-96"]],
    ["THA", "Thailand", "rest"],
  ] },
  PHL: { regions: [
    ["PH-PAL", "Palawan", ["PH-PLW"]],
    ["PH-MIN", "Mindanao", ["PH-SLU", "PH-DAV", "PH-ZSI", "PH-SUN", "PH-SUR", "PH-AGN", "PH-MSR", "PH-LAN", "PH-ZAS", "PH-MSC", "PH-ZAN", "PH-LAS", "PH-MAG",
      "PH-NCO", "PH-SUK", "PH-SAR", "PH-SCO", "PH-DAS", "PH-COM", "PH-DAO", "PH-TAW", "PH-BAS", "PH-CAM", "PH-AGS", "PH-BUK"]],
    ["PH-VIS", "Visayas", ["PH-SLE", "PH-LEY", "PH-EAS", "PH-BIL", "PH-WSA", "PH-NSA", "PH-SIG", "PH-BOH", "PH-GUI", "PH-BCD", "PH-NEC", "PH-NER", "PH-CEB",
      "PH-MDE", "PH-LAP", "PH-AKL", "PH-ANT", "PH-ILI", "PH-CAP"]],
    ["PH-LUZ", "Luzon", "rest"],
  ] },
  JPN: { regions: [["JP-HKD", "Hokkaido", ["JP-01"]], ["JP-OKI", "Okinawa", ["JP-47"]], ["JPN", "Japan", "rest"]] },
  TUR: { regions: [
    ["TR-CST", "Aegean & Mediterranean Coast", ["TR-07", "TR-48", "TR-09", "TR-35", "TR-33"]],
    ["TR-EST", "Eastern Turkey", ["TR-75", "TR-36", "TR-76", "TR-04", "TR-65", "TR-30", "TR-13", "TR-49", "TR-12", "TR-25", "TR-24", "TR-62", "TR-69", "TR-29", "TR-08"]],
    ["TUR", "Türkiye", "rest"],
  ] },
  IRN: { regions: [["IR-GLF", "Persian Gulf Coast & Islands", ["IR-23", "IR-06"]], ["IRN", "Iran", "rest"]] },
  ITA: { skip: ["IT-CI", "IT-SS", "IT-NU", "IT-OT", "IT-OR", "IT-VS", "IT-CA", "IT-OG", "IT-TP", "IT-ME", "IT-PA", "IT-AG", "IT-CL", "IT-RG", "IT-SR", "IT-CT", "IT-EN"],
    regions: [["IT-ALP", "Italian Alps & Dolomites", ["IT-BZ", "IT-TN", "IT-AO", "IT-BL", "IT-SO"]], ["ITA", "Italy", "rest"]] },
  FRA: { skip: ["FR-GF", "FR-MQ", "FR-GP", "FR-RE", "FR-YT", "FR-2A", "FR-2B"],
    regions: [["FR-ALP", "French Alps", ["FR-73", "FR-74", "FR-05"]], ["FRA", "France", "rest"]] },
  ESP: { skip: ["ES-TF", "ES-GC", "ES-PM"], regions: [
    ["ES-AND", "Andalusia", ["ES-AL", "ES-CA", "ES-CO", "ES-GR", "ES-H", "ES-J", "ES-MA", "ES-SE", "ES-CE", "ES-ML"]],
    ["ES-GRN", "Green Spain", ["ES-C", "ES-LU", "ES-OR", "ES-PO", "ES-O", "ES-S", "ES-BI", "ES-SS", "ES-VI"]],
    ["ESP", "Spain", "rest"],
  ] },
  SWE: { regions: [["SE-LAP", "Swedish Lapland", ["SE-BD"]], ["SWE", "Sweden", "rest"]] },
  PAK: { regions: [["PK-GB", "Gilgit-Baltistan", ["PK-GB"]], ["PAK", "Pakistan", "rest"]] },
  OMN: { regions: [["OM-DHO", "Dhofar", ["OM-ZU"]], ["OMN", "Oman", "rest"]] },
  ETH: { regions: [["ET-AFR", "Danakil & Afar", ["ET-AF"]], ["ETH", "Ethiopia", "rest"]] },
};

const require = createRequire(import.meta.url);
const base = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";
// Downloads are kept in node_modules/.cache: the 1:10m states are 40 MB
async function load(file) {
  const kept = new URL(`../node_modules/.cache/${file}`, import.meta.url);
  if (existsSync(kept)) return JSON.parse(readFileSync(kept));
  const r = await fetch(base + file);
  if (!r.ok) throw new Error(`Download failed: ${r.status}`);
  const text = await r.text();
  mkdirSync(new URL(".", kept), { recursive: true });
  writeFileSync(kept, text);
  return JSON.parse(text);
}
const round = (v) => (Array.isArray(v) ? v.map(round) : Math.round(v * 1e4) / 1e4);
// d3 takes a ring's direction to say which side is inside: a piece that comes out as "all the world but this" is turned round
const rewind = (rings) => (geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI ? rings.map((r) => r.slice().reverse()) : rings);
const props = (id, name, geometry, at) => {
  // Pieces under 15 km² go: specks of island, and slivers where two maps' borders don't quite meet
  const pieces = (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates).map(rewind)
    .filter((p) => geoArea({ type: "Polygon", coordinates: p }) * 6371 ** 2 >= 15);
  if (!pieces.length) throw new Error(`${name} (${id}) came out empty`);
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

const asked = process.argv.slice(2).map((s) => s.toUpperCase());
const wanted = (code) => !asked.length || asked.includes(code);

// ---------- countries in regions ----------
const codes = Object.keys(REGIONS).filter(wanted);
const source = {};
for (const code of codes) {
  const file = `ne_${REGIONS[code].from || "10m"}_admin_1_states_provinces.geojson`;
  source[file] ??= (await load(file)).features;
}
for (const code of codes) {
  const { regions, skip = [], from = "10m" } = REGIONS[code];
  const named = new Set(regions.flatMap(([, , of]) => (Array.isArray(of) ? of : [])));
  const pieces = [];
  for (const f of source[`ne_${from}_admin_1_states_provinces.geojson`].filter((s) => s.properties.adm0_a3 === code)) {
    const id = f.properties.iso_3166_2, state = { id, lat: f.properties.latitude, lng: f.properties.longitude };
    if (skip.includes(id)) continue;
    const owner = regions.find(([, , of]) => (Array.isArray(of) ? of.includes(id) : typeof of === "function" ? of(state) : false))
      || regions.find(([, , of]) => of === "rest" && !named.has(id));
    if (!owner) throw new Error(`${f.properties.name} (${id}) is in no region of ${code}`);
    let polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const [rid, , of] of regions) {
      if (of?.carve !== id) continue;
      const [w, s, e, n] = of.box;
      const inBox = (p) => { const [x, y] = geoCentroid({ type: "Polygon", coordinates: p }); return x >= w && x <= e && y >= s && y <= n; };
      const cut = polygons.filter(inBox);
      if (!cut.length) throw new Error(`${rid}: nothing of ${id} is in its box`);
      pieces.push({ type: "Feature", properties: { region: rid }, geometry: { type: "MultiPolygon", coordinates: cut } });
      polygons = polygons.filter((p) => !cut.includes(p));
    }
    pieces.push({ type: "Feature", properties: { region: owner[0] }, geometry: { type: "MultiPolygon", coordinates: polygons } });
  }
  if (!pieces.length) throw new Error(`Natural Earth has no states for ${code}`);
  // Joined as one topology, so neighbouring regions share each border point for point. The 1:10m states are thinned
  // to about 30% of their points, near the rest of the map's detail; the 1:50m ones are at it already.
  let topo = topology({ all: { type: "FeatureCollection", features: pieces } }, 1e5);
  if (from === "10m") { topo = presimplify(topo); topo = simplify(topo, quantile(topo, 0.3)); }
  const all = topo.objects.all.geometries;
  write(code, regions.map(([id, name, , at]) => props(id, name, merge(topo, all.filter((g) => g.properties.region === id)), at)));
}

// ---------- Moldova and Transnistria ----------
if (wanted("MDA")) {
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
