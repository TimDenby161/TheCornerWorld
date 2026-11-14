// Lists every airport with scheduled flights, for the map, and finds the ones nearest each place, for the
// guides and the trip planner.
// Run with `npm run build:airports` after adding or moving places in docs/data/guides.json.
// The airports come from OurAirports (ourairports.com), which is in the public domain. Only airports with
// scheduled flights and a three-letter code are used. Distances are straight lines.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { csvParse, geoDistance } from "d3";

const SOURCE = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const REACH_KM = 300; // how far away a large or medium airport can be and still be offered
const SMALL_REACH_KM = 100; // an airstrip is only offered when nothing bigger is in reach, and only this close
const HUB_EXTRA_KM = 40; // a large airport goes first if it is no more than this much further than a smaller one

const read = (name) => JSON.parse(readFileSync(new URL(`../docs/data/${name}.json`, import.meta.url)));
const guides = read("guides");
// Each destination's two-letter country code, as OurAirports has it. A state or island takes its country's.
const twoLetter = new Map(createRequire(import.meta.url)("world-countries").map((c) => [c.cca3, c.cca2]));
const nation = new Map(read("countries").map((c) => [c.id, twoLetter.get(c.within || c.id)]));
const places = Object.entries(guides).flatMap(([id, guide]) => (guide.places || []).map((p) => ({ key: `${id}/${p.id}`, name: p.name, lat: p.lat, lng: p.lng, airport: p.airport, nation: nation.get(id) })));

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`OurAirports: ${res.status}`);
const SIZES = ["large_airport", "medium_airport", "small_airport"];
const all = csvParse(await res.text())
  .filter((a) => a.scheduled_service === "yes" && /^[A-Z]{3}$/.test(a.iata_code) && SIZES.includes(a.type))
  .map((a) => ({ code: a.iata_code, name: a.name, city: a.municipality.replace(/\s*\(.*\)/, ""), nation: a.iso_country, size: SIZES.indexOf(a.type), lat: +a.latitude_deg, lng: +a.longitude_deg }));

// For each place: the nearest large or medium airport, and the nearest large one if that is another. A place
// with neither in reach gets the nearest airstrip, if it is close. Airports in the place's own country are
// looked at first, so that the nearest is not one across a border or a strait. An `airport` code written on the
// place in guides.json goes ahead of them all.
const out = {}, none = [], abroad = [];
for (const p of places) {
  const reach = all.map((a) => ({ a, km: geoDistance([p.lng, p.lat], [a.lng, a.lat]) * 6371 }))
    .filter((n) => n.km <= REACH_KM).sort((x, y) => x.km - y.km);
  const home = reach.filter((n) => n.a.nation === p.nation);
  const near = home.some((n) => n.a.size < 2 || n.km <= SMALL_REACH_KM) ? home : reach;
  const nearest = near.find((n) => n.a.size < 2) || near.find((n) => n.km <= SMALL_REACH_KM);
  const large = near.find((n) => n.a.size === 0);
  const chosen = p.airport && all.map((a) => ({ a, km: geoDistance([p.lng, p.lat], [a.lng, a.lat]) * 6371 })).find((n) => n.a.code === p.airport);
  if (p.airport && !chosen) throw new Error(`${p.name}: no airport with scheduled flights has the code ${p.airport}`);
  const picks = [chosen, ...(large && nearest && large.km <= nearest.km + HUB_EXTRA_KM ? [large, nearest] : [nearest, large])]
    .filter((n, i, list) => n && list.findIndex((m) => m && m.a === n.a) === i).slice(0, 2);
  if (!picks.length) { none.push(p.name); continue; }
  if (near !== home) abroad.push(`${p.name} (${picks[0].a.code})`);
  out[p.key] = picks.map((n) => [n.a.code, Math.round(n.km)]);
}

const row = ([key, v]) => `    ${JSON.stringify(key)}: ${JSON.stringify(v)}`;
// Two airports can carry the same code in the source; the larger is kept
const byCode = new Map();
for (const a of all) if (!byCode.has(a.code) || a.size < byCode.get(a.code).size) byCode.set(a.code, a);
const airports = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code))
  .map((a) => [a.code, { name: a.name, city: a.city, lat: Math.round(a.lat * 100) / 100, lng: Math.round(a.lng * 100) / 100, size: ["large", "medium", "small"][a.size] }]);
writeFileSync(new URL("../docs/data/airports.json", import.meta.url),
  `{\n  "airports": {\n${airports.map(row).join(",\n")}\n  },\n  "places": {\n${Object.entries(out).sort(([a], [b]) => a.localeCompare(b)).map(row).join(",\n")}\n  }\n}\n`);
if (none.length) console.log(`No airport within reach of: ${none.join(", ")}`);
if (abroad.length) console.log(`Nearest airport is in another country for: ${abroad.join(", ")}`);
console.log(`${places.length} places, ${airports.length} airports`);
