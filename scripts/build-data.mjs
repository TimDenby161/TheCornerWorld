// Builds the reference data the site reads: the map shapes, the basic facts for every country,
// and the two vendored libraries. Run with `npm run build:data` after `npm install`.
// The travel guides (docs/data/guides.json) are written by hand and are not touched here.
import { writeFileSync, copyFileSync } from "node:fs";
import { advice } from "./advice.mjs";
import { createRequire } from "node:module";
import { geoArea, geoCentroid, geoDistance } from "d3";
import { feature, merge } from "topojson-client";
import { topology } from "topojson-server";

const require = createRequire(import.meta.url);
const world = require("world-atlas/countries-50m.json");
// Places listed separately that have no country record of their own. The X codes are made up: ISO leaves them free.
const extras = [
  {
    cca3: "XGZ", ccn3: "XGZ", name: { common: "Gaza" }, flag: "🇵🇸", capital: ["Gaza City"],
    region: "Asia", subregion: "Western Asia", languages: { ara: "Arabic" }, idd: { root: "+9", suffixes: ["70"] },
    currencies: { ILS: { name: "Israeli new shekel" }, EGP: { name: "Egyptian pound" } },
    latlng: [31.42, 34.37], area: 365,
  },
  {
    cca3: "XWB", ccn3: "XWB", name: { common: "West Bank" }, flag: "🇵🇸", capital: ["Ramallah"],
    region: "Asia", subregion: "Western Asia", languages: { ara: "Arabic" }, idd: { root: "+9", suffixes: ["70"] },
    currencies: { ILS: { name: "Israeli new shekel" }, JOD: { name: "Jordanian dinar" } },
    latlng: [31.9, 35.2], area: 5655,
  },
  // Parts of a country, which take the country's other facts. A "group" is shown with the country's name and can be
  // searched for. The codes are made up, except for the Azores, Madeira, Sardinia, Sicily and Corsica.
  { cca3: "MY-EM", ccn3: "MY-EM", name: { common: "Malaysian Borneo" }, capital: [], latlng: [3.2, 114.6], area: 198447, within: "MYS" },
  { cca3: "ES-MLL", ccn3: "ES-MLL", name: { common: "Mallorca" }, capital: ["Palma"], latlng: [39.6, 2.95], area: 3640, within: "ESP", group: "Balearic Islands" },
  { cca3: "ES-IBZ", ccn3: "ES-IBZ", name: { common: "Ibiza" }, capital: ["Ibiza Town"], latlng: [38.98, 1.43], area: 572, within: "ESP", group: "Balearic Islands" },
  { cca3: "ES-TEN", ccn3: "ES-TEN", name: { common: "Tenerife" }, capital: ["Santa Cruz de Tenerife"], latlng: [28.29, -16.54], area: 2034, within: "ESP", group: "Canary Islands" },
  { cca3: "ES-GCA", ccn3: "ES-GCA", name: { common: "Gran Canaria" }, capital: ["Las Palmas"], latlng: [27.96, -15.58], area: 1560, within: "ESP", group: "Canary Islands" },
  { cca3: "ES-FUE", ccn3: "ES-FUE", name: { common: "Fuerteventura" }, capital: ["Puerto del Rosario"], latlng: [28.41, -14.04], area: 1660, within: "ESP", group: "Canary Islands" },
  { cca3: "ES-LAN", ccn3: "ES-LAN", name: { common: "Lanzarote" }, capital: ["Arrecife"], latlng: [29.03, -13.64], area: 846, within: "ESP", group: "Canary Islands" },
  { cca3: "ES-LPA", ccn3: "ES-LPA", name: { common: "La Palma" }, capital: ["Santa Cruz de La Palma"], latlng: [28.7, -17.85], area: 708, within: "ESP", group: "Canary Islands" },
  { cca3: "ES-GOM", ccn3: "ES-GOM", name: { common: "La Gomera" }, capital: ["San Sebastián de La Gomera"], latlng: [28.11, -17.21], area: 370, within: "ESP", group: "Canary Islands" },
  { cca3: "ES-HIE", ccn3: "ES-HIE", name: { common: "El Hierro" }, capital: ["Valverde"], latlng: [27.74, -18.01], area: 269, within: "ESP", group: "Canary Islands" },
  { cca3: "PT-20", ccn3: "PT-20", name: { common: "Azores" }, capital: ["Ponta Delgada"], latlng: [37.78, -25.45], area: 2351, within: "PRT" },
  { cca3: "PT-30", ccn3: "PT-30", name: { common: "Madeira" }, capital: ["Funchal"], latlng: [32.75, -16.95], area: 801, within: "PRT" },
  { cca3: "IT-88", ccn3: "IT-88", name: { common: "Sardinia" }, capital: ["Cagliari"], latlng: [40.05, 9.05], area: 24090, within: "ITA" },
  { cca3: "IT-82", ccn3: "IT-82", name: { common: "Sicily" }, capital: ["Palermo"], latlng: [37.59, 14.16], area: 25711, within: "ITA" },
  { cca3: "FR-20R", ccn3: "FR-20R", name: { common: "Corsica" }, capital: ["Ajaccio"], latlng: [42.15, 9.1], area: 8680, within: "FRA" },
];
const all = require("world-countries").slice();
for (const extra of extras) all.push({ ...all.find((c) => c.cca3 === extra.within), ...extra });
const out = new URL("../docs/", import.meta.url);

