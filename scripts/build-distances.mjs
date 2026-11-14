// Works out the distance between every two places that are within 500 km of each other, for the trip planner.
// Run with `npm run build:distances` after adding or moving places in docs/data/guides.json.
// Straight-line distances are calculated here. Road distances and driving times come from the public OSRM
// routing server, which uses OpenStreetMap data. Pairs with no road between them (across the sea) get none.
import { readFileSync, writeFileSync } from "node:fs";
import { geoDistance } from "d3";

const RADIUS_KM = 500;
const guides = JSON.parse(readFileSync(new URL("../docs/data/guides.json", import.meta.url)));
const places = Object.entries(guides).flatMap(([id, guide]) => (guide.places || []).map((p) => ({ key: `${id}/${p.id}`, name: p.name, lat: p.lat, lng: p.lng })));
const km = (a, b) => geoDistance([places[a].lng, places[a].lat], [places[b].lng, places[b].lat]) * 6371;
const near = places.map((_, i) => places.map((_, j) => j).filter((j) => j !== i && km(i, j) <= RADIUS_KM));

// The routing server takes at most 100 places in a request, and answers for one part of the world at a time: in a
// request that mixes regions, the places outside one of them come back with no roads. So places are asked about
// in groups that lie close together. First, the sets of places joined up by hops of 500 km or less.
const groups = [], grouped = new Set();
places.forEach((_, start) => {
  if (grouped.has(start)) return;
  const set = [start];
  grouped.add(start);
  for (const i of set) for (const j of near[i]) if (!grouped.has(j)) { grouped.add(j); set.push(j); }
  // A set too big for one request is cut into groups of up to 50, each around its westernmost place still left
  const left = new Set(set);
  while (left.size) {
    const seed = [...left].reduce((a, b) => (places[b].lng < places[a].lng ? b : a));
    const group = set.length <= 100 ? [...left]
      : [seed, ...near[seed].filter((j) => left.has(j)).sort((a, b) => km(seed, a) - km(seed, b)).slice(0, 49)];
    group.forEach((i) => left.delete(i));
    groups.push(group);
  }
});

// One request for each group, and one for each two groups with places within 500 km of each other
const requests = [];
groups.forEach((a, n) => {
  if (a.length > 1) requests.push(a);
  for (const b of groups.slice(n + 1)) if (a.some((i) => near[i].some((j) => b.includes(j)))) requests.push([...a, ...b]);
});

const routes = new Map(); // "i j" -> the two places' road distance and driving time, where the server found both
const covered = new Set();
let asked = 0;
async function ask(all) {
  process.stdout.write(`\rAsking the routing server: ${++asked}`);
  const url = `https://router.project-osrm.org/table/v1/driving/${all.map((i) => `${places[i].lng},${places[i].lat}`).join(";")}?annotations=duration,distance`;
  const part = await fetch(url).then((r) => r.json());
  if (part.code !== "Ok") throw new Error(`Routing failed: ${part.code} ${part.message || ""}`);
  // A place the server could only match to a road a long way off is outside the region it answered for
  const ok = part.sources.map((s) => s.distance < 10000);
  all.forEach((i, a) => {
    if (ok[a]) covered.add(i);
    all.forEach((j, b) => {
      if (j <= i || !ok[a] || !ok[b] || part.distances[a][b] == null || part.distances[b][a] == null) return;
      // Both directions are averaged
      routes.set(`${i} ${j}`, { metres: (part.distances[a][b] + part.distances[b][a]) / 2, seconds: (part.durations[a][b] + part.durations[b][a]) / 2 });
    });
  });
  await new Promise((done) => setTimeout(done, 1000)); // the public server asks for no more than a request a second
}
for (const all of requests) await ask(all);

// A group can still straddle two of the server's regions (Morocco is within 500 km of Spain), which leaves one
// side with nothing. Those places are asked about again, on their own.
const left = new Set(places.map((_, i) => i).filter((i) => near[i].length && !covered.has(i)));
for (const start of [...left]) {
  if (!left.has(start)) continue;
  const set = [start];
  left.delete(start);
  for (const i of set) for (const j of near[i]) if (left.has(j)) { left.delete(j); set.push(j); }
  for (let n = 0; n < set.length; n += 100) if (set.length > 1) await ask(set.slice(n, n + 100));
}
process.stdout.write("\n");
// Only places with others in reach were asked about
const missing = places.filter((p, i) => near[i].length && !covered.has(i)).map((p) => p.name);

const out = {};
let withRoad = 0;
places.forEach((a, i) => near[i].forEach((j) => {
  if (j <= i) return;
  const straight = km(i, j), route = routes.get(`${i} ${j}`);
  // A "road" far longer than the straight line, or far slower than driving, is a ferry crossing or a detour
  // round the sea: left out.
  const road = route && route.metres / 1000 < straight * 1.6 + 20 && route.metres / 1000 / (route.seconds / 3600) > 35;
  if (road) withRoad++;
  out[[a.key, places[j].key].sort().join(" ")] = road
    ? { km: Math.round(straight), roadKm: Math.round(route.metres / 1000), driveHours: Math.round(route.seconds / 360) / 10 }
    : { km: Math.round(straight) };
}));

const lines = Object.entries(out).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => `  ${JSON.stringify(key)}: ${JSON.stringify(v)}`);
writeFileSync(new URL("../docs/data/distances.json", import.meta.url), `{\n${lines.join(",\n")}\n}\n`);
if (missing.length) console.log(`No road data for: ${missing.join(", ")}`);
console.log(`${places.length} places, ${lines.length} pairs within ${RADIUS_KM} km, ${withRoad} with a road route`);
