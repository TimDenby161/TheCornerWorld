// Downloads the state and province outlines for one country, for build-data.mjs to split that country up.
// Run with `node scripts/fetch-states.mjs AUS`, then list the country in build-data.mjs.
// Natural Earth has states at the map's level of detail for AUS, BRA, CAN, CHN, IDN, IND, RUS, USA and ZAF.
// For other countries it has a few larger parts instead, such as the four nations of the UK (GBR).
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const base = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";
const code = (process.argv[2] || "").toUpperCase();
const country = createRequire(import.meta.url)("world-countries").find((c) => c.cca3 === code);
if (!country) throw new Error(`"${code}" is not a country. Use a three-letter country code, e.g. AUS.`);
const load = (file) => fetch(base + file).then((r) => { if (!r.ok) throw new Error(`Download failed: ${r.status}`); return r.json(); });

const round = (v) => (Array.isArray(v) ? v.map(round) : Math.round(v * 1e4) / 1e4);
const slim = (f, properties) => ({ type: "Feature", properties, geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) } });

let features = (await load("ne_50m_admin_1_states_provinces.geojson")).features
  .filter((f) => f.properties.adm0_a3 === code)
  .map((f) => slim(f, { id: f.properties.iso_3166_2, name: f.properties.name, lat: f.properties.latitude, lng: f.properties.longitude }));
if (!features.length) features = (await load("ne_50m_admin_0_map_units.geojson")).features
  .filter((f) => f.properties.ADM0_A3 === code && f.properties.GU_A3 !== code)
  .map((f) => slim(f, { id: `${country.cca2}-${f.properties.GU_A3}`, name: f.properties.GEOUNIT, lat: f.properties.LABEL_Y, lng: f.properties.LABEL_X }));
if (!features.length) throw new Error(`Natural Earth has no outlines for the parts of ${country.name.common}.`);

writeFileSync(new URL(`states/${code}.json`, import.meta.url), JSON.stringify({ type: "FeatureCollection", features }));
console.log(`${code}: ${features.map((f) => `${f.properties.name} (${f.properties.id})`).join(", ")}`);