// The map names each shape by its ISO numeric code; a few disputed areas have a name only.
const featureKey = (g) => g.id ?? g.properties.name;
const geometries = world.objects.countries.geometries.filter((g) => g.id !== "010"); // no Antarctica
world.objects.countries.geometries = geometries;
delete world.objects.land;

// Arcs are stored as a start point followed by steps, in whole grid units
const decode = (arc) => { let x = 0, y = 0; return arc.map(([dx, dy]) => [(x += dx), (y += dy)]); };
const encode = (points) => points.map(([x, y], i) => (i ? [x - points[i - 1][0], y - points[i - 1][1]] : [x, y]));

// Western Sahara comes drawn as only the strip east of the Moroccan wall, with the rest inside Morocco.
// This redraws it as the whole territory: the border leaves the wall's northern end and runs west along
// that parallel (27°40'N) to the Atlantic, and the coast south of there moves from Morocco to Western Sahara.
{
  const morocco = geometries.find((g) => g.id === "504").arcs[0];
  const sahara = geometries.find((g) => g.id === "732").arcs[0];
  const at = morocco.findIndex((a) => sahara.includes(~a));
  const wall = morocco[at], coast = morocco[(at + 1) % morocco.length];
  const [east, y] = decode(world.arcs[wall])[0];
  const shore = decode(world.arcs[coast]); // runs north from the wall's southern end
  const crossings = shore.flatMap((p, i) => (i && (shore[i - 1][1] - y) * (p[1] - y) <= 0 ? [i] : []));
  if (wall < 0 || coast < 0 || crossings.length !== 1) throw new Error("Western Sahara: the map's borders are not laid out as expected");
  const [i] = crossings, [a, b] = [shore[i - 1], shore[i]];
  const west = Math.round(a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]));
  const steps = Math.ceil((east - west) / 50); // a point every 0.2° or so keeps the line on the parallel
  const border = Array.from({ length: steps + 1 }, (_, n) => [Math.round(east + ((west - east) * n) / steps), y]);
  world.arcs[wall] = encode(border);
  world.arcs[coast] = encode([[west, y], ...shore.slice(i)]);
  world.arcs.push(encode([...shore.slice(0, i), [west, y]]));
  sahara.splice(sahara.indexOf(~wall), 1, world.arcs.length - 1, ~wall);
}

