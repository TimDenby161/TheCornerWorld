// The weather month by month for every country, state and island on the map: the average high and low (°C),
// the rain (mm) and a rating, Great, Okay or Bad. Writes docs/data/weather.json.
// Run with `npm run build:weather` after adding a destination, or a guide with best months.
//
// The figures are 10 years of daily readings (2015–2024) from NASA POWER (power.larc.nasa.gov), averaged by
// month. NASA's grid is coarse (about 50 km), so a town in the hills reads as warm as the lowland around it. The
// temperatures are put right for the place's own height, which comes from Open-Meteo's elevation service
// (Copernicus 90 m), at 6.5 °C for every 1,000 m.
//
// Where the figures are for: a place written in scripts/weather-points.json; a few big countries and states by their main city (below);
// anywhere else, the middle of the country.
//
// The rating: Bad if the average high is under 7 °C or over 37 °C, or over 280 mm of rain falls. Great if the
// high is 17–33 °C with 160 mm of rain or less. Okay in between. (NASA's rain runs high in the wet tropics,
// hence the generous limits.) Best months written by hand in weather-points.json (`best`, kept from the old
// destination guides) come first: they are that country's Great months, and no other month of it is Great.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const read = (name) => JSON.parse(readFileSync(new URL(`../docs/data/${name}.json`, import.meta.url)));
const countries = read("countries");
const written = JSON.parse(readFileSync(new URL("weather-points.json", import.meta.url)));

// Big places whose middle is empty country: their weather is taken where people go
const CITIES = {
  "US-AK": ["Anchorage", 61.22, -149.9], "CA-ON": ["Toronto", 43.65, -79.38], "CA-QC": ["Montréal", 45.5, -73.57],
  "CA-NT": ["Yellowknife", 62.45, -114.37], "CA-NU": ["Iqaluit", 63.75, -68.52], "CA-BC": ["Vancouver", 49.28, -123.12],
  "AU-WA": ["Perth", -31.95, 115.86], "AU-QLD": ["Brisbane", -27.47, 153.03], "AU-NT": ["Darwin", -12.46, 130.84], "MY-PM": ["Kuala Lumpur", 3.14, 101.69],
  GRL: ["Nuuk", 64.18, -51.72], MNG: ["Ulaanbaatar", 47.92, 106.92], SAU: ["Riyadh", 24.71, 46.68], IRN: ["Isfahan", 32.65, 51.67],
  DZA: ["Algiers", 36.75, 3.06], LBY: ["Tripoli", 32.89, 13.19], ETH: ["Addis Ababa", 9.03, 38.74], COD: ["Kinshasa", -4.32, 15.31],
  AGO: ["Luanda", -8.84, 13.23], SDN: ["Khartoum", 15.5, 32.56], TCD: ["N'Djamena", 12.13, 15.06], NER: ["Niamey", 13.51, 2.11],
  MLI: ["Bamako", 12.64, -8], MRT: ["Nouakchott", 18.08, -15.98],
};

const points = countries.map((c) => {
  const first = written[c.id];
  if (first?.at) return { id: c.id, at: first.at, lat: first.lat, lng: first.lng };
  if (CITIES[c.id]) { const [at, lat, lng] = CITIES[c.id]; return { id: c.id, at, lat, lng }; }
  return { id: c.id, at: null, lat: c.lat, lng: c.lng };
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      if (i >= tries || res.status < 429) throw new Error(`${res.status} ${url}`);
    } catch (err) { if (i >= tries) throw err; }
    await wait(5000 * i);
  }
}

// The height of each point, 100 at a time
const height = new Map();
for (let i = 0; i < points.length; i += 100) {
  const batch = points.slice(i, i + 100);
  const r = await get(`https://api.open-meteo.com/v1/elevation?latitude=${batch.map((p) => p.lat).join(",")}&longitude=${batch.map((p) => p.lng).join(",")}`);
  batch.forEach((p, j) => height.set(p.id, Math.max(0, r.elevation[j])));
}

const round = (n) => Math.round(n);
function rate(high, rain) {
  if (high < 7 || high > 37 || rain > 280) return "B";
  if (high >= 17 && high <= 33 && rain <= 160) return "G";
  return "O";
}

// NASA's monthly averages for each point are kept in node_modules/.cache, so changing the rating or the
// heights needs no new downloads. Delete the file to fetch everything afresh.
const CACHE = new URL("../node_modules/.cache/weather-nasa.json", import.meta.url);
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE)) : {};
const saveCache = () => { mkdirSync(new URL(".", CACHE), { recursive: true }); writeFileSync(CACHE, JSON.stringify(cache)); };

// { cell: the height NASA's grid square is taken at, m: 12 × [high, low, rain a day] }
async function nasa(p) {
  const key = `${p.lat},${p.lng}`;
  if (cache[key]) return cache[key];
  const r = await get(`https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR&community=RE&latitude=${p.lat}&longitude=${p.lng}&start=20150101&end=20241231&format=JSON`, 8);
  const d = r.properties.parameter;
  const sum = Array.from({ length: 12 }, () => ({ high: 0, low: 0, rain: 0, days: 0 }));
  for (const day of Object.keys(d.T2M_MAX)) {
    const [hi, lo, rain] = [d.T2M_MAX[day], d.T2M_MIN[day], d.PRECTOTCORR[day]];
    if ([hi, lo, rain].includes(-999)) continue;
    const m = sum[+day.slice(4, 6) - 1];
    m.high += hi; m.low += lo; m.rain += rain; m.days++;
  }
  cache[key] = { cell: r.geometry.coordinates[2], m: sum.map((m) => [m.high / m.days, m.low / m.days, m.rain / m.days]) };
  saveCache();
  return cache[key];
}

const out = {}, report = [];
let done = 0;
async function one(p) {
  const { cell, m: avg } = await nasa(p);
  const fix = (cell - height.get(p.id)) * 0.0065;
  const best = written[p.id]?.best;
  const months = avg.map(([h, l, r], i) => {
    const high = h + fix, low = l + fix, rain = r * [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i];
    let score = rate(round(high), round(rain)); // on the figures shown, so the same figures always rate the same
    if (best?.length) score = best.includes(i + 1) ? "G" : score === "G" ? "O" : score;
    return [round(high), round(low), round(rain), score];
  });
  if (best?.length) {
    const said = months.map((m, i) => rate(...[m[0], m[2]]) === "G" ? i + 1 : 0).filter(Boolean);
    const agree = best.filter((m) => said.includes(m)).length;
    report.push(`${p.id}: written ${best.join(",")} · figures ${said.join(",") || "none"} (${agree}/${best.length})`);
  }
  out[p.id] = p.at ? { at: p.at, m: months } : { m: months };
  if (++done % 25 === 0) console.log(`${done}/${points.length}`);
}

// A few at a time, to be kind to NASA's service
const queue = [...points], failed = [];
await Promise.all(Array.from({ length: 2 }, async () => {
  for (let p; (p = queue.shift());) { try { await one(p); } catch (err) { failed.push(`${p.id}: ${err.message}`); } }
}));

// Never a part-built file: a failure leaves the last one as it was
if (failed.length) { console.error(`Failed, so weather.json is unchanged. Run it again to carry on:\n${failed.join("\n")}`); process.exit(1); }
const sorted = Object.fromEntries(countries.filter((c) => out[c.id]).map((c) => [c.id, out[c.id]]));
writeFileSync(new URL("../docs/data/weather.json", import.meta.url),
  "{\n" + Object.entries(sorted).map(([id, w]) => `${JSON.stringify(id)}:${JSON.stringify(w)}`).join(",\n") + "\n}\n");
console.log(`Weather for ${Object.keys(sorted).length} of ${countries.length} destinations`);
if (process.argv.includes("--report")) console.log(report.join("\n"));