// The map draws some territories as part of a larger shape. Each one with a country record of its own gets its
// own shape, so it can be picked on the map: [the larger shape, the territory's code, where its land lies as
// west, south, east, north].
const splits = [
  ["250", "GUF", [-55, 2, -51, 6]], // France: French Guiana, Guadeloupe, Martinique, Réunion, Mayotte
  ["250", "GLP", [-62, 15.7, -60.9, 16.6]],
  ["250", "MTQ", [-61.4, 14.3, -60.7, 15]],
  ["250", "REU", [55, -21.5, 56, -20.7]],
  ["250", "MYT", [44.9, -13.1, 45.4, -12.5]],
  ["528", "BES", [-68.6, 11.9, -62.8, 17.8]], // Netherlands: Bonaire, Sint Eustatius and Saba
  ["578", "SJM", [9, 74, 35, 81], [-10, 70.5, -7, 71.5]], // Norway: Svalbard, and Jan Mayen
  ["554", "TKL", [-173, -10, -171, -8]], // New Zealand: Tokelau
  ["Indian Ocean Ter.", "CXR", [105.4, -10.7, 105.9, -10.3]], // Christmas Island
  ["Indian Ocean Ter.", "CCK", [96.6, -12.4, 97.1, -11.6]], // Cocos (Keeling) Islands
  ["458", "MY-EM", [108, 0, 120, 8]], // Malaysia: its part of Borneo
  ["724", "ES-MLL", [2.2, 39.2, 3.6, 40]], // Spain: Mallorca and Ibiza
  ["724", "ES-IBZ", [1.1, 38.8, 1.7, 39.15]],
  ["724", "ES-TEN", [-16.95, 27.95, -16.1, 28.6]], // Spain: the Canary Islands, one by one
  ["724", "ES-GCA", [-15.85, 27.7, -15.3, 28.2]],
  ["724", "ES-FUE", [-14.55, 28, -13.8, 28.8]],
  ["724", "ES-LAN", [-13.9, 28.8, -13.35, 29.5]],
  ["724", "ES-LPA", [-18.05, 28.4, -17.7, 28.9]],
  ["724", "ES-GOM", [-17.4, 27.95, -17.05, 28.25]],
  ["724", "ES-HIE", [-18.2, 27.6, -17.85, 27.9]],
  ["620", "PT-20", [-31.5, 36.8, -24.9, 39.8]], // Portugal: the Azores and Madeira
  ["620", "PT-30", [-17.4, 32.3, -16.1, 33.2]],
  ["380", "IT-88", [8, 38.8, 9.9, 41.3]], // Italy: Sardinia, and Sicily with Pantelleria
  ["380", "IT-82", [11.8, 36.6, 15.7, 38.4]],
  ["250", "FR-20R", [8.5, 41.3, 9.6, 43.1]], // France: Corsica
  ["275", "XGZ", [34, 31.1, 34.7, 31.7]], // Palestine: Gaza and the West Bank
  ["275", "XWB", [34.8, 31.2, 35.7, 32.7]],
];
for (const [parentKey, cca3, ...boxes] of splits) {
  const parent = geometries.find((g) => featureKey(g) === parentKey);
  const place = all.find((c) => c.cca3 === cca3);
  const inside = (arcs) => {
    const [lng, lat] = geoCentroid(feature(world, { type: "Polygon", arcs }));
    return boxes.some(([w, s, e, n]) => lng >= w && lng <= e && lat >= s && lat <= n);
  };
  const moved = parent.arcs.filter(inside);
  if (!moved.length) throw new Error(`${place.name.common} not found in the shape for ${parent.properties.name}`);
  parent.arcs = parent.arcs.filter((arcs) => !moved.includes(arcs));
  const shape = { type: "MultiPolygon", arcs: moved, id: place.ccn3, properties: { name: place.name.common } };
  geometries.push(shape);
  if (!(place.area > 0)) place.area = Math.round(geoArea(feature(world, shape)) * 6371 ** 2); // one record has no area
}
// A shape split up entirely is replaced by its parts, and so is its country record
const replaced = new Set(geometries.filter((g) => g.type === "MultiPolygon" && !g.arcs.length).map(featureKey));
for (const key of replaced) geometries.splice(geometries.findIndex((g) => featureKey(g) === key), 1);

// Countries listed state by state. The country keeps its entry and its guide, but on the map its states are
// the shapes to pick. The outlines are in scripts/states/ (see fetch-states.mjs). Each state is named here with
// its capital, or with { capital, flag } if it has a flag of its own; its other facts come from the country.
// { name, of } instead joins several states into one area, such as an island. An area listed under the country's
// own code gets no entry: those states stay as the country's shape.
const tagFlag = (code) => String.fromCodePoint(0x1f3f4, ...[...code].map((ch) => 0xe0000 + ch.charCodeAt(0)), 0xe007f);
const states = {
  AUS: {
    "AU-NSW": "Sydney", "AU-VIC": "Melbourne", "AU-QLD": "Brisbane", "AU-SA": "Adelaide",
    "AU-WA": "Perth", "AU-TAS": "Hobart", "AU-NT": "Darwin", "AU-ACT": "Canberra",
  },
  GBR: {
    "GB-ENG": { capital: "London", flag: tagFlag("gbeng") }, "GB-SCT": { capital: "Edinburgh", flag: tagFlag("gbsct") },
    "GB-WLS": { capital: "Cardiff", flag: tagFlag("gbwls") }, "GB-NIR": "Belfast",
  },
  CAN: {
    "CA-AB": "Edmonton", "CA-BC": "Victoria", "CA-MB": "Winnipeg", "CA-NB": "Fredericton", "CA-NL": "St. John's",
    "CA-NS": "Halifax", "CA-NT": "Yellowknife", "CA-NU": "Iqaluit", "CA-ON": "Toronto", "CA-PE": "Charlottetown",
    "CA-QC": "Québec City", "CA-SK": "Regina", "CA-YT": "Whitehorse",
  },
  USA: {
    "US-AL": "Montgomery", "US-AK": "Juneau", "US-AZ": "Phoenix", "US-AR": "Little Rock", "US-CA": "Sacramento",
    "US-CO": "Denver", "US-CT": "Hartford", "US-DE": "Dover", "US-DC": "Washington", "US-FL": "Tallahassee",
    "US-GA": "Atlanta", "US-HI": "Honolulu", "US-ID": "Boise", "US-IL": "Springfield", "US-IN": "Indianapolis",
    "US-IA": "Des Moines", "US-KS": "Topeka", "US-KY": "Frankfort", "US-LA": "Baton Rouge", "US-ME": "Augusta",
    "US-MD": "Annapolis", "US-MA": "Boston", "US-MI": "Lansing", "US-MN": "Saint Paul", "US-MS": "Jackson",
    "US-MO": "Jefferson City", "US-MT": "Helena", "US-NE": "Lincoln", "US-NV": "Carson City", "US-NH": "Concord",
    "US-NJ": "Trenton", "US-NM": "Santa Fe", "US-NY": "Albany", "US-NC": "Raleigh", "US-ND": "Bismarck",
    "US-OH": "Columbus", "US-OK": "Oklahoma City", "US-OR": "Salem", "US-PA": "Harrisburg", "US-RI": "Providence",
    "US-SC": "Columbia", "US-SD": "Pierre", "US-TN": "Nashville", "US-TX": "Austin", "US-UT": "Salt Lake City",
    "US-VT": "Montpelier", "US-VA": "Richmond", "US-WA": "Olympia", "US-WV": "Charleston", "US-WI": "Madison",
    "US-WY": "Cheyenne",
  },
  IDN: {
    "ID-JW": { name: "Java", of: ["ID-BT", "ID-JK", "ID-JB", "ID-JT", "ID-YO", "ID-JI"] },
    "ID-SM": { name: "Sumatra", of: ["ID-AC", "ID-SU", "ID-SB", "ID-RI", "ID-KR", "ID-JA", "ID-BE", "ID-SS", "ID-BB", "ID-LA"] },
    "ID-KA": { name: "Indonesian Borneo", of: ["ID-KB", "ID-KT", "ID-KS", "ID-KI"] },
    "ID-SL": { name: "Sulawesi", of: ["ID-SA", "ID-GO", "ID-ST", "ID-SR", "ID-SN", "ID-SG"] },
    "ID-NU": { name: "Nusa Tenggara", of: ["ID-NB", "ID-NT"] },
    "ID-BA": "Denpasar", // Bali
    IDN: { of: ["ID-MA", "ID-MU", "ID-PA", "ID-PB"] }, // Maluku and Papua
  },
};
// Outlines too small to list on their own are drawn as part of a neighbour
const drawnWith = { "AU-X02~": "AU-NSW" }; // Jervis Bay Territory, with New South Wales

const { scale, translate } = world.transform;
const onGrid = (ring) => ring.map(([lng, lat]) => [Math.round((lng - translate[0]) / scale[0]), Math.round((lat - translate[1]) / scale[1])]);
const ringToArc = (ring) => [world.arcs.push(encode(onGrid(ring))) - 1];
const shapeless = new Set(); // countries with no shape of their own left
for (const [cca3, named] of Object.entries(states)) {
  const country = all.find((c) => c.cca3 === cca3);
  let outlines = require(`./states/${cca3}.json`).features;
  const joined = Object.entries(named).filter(([, entry]) => entry.of);
  if (joined.length) {
    const linked = topology({ all: { type: "FeatureCollection", features: outlines } });
    const used = new Set(joined.flatMap(([, entry]) => entry.of));
    outlines = outlines.filter((f) => !used.has(f.properties.id)).concat(joined.map(([id, entry]) => {
      const members = linked.objects.all.geometries.filter((g) => entry.of.includes(g.properties.id));
      if (members.length !== entry.of.length) throw new Error(`${id}: some of ${entry.of.join(", ")} are not in states/${cca3}.json`);
      const geometry = merge(linked, members);
      const size = (coordinates) => geoArea({ type: "Polygon", coordinates });
      const [lng, lat] = geoCentroid({ type: "Polygon", coordinates: geometry.coordinates.reduce((a, b) => (size(b) > size(a) ? b : a)) });
      return { type: "Feature", properties: { id, name: entry.name ?? country.name.common, lat, lng }, geometry };
    }));
  }
  if (!named[cca3]) shapeless.add(cca3);

  // The country's own shape is the largest with its code (a small territory can share the code)
  const size = (g) => (g.id === country.ccn3 ? geoArea(feature(world, g)) : -1);
  const whole = geometries.splice(geometries.indexOf(geometries.reduce((a, b) => (size(b) > size(a) ? b : a))), 1)[0];
  const shapeId = (id) => (id === cca3 ? country.ccn3 : drawnWith[id] ?? id);
  for (const f of outlines) {
    const { id, name, lat, lng } = f.properties;
    const entry = named[id];
    if (!entry && !named[drawnWith[id]]) throw new Error(`${name} (${id}) needs an entry in "states" or in "drawnWith"`);
    const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    geometries.push({ type: "MultiPolygon", arcs: polygons.map((rings) => rings.map(ringToArc)), id: shapeId(id), properties: { name } });
    if (!entry || id === cca3) continue;
    const capital = typeof entry === "string" ? entry : entry.capital;
    all.push({
      cca3: id, ccn3: id, name: { common: name }, flag: entry.flag ?? country.flag, capital: capital ? [capital] : [],
      region: country.region, subregion: country.subregion, languages: country.languages, idd: country.idd,
      currencies: country.currencies, latlng: [lat, lng], area: Math.round(geoArea(f) * 6371 ** 2), within: cca3,
    });
  }
  // Far-off islands in the country's shape that no state outline covers stay on the map, with the nearest state.
  // An island is covered if the outlines trace the same coast, point for point.
  const listed = outlines.filter((f) => named[f.properties.id]);
  const traced = new Set(outlines.flatMap((f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).flat().flatMap(onGrid).map(String)));
  for (const arcs of whole.type === "Polygon" ? [whole.arcs] : whole.arcs) {
    const coast = arcs.flat().flatMap((a) => decode(world.arcs[a < 0 ? ~a : a]));
    if (coast.filter((point) => traced.has(String(point))).length > coast.length / 2) continue;
    const centre = geoCentroid(feature(world, { type: "Polygon", arcs }));
    const dist = (f) => Math.min(...f.geometry.coordinates.flat(f.geometry.type === "Polygon" ? 1 : 2).map((point) => geoDistance(centre, point)));
    const nearest = listed.reduce((a, b) => (dist(b) < dist(a) ? b : a));
    geometries.push({ type: "Polygon", arcs, id: shapeId(nearest.properties.id), properties: { name: nearest.properties.name } });
  }
}

// Arcs left unused by the shapes taken out above are dropped, and the rest renumbered
{
  const used = new Map();
  const renumber = (a) => {
    if (Array.isArray(a)) return a.map(renumber);
    const i = a < 0 ? ~a : a;
    if (!used.has(i)) used.set(i, used.size);
    return a < 0 ? ~used.get(i) : used.get(i);
  };
  for (const g of geometries) g.arcs = renumber(g.arcs);
  world.arcs = [...used.keys()].map((i) => world.arcs[i]);
}
const keys = new Set(geometries.map(featureKey));

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const countries = all
  .filter((c) => c.cca3 !== "ATA" && !replaced.has(c.ccn3))
  .map((c) => {
    const key = shapeless.has(c.cca3) ? null : keys.has(c.ccn3) ? c.ccn3 : keys.has(c.name.common) ? c.name.common : null;
    const suffixes = c.idd?.suffixes ?? [];
    return {
      id: c.cca3,
      key,
      name: c.name.common,
      flag: c.flag,
      capital: (c.capital ?? []).join(", "),
      region: c.region,
      subregion: c.subregion,
      currencies: Object.entries(c.currencies ?? {}).map(([code, v]) => `${cap(v.name)} (${code})`),
      languages: Object.values(c.languages ?? {}),
      dial: c.idd?.root ? c.idd.root + (suffixes.length === 1 ? suffixes[0] : "") : "",
      lat: c.latlng[0],
      lng: c.latlng[1],
      area: c.area,
      within: c.within,
      group: c.group,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
// The UK government's travel advice for each (see scripts/advice.mjs)
const countryById = new Map(countries.map((c) => [c.id, c]));
for (const c of countries) c.advice = advice(c, countryById);

writeFileSync(new URL("data/world.json", out), JSON.stringify(world));
writeFileSync(new URL("data/countries.json", out), JSON.stringify(countries));
const modules = new URL("../node_modules/", import.meta.url);
copyFileSync(new URL("d3/dist/d3.min.js", modules), new URL("assets/lib/d3.min.js", out));
copyFileSync(new URL("topojson-client/dist/topojson-client.min.js", modules), new URL("assets/lib/topojson-client.min.js", out));
// Supabase's library, for accounts (docs/assets/account.js fetches it only when someone signs in)
copyFileSync(new URL("@supabase/supabase-js/dist/umd/supabase.js", modules), new URL("assets/lib/supabase.js", out));

const matched = new Set(countries.map((c) => c.key).filter(Boolean));
const unmatched = geometries.filter((g) => !matched.has(featureKey(g))).map((g) => g.properties.name);
console.log(`${geometries.length} map shapes, ${countries.length} countries, ${matched.size} on the map`);
console.log(`Shapes with no country record: ${unmatched.join(", ") || "none"}`);
