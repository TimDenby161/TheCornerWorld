// The Corner World: the destination guides and the trip planner, and what the globe shows of them.
// The globe itself (drawing, dragging, zooming) is assets/globe.js.
// Data: data/world.json (map shapes), data/countries.json (basic facts, both built by
// scripts/build-data.mjs), data/guides.json (the hand-written guides) and data/site.json (settings).
// Top 3 things to do in each country: data/activities.json (hand-written).
// The weather month by month: data/weather.json (built by scripts/build-weather.mjs).
// Scores out of 10 for each country: data/ratings.json (hand-written, or with npm run rate).
// Journeys: data/legs.json (hand-written), data/distances.json and data/airports.json (both built).
(function () {
"use strict";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CHECKLIST = [
  ["passport", "Passports valid for the whole trip (many countries ask for six months beyond it)"],
  ["entry", "Entry requirements and visas checked for every stop"],
  ["insurance", "Travel insurance bought"],
  ["health", "Vaccinations and health advice checked"],
  ["flights", "Flights booked"],
  ["stay", "Accommodation booked"],
  ["transport", "Car hire, trains or internal flights booked"],
  ["money", "Cards and cash sorted"],
];
const TRIP_KEY = "tcw.trip";
const PLACE_TYPES = { city: "City", landmark: "Landmark", place: "Place" };
const TRAVEL_BY = { train: "by train", car: "by car", bus: "by bus", plane: "by plane", ferry: "by ferry", boat: "by boat" };
// Where the globe turns to when a part of the world is chosen: the middle, and the angle across it (radians)
const REGIONS = {
  Africa: { lng: 18, lat: 3, r: 0.78 }, Americas: { lng: -82, lat: 8, r: 1.25 }, Asia: { lng: 95, lat: 30, r: 0.85 },
  Europe: { lng: 14, lat: 51, r: 0.42 }, Oceania: { lng: 150, lat: -24, r: 0.62 },
};
// Line icons, drawn on a 24 by 24 grid
const ICONS = {
  search: "M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM21 21l-4.3-4.3",
  back: "M19 12H5M11 18l-6-6 6-6",
  next: "M9 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  play: "M7 5l12 7-12 7z",
  stop: "M7 7h10v10H7z",
  up: "M6 15l6-6 6 6",
  down: "M6 9l6 6 6-6",
  close: "M18 6L6 18M6 6l12 12",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  person: "M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0",
};

const $ = (sel) => document.querySelector(sel);
const panel = $("#panel"), stage = $("#globe"), sheet = $("#sheet"), tip = $("#tip");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone = matchMedia("(max-width: 820px)");
// The trip planner (My trip, "Add to my trip", ready-made routes to use) is switched off for now: the map is
// for reading about places. Set this to true to bring it all back; the trip saved in a browser is kept meanwhile.
const TRIP_PLANNER = false;

let countries = [], byId = new Map(), guides = {}, ratings = { categories: [], scores: {} }, activities = {}, weather = {}, legs = new Map(), distances = {}, airports = { airports: {}, places: {} }, site = { currency: "GBP", contactEmail: "", partners: [], planning: {} };
let money = (n) => String(n);

// A country's scores: { parts: [food, activities, budget, family, safety], overall } with overall the
// average to one decimal place. A state or island without its own takes its country's. Null if unscored.
function scoreOf(c) {
  const parts = c && (ratings.scores[c.id] || ratings.scores[c.within]);
  if (!parts?.length) return null;
  return { parts, overall: Math.round(parts.reduce((a, b) => a + b, 0) / parts.length * 10) / 10 };
}
// Score to colour, as on the map (SCORE_STOPS in assets/globe.js): red for the lowest to green for the highest.
// Read from the theme each time, so it follows light and dark.
function scoreScale() {
  const css = getComputedStyle($("#globe") || document.body);
  return d3.scaleLinear().domain([2.5, 5, 6.5, 8.5]).range(["--g-s1", "--g-s2", "--g-s3", "--g-s4"].map((v) => css.getPropertyValue(v).trim())).interpolate(d3.interpolateRgb).clamp(true);
}
const scoreText = (n) => n.toFixed(1);
function scoreBadge(score, colour) {
  // Styles go on through the DOM: the security policy blocks style="" attributes
  const badge = h("span", { class: "score", title: `Scores ${scoreText(score.overall)} out of 10`, text: scoreText(score.overall) });
  badge.style.setProperty("--score", colour);
  return badge;
}
let trip = emptyTrip();
let globe = null;
const pinOf = new Map();
const state = { tab: "discover", info: "todo", selected: null, place: null, query: "", sort: "score", month: 0, budget: 0, region: "", tags: new Set(), build: { ids: [], nights: 10 }, scroll: 0 };

// ---------- small helpers ----------

// Builds an element. Text always goes in as text, never as HTML: trip names and notes can arrive in a shared link.
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}

function icon(name) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg"), path = document.createElementNS(NS, "path");
  svg.setAttribute("class", `ic ic-${name}`); svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
  path.setAttribute("d", ICONS[name]);
  svg.append(path);
  return svg;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const wait = (ms) => new Promise((done) => setTimeout(done, ms));

// [3,4,5,9,10,11] -> "Mar–May, Sep–Nov"; runs that cross the new year stay joined ("Oct–Mar")
function monthRanges(months) {
  const on = MONTHS.map((_, i) => months.includes(i + 1));
  if (on.every(Boolean)) return "All year";
  const runs = [];
  for (let i = 0; i < 12; i++) {
    if (!on[i] || on[(i + 11) % 12]) continue;
    let j = i;
    while (on[(j + 1) % 12]) j = (j + 1) % 12;
    runs.push(i === j ? MONTHS[i] : `${MONTHS[i]}–${MONTHS[j]}`);
  }
  return runs.join(", ");
}

const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const fullFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

let toastTimer;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

// A yes-or-no question in the page's own style. Resolves true for yes. `danger` marks a yes that destroys something.
function ask(message, yes, danger) {
  return new Promise((resolve) => {
    const box = h("dialog", { class: "ask" },
      h("p", { text: message }),
      h("div", { class: "actions" },
        h("button", { type: "button", class: "small", text: "Cancel", onclick: () => box.close("no") }),
        h("button", { type: "button", class: danger ? "primary danger" : "primary", text: yes, onclick: () => box.close("yes") })));
    box.addEventListener("close", () => { box.remove(); resolve(box.returnValue === "yes"); });
    document.body.append(box);
    box.showModal();
  });
}

// ---------- the trip ----------

function emptyTrip() { return { name: "", start: "", travellers: 2, stops: [], checks: {} }; }

// Anything read from storage or a shared link is rebuilt field by field, so only known shapes get through
function cleanTrip(raw) {
  const t = emptyTrip();
  if (!raw || typeof raw !== "object") return t;
  if (typeof raw.name === "string") t.name = raw.name.slice(0, 80);
  if (typeof raw.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.start)) t.start = raw.start;
  if (Number.isFinite(raw.travellers)) t.travellers = clamp(Math.round(raw.travellers), 1, 20);
  for (const s of Array.isArray(raw.stops) ? raw.stops.slice(0, 40) : []) {
    if (!s || !byId.has(s.id)) continue;
    const place = (guides[s.id]?.places || []).find((p) => p.id === s.place);
    t.stops.push({ id: s.id, place: place ? place.id : null, nights: clamp(Math.round(Number(s.nights)) || 1, 1, 90) });
  }
  for (const [key] of CHECKLIST) if (raw.checks && raw.checks[key] === true) t.checks[key] = true;
  return t;
}

function saveTrip() {
  try { localStorage.setItem(TRIP_KEY, JSON.stringify(trip)); } catch { /* storage blocked: the trip lasts for this visit */ }
  const count = $("#trip-count");
  count.textContent = trip.stops.length;
  count.hidden = !trip.stops.length;
  drawTrip();
  paint();
  if (syncing) queuePush();
}

function stopInfo(stop) {
  const country = byId.get(stop.id);
  const guide = guides[stop.id];
  const place = stop.place ? guide.places.find((p) => p.id === stop.place) : null;
  return {
    country, guide, place,
    name: place ? place.name : country.name,
    label: place ? `${place.name}, ${country.name}` : country.name,
    lat: place ? place.lat : country.lat,
    lng: place ? place.lng : country.lng,
  };
}

function addStop(id, placeId) {
  const guide = guides[id];
  const place = placeId ? guide.places.find((p) => p.id === placeId) : null;
  trip.stops.push({ id, place: place ? place.id : null, nights: place ? place.nights || 2 : guide?.nights?.[0] || 3 });
  saveTrip();
  const count = $("#trip-count");
  count.classList.remove("bump"); void count.offsetWidth; count.classList.add("bump");
  toast(`Added ${place ? place.name : byId.get(id).name} to your trip`);
}

async function useItinerary(id, itinerary) {
  if (trip.stops.length && !await ask("Replace the stops already in your trip?", "Replace")) return;
  trip.stops = itinerary.stops.map((s) => ({ id, place: s.place, nights: s.nights }));
  if (!trip.name) trip.name = `${byId.get(id).name}: ${itinerary.name}`;
  globe.preview(null);
  saveTrip();
  showTab("trip");
}

// The airports for a place, from data/airports.json: [{ code, name, city, lat, lng, size, km }], the one to fly from first
function airportsFor(id, place) {
  return (airports.places[`${id}/${place}`] || []).map(([code, km]) => ({ code, km, ...airports.airports[code] }));
}


// How to get from one stop to the next: { by, hours, km, note }. Journeys written in data/legs.json come first.
// Next is the driving time worked out from the roads (data/distances.json, for places within 500 km). Anything
// else is estimated from the straight-line distance, by road if close enough and by plane if not, and marked
// as an estimate. A flight is timed between the two places' airports, and carries them as `fly`; whether an
// airline flies between them is not known.
function travel(a, b) {
  const key = (a.place && b.place) ? [`${a.id}/${a.place}`, `${b.id}/${b.place}`].sort().join(" ") : "";
  const from = stopInfo(a), to = stopInfo(b);
  const measured = distances[key];
  const straight = measured?.km ?? Math.round(d3.geoDistance([from.lng, from.lat], [to.lng, to.lat]) * 6371);
  const [out, back] = [a, b].map((s) => airportsFor(s.id, s.place)[0]);
  const fly = out && back && out.code !== back.code ? [out, back] : null;
  if (legs.has(key)) { const leg = legs.get(key); return { ...leg, km: leg.by === "plane" ? straight : measured?.roadKm ?? straight, fly: leg.by === "plane" ? fly : null }; }
  if (measured?.driveHours) return { by: "car", hours: measured.driveHours, km: measured.roadKm, rough: true };
  const half = (hours) => Math.max(0.5, Math.round(hours * 2) / 2);
  // Two places that share an airport are not a flight apart, however far
  if (straight < 500 || (out && back && !fly)) return { by: "car", hours: half((straight * 1.3) / 65), km: straight, rough: true, estimate: true };
  if (!fly) return { by: "plane", hours: half(straight / 800 + 0.5), km: straight, rough: true, estimate: true };
  const air = d3.geoDistance([out.lng, out.lat], [back.lng, back.lat]) * 6371;
  return { by: "plane", hours: half(air / 800 + 0.5), km: straight, rough: true, estimate: true, fly,
    note: fly.map((p) => `${p.city || p.name} (${p.code})`).join(" to ") };
}

// 0.75 -> "45 minutes", 1 -> "1 hour", 2.25 -> "2¼ hours"
function hoursText(hours) {
  const quarters = Math.max(1, Math.round(hours * 4));
  if (quarters < 4) return `${quarters * 15} minutes`;
  return `${Math.floor(quarters / 4)}${["", "¼", "½", "¾"][quarters % 4]} ${quarters === 4 ? "hour" : "hours"}`;
}

// "2 hours by train from London (114 km)", or "About 3 hours by car from Hue (120 km, estimate)"
function travelText(leg, from) {
  const text = `${hoursText(leg.hours)} ${TRAVEL_BY[leg.by] || ""} from ${from}`.replace("  ", " ");
  const km = `${leg.km.toLocaleString("en-GB")} km`;
  return `${leg.rough ? "About " : ""}${text} (${leg.estimate ? `${km}, estimate` : km})`;
}

// The named places in a destination. A country offers its states' places as well as its own.
function placesIn(id) {
  const c = byId.get(id);
  return [c, ...c.parts].flatMap((r) => (guides[r.id]?.places || []).map((place) => ({ id: r.id, place })));
}

// Builds a trip of the given length from the places in the chosen destinations. The most important places
// (rank 1, then 2, then 3) go in first, each for its suggested nights, taking turns between destinations until
// the nights run out. Spare nights are then shared out, and the stops put in the quickest order to travel.
function buildTrip(ids, nights) {
  const seen = new Set();
  const pool = ids.flatMap((id, turn) => placesIn(id).map((s, i) => ({ ...s, turn, i })))
    .filter((s) => !seen.has(`${s.id}/${s.place.id}`) && seen.add(`${s.id}/${s.place.id}`))
    .sort((a, b) => (a.place.rank || 2) - (b.place.rank || 2) || a.i - b.i || a.turn - b.turn);
  const want = (s) => s.place.nights || 1;

  let left = nights;
  const picked = [];
  for (const s of pool) {
    if (left < 1 || picked.length === 40) break;
    s.nights = Math.min(want(s), left);
    left -= s.nights;
    picked.push(s);
  }
  // Spare nights go round one at a time, up to double what each place suggests
  for (let gave = true; left > 0 && gave;) {
    gave = false;
    for (const s of picked) if (left > 0 && s.nights < want(s) * 2) { s.nights++; left--; gave = true; }
  }

  // The quickest route found by starting from each stop and always going to the nearest next, then uncrossed.
  // "Nearest" is by travel time.
  // A flight also costs three hours for the airports, and two more for each end that is not a city. Crossing
  // into another country costs four, so a destination's places stay together.
  const nation = (s) => byId.get(s.id).within || s.id;
  const far = (a, b) => {
    const leg = travel({ id: a.id, place: a.place.id }, { id: b.id, place: b.place.id });
    const airports = leg.by === "plane" ? 3 + [a, b].filter((s) => s.place.type !== "city").length * 2 : 0;
    return leg.hours + airports + (nation(a) === nation(b) ? 0 : 4);
  };
  const length = (route) => route.reduce((sum, s, i) => sum + (i ? far(route[i - 1], s) : 0), 0);
  let route = picked;
  for (const first of picked) {
    const rest = picked.filter((s) => s !== first), tour = [first];
    while (rest.length) {
      const last = tour[tour.length - 1];
      tour.push(...rest.splice(rest.indexOf(rest.reduce((a, b) => (far(last, b) < far(last, a) ? b : a))), 1));
    }
    if (route === picked || length(tour) < length(route)) route = tour;
  }
  for (let better = true; better;) {
    better = false;
    for (let i = 0; i < route.length - 1; i++) for (let j = i + 1; j < route.length; j++) {
      const flipped = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
      if (length(flipped) < length(route) - 1e-9) { route = flipped; better = true; }
    }
  }
  // Trips usually begin where the flights land: in a city, if only one end of the route is one
  const city = (s) => s?.place.type === "city";
  if (!city(route[0]) && city(route[route.length - 1])) route.reverse();

  return { stops: route.map((s) => ({ id: s.id, place: s.place.id, nights: s.nights })), spare: left };
}

// The trip packed into a link. Short keys keep the address manageable.
function tripToHash() {
  const json = JSON.stringify({ n: trip.name, s: trip.start, t: trip.travellers, p: trip.stops.map((s) => [s.id, s.place || "", s.nights]) });
  const bytes = new TextEncoder().encode(json);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function tripFromHash(text) {
  try {
    const bytes = Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (ch) => ch.charCodeAt(0));
    const raw = JSON.parse(new TextDecoder().decode(bytes));
    return cleanTrip({ name: raw.n, start: raw.s, travellers: raw.t, stops: (raw.p || []).map(([id, place, nights]) => ({ id, place, nights })) });
  } catch { return null; }
}

// Each stop with its dates worked out, plus the totals
function tripPlan() {
  const start = trip.start ? parseDate(trip.start) : null;
  let offset = 0, cost = 0, costed = 0;
  const stops = trip.stops.map((stop) => {
    const info = stopInfo(stop);
    const arrive = start ? addDays(start, offset) : null;
    const leave = start ? addDays(start, offset + stop.nights) : null;
    offset += stop.nights;
    if (info.guide?.budgetPerDay) { cost += info.guide.budgetPerDay * stop.nights * trip.travellers; costed++; }
    const best = info.guide?.bestMonths;
    const offSeason = arrive && best && !best.includes(arrive.getUTCMonth() + 1)
      ? `${MONTHS_LONG[arrive.getUTCMonth()]} is outside the usual best months for ${info.country.name} (${monthRanges(best)}).`
      : "";
    return { stop, info, arrive, leave, offSeason };
  });
  return { stops, nights: offset, start, end: start ? addDays(start, offset) : null, cost, costed };
}

function tripAsText() {
  const plan = tripPlan();
  const lines = [trip.name || "My trip"];
  if (plan.start) lines.push(`${fullFmt.format(plan.start)} to ${fullFmt.format(plan.end)}`);
  lines.push(`${plural(trip.travellers, "traveller")}, ${plural(plan.nights, "night")}`, "");
  plan.stops.forEach((s, i) => {
    const dates = s.arrive ? ` (${dayFmt.format(s.arrive)} to ${dayFmt.format(s.leave)})` : "";
    if (i) { const leg = travel(plan.stops[i - 1].stop, s.stop); lines.push(`   ${[travelText(leg, plan.stops[i - 1].info.name), leg.note].filter(Boolean).join(": ")}`); }
    lines.push(`${i + 1}. ${s.info.label}: ${plural(s.stop.nights, "night")}${dates}`);
  });
  return lines.join("\n");
}

// ---------- booking links ----------

const DISCLOSURE = "Some links earn The Corner World a commission if you book, at no extra cost to you.";
const isoDay = (date) => date.toISOString().slice(0, 10);

// The partners in site.json as links for a country or one of its places, with the {gaps} in their addresses
// filled in. The dates are only known inside a trip. scripts/build-pages.mjs does the same for the guide pages.
function partnerLinks(country, place, stay) {
  const fill = {
    place: place ? `${place.name}, ${country.name}` : country.name,
    country: country.name,
    checkin: stay?.arrive ? isoDay(stay.arrive) : "",
    checkout: stay?.leave ? isoDay(stay.leave) : "",
    travellers: stay ? trip.travellers : "",
  };
  return (site.partners || []).map((p) => ({
    label: p.label,
    url: String(p.url || "").replace(/\{(\w+)\}/g, (gap, key) => (key in fill ? encodeURIComponent(fill[key]) : gap)),
  }));
}

// A row of booking links: the partners' and any written into the guide. Nothing if there are none.
function bookRow(...links) {
  const good = links.flat().filter((l) => l && l.label && /^https:\/\//.test(l.url));
  return good.length ? h("p", { class: "book-links" }, good.map((l) =>
    h("a", { class: "book", href: l.url, target: "_blank", rel: "sponsored noopener", text: l.label }))) : null;
}

// Wherever booking links are on show, the page says they pay
function disclose(box, before) {
  if (box.querySelector(".book")) before.before(h("p", { class: "disclosure", text: DISCLOSURE }));
}

// ---------- the map ----------

// Where to point the map to take in a country: the middle of its largest landmass and the angle across it
// (in radians), so far-off territories don't pull the view out to the whole world.
// A country is framed to fill about 80% of the free map: its outline's circle is padded by a tenth, so near 1 (the circle overstates most shapes)
function frameOf(country) {
  if (country.frame) return country.frame;
  // A country drawn mostly as its states is framed by its size, as is one too small for a shape
  const spread = country.parts.reduce((sum, part) => sum + part.area, 0) > country.area / 2;
  const bySize = { lng: country.lng, lat: country.lat, r: clamp(Math.sqrt(country.area / Math.PI) / 6371 * 1.8, 0.004, 1.3), fill: 1 };
  if (!country.features.length || spread) return (country.frame = bySize);
  const polygons = country.features.flatMap((f) => f.geometry.type === "MultiPolygon"
    ? f.geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }))
    : [f.geometry]);
  // A ring squashed flat by the map's simplification can read as "everything but this island": skip those
  const sized = polygons.map((p) => [p, d3.geoArea(p)]).filter(([, area]) => area < Math.PI);
  if (!sized.length) return (country.frame = bySize);
  const main = sized.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const middle = d3.geoCentroid(main);
  const r = Math.max(...main.coordinates[0].map((point) => d3.geoDistance(middle, point)));
  return (country.frame = { lng: middle[0], lat: middle[1], r: Math.max(r * 1.1, 0.004), fill: 1 });
}

function buildMap(world) {
  const features = topojson.feature(world, world.objects.countries).features;
  const byKey = new Map(countries.filter((c) => c.key).map((c) => [c.key, c]));
  for (const f of features) {
    f.country = byKey.get(f.id ?? f.properties.name) || null;
    if (f.country) f.country.features.push(f);
  }

  // Countries too small to click (or missing from the map at this detail) get a dot
  const dots = countries.filter((c) => c.capital && !c.parts.length && (!c.features.length || c.area < 2500)).map((c) => ({ country: c, lng: c.lng, lat: c.lat }));
  const pins = Object.entries(guides).filter(([id]) => byId.has(id)).flatMap(([id, guide]) => (guide.places || []).map((place, order) => ({ id, place, order, name: place.name, lng: place.lng, lat: place.lat })));
  for (const pin of pins) pinOf.set(`${pin.id}/${pin.place.id}`, pin);

  // A name for every country and state with a shape. A country drawn as its states gives way to their
  // names once there is room for them. Where a name goes is the middle of the country's shape, which
  // takes a while to work out, so the globe asks (`at`) the first time it has room to write the name.
  const names = new Map();
  for (const c of countries) {
    if (!c.features.length && !c.parts.length) continue;
    names.set(c.id, { text: c.name.toUpperCase(), at: () => frameOf(c), r: Math.sqrt(c.area / Math.PI) / 6371 });
  }
  for (const c of countries) {
    if (!names.has(c.id) || c.parts.reduce((sum, part) => sum + part.area, 0) <= c.area / 2) continue;
    const name = names.get(c.id);
    name.kids = c.parts.map((part) => names.get(part.id)).filter(Boolean);
    for (const kid of name.kids) kid.parent = name;
  }

  globe = createGlobe({
    wrap: stage, base: $("#map-base"), over: $("#map-over"), topology: world, object: "countries", features, dots, pins, labels: [...names.values()], reducedMotion,
    on: {
      pick(target) {
        if (!target) return;
        if (target.type === "country") select(target.country.id);
        else if (target.type === "place") select(target.pin.id, { place: target.pin.place.id });
        else if (target.type === "stop") { if (state.tab !== "trip") showTab("trip"); flash(`.stops li[data-i="${target.index}"]`); }
      },
      hover: showTip,
      interact() { hideHint(); stopTour(); },
    },
  });

  $("#zoom-in").addEventListener("click", () => globe.zoomBy(1.8));
  $("#zoom-out").addEventListener("click", () => globe.zoomBy(1 / 1.8));
  $("#zoom-reset").addEventListener("click", () => { hideHint(); globe.home(); });
  const views = $("#view-seg");
  for (const btn of views.querySelectorAll("button")) btn.addEventListener("click", () => {
    globe.setMode(btn.dataset.view);
    views.dataset.on = globe.mode === "flat" ? 1 : 0;
    for (const b of views.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.view === globe.mode));
    hideHint();
  });
  $("#surprise").addEventListener("click", surprise);
}

// The card that follows the pointer over the map: what this is, and what a click will do
let tipKey = "";
function showTip(target, x, y) {
  const key = !target ? "" : target.type === "country" ? `c${target.country.id}` : target.type === "place" ? `p${target.pin.id}/${target.pin.place.id}` : target.type === "airport" ? `a${target.airport.code}` : `s${target.index}`;
  if (key !== tipKey) {
    tipKey = key;
    for (const el of panel.querySelectorAll(".lit")) el.classList.remove("lit");
    if (!target) { tip.hidden = true; return; }
    tip.replaceChildren(...tipLines(target));
    tip.hidden = false;
    const row = target.type === "country" ? `[data-id="${target.country.id}"]` : target.type === "place" ? `[data-place="${target.pin.place.id}"]` : target.type === "stop" ? `.stops li[data-i="${target.index}"]` : "";
    if (row) panel.querySelector(row)?.classList.add("lit");
  }
  if (!target) return;
  const box = stage.getBoundingClientRect(), right = phone.matches ? box.width : sheet.getBoundingClientRect().left - box.left;
  const w = tip.offsetWidth, tall = tip.offsetHeight;
  const left = x + 18 + w > right - 8 ? x - w - 14 : x + 18, top = y + 18 + tall > box.height - 8 ? y - tall - 12 : y + 18;
  tip.style.transform = `translate(${Math.max(8, left)}px, ${Math.max(8, top)}px)`;
}

function tipLines(target) {
  const line = (cls, text) => text && h("p", { class: cls, text });
  if (target.type === "country") {
    const c = target.country, g = guides[c.id], whole = byId.get(c.within);
    const meta = g && [g.places?.length && plural(g.places.length, "place"), g.bestMonths && `best ${monthRanges(g.bestMonths)}`, g.budgetPerDay && `about ${money(g.budgetPerDay)} a day`].filter(Boolean).join(" · ");
    return [
      h("p", { class: "tip-title" }, h("span", { class: "flag", text: c.flag, "aria-hidden": "true" }), c.name),
      line("tip-sub", whole ? [c.group, whole.name].filter(Boolean).join(", ") : c.subregion || c.region),
      line("tip-meta", meta),
      scoreOf(c) && h("p", { class: "tip-score" }, scoreBadge(scoreOf(c), scoreScale()(scoreOf(c).overall)), " out of 10"),
      h("p", { class: g ? "tip-go" : "tip-go none", text: g ? "Open the guide" : whole && guides[whole.id] ? `Covered by the ${whole.name} guide` : "No guide yet" }),
    ].filter(Boolean);
  }
  if (target.type === "place") {
    const { pin } = target, c = byId.get(pin.id);
    return [line("tip-title", pin.name), line("tip-sub", [PLACE_TYPES[pin.place.type], c.name].filter(Boolean).join(" · ")), line("tip-text", pin.place.blurb)].filter(Boolean);
  }
  if (target.type === "airport") {
    const a = target.airport;
    return [line("tip-title", `${a.name} (${a.code})`), line("tip-sub", a.city && !a.name.includes(a.city) ? a.city : "Airport")].filter(Boolean);
  }
  const s = tripPlan().stops[target.index];
  if (!s) return [];
  return [line("tip-title", `${target.index + 1}. ${s.info.name}`),
    line("tip-sub", [plural(s.stop.nights, "night"), s.arrive && `${dayFmt.format(s.arrive)} to ${dayFmt.format(s.leave)}`].filter(Boolean).join(" · "))];
}

// Draws attention to a row in the panel: scrolls to it and lights it for a moment
function flash(selector) {
  const row = panel.querySelector(selector);
  if (!row) return;
  row.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash");
}

let hinted = false;
function hideHint() {
  if (hinted) return;
  hinted = true;
  $("#hint").classList.add("gone");
}

// Frames the whole route when the trip is opened
function fitTrip() {
  if (trip.stops.length) globe.fit(trip.stops.map(stopInfo));
}

function filtersActive() { return Boolean(state.query.trim() || state.month || state.budget || state.region || state.tags.size); }

function matches(id) {
  const guide = guides[id];
  if (!guide) return false;
  const q = state.query.trim().toLowerCase();
  if (q) {
    // The country box: a word in the country's name (or the country it is part of) starts with what was typed
    const c = byId.get(id), names = [c?.name, byId.get(c?.within)?.name].filter(Boolean);
    if (!names.some((n) => n.toLowerCase().split(/[\s-]+/).some((w) => w.startsWith(q)) || n.toLowerCase().startsWith(q))) return false;
  }
  if (state.month && !(guide.bestMonths || []).includes(state.month)) return false;
  if (state.budget && !(guide.budgetPerDay <= state.budget)) return false;
  if (state.region && byId.get(id)?.region !== state.region) return false;
  for (const tag of state.tags) if (!(guide.tags || []).includes(tag)) return false;
  return true;
}

// Colours the map: every country by its score, red to green (with a filter on, only the guides that match), the selection and the trip
function paint() {
  if (!globe) return;
  const active = filtersActive();
  const inTrip = new Set(trip.stops.map((s) => s.id));
  // A state is coloured for its country's guide, trip stops and selection as well as its own
  const either = (c, test) => test(c.id) || Boolean(c.within && test(c.within));
  const picked = (id) => id === state.selected;
  const fill = (c) => !c ? "none" : either(c, picked) ? "selected" : either(c, (id) => inTrip.has(id)) ? "trip"
    : active && !either(c, matches) ? "land" : scoreOf(c) ? `s${Math.round(scoreOf(c).overall * 10)}` : "land";
  globe.paint({
    fill: (f) => fill(f.country),
    selected: (f) => Boolean(f.country) && either(f.country, picked),
    dot: (d) => fill(d.country),
    showPin: (p) => either(byId.get(p.id), picked),
    activePin: (p) => p.id === state.selected && p.place.id === state.place,
  });
}

function drawTrip() {
  if (globe) globe.route(trip.stops.map(stopInfo));
}

// Pointing at a destination in a list lights it up on the map at once. If the pointer rests there, the map
// turns to show it. Scrolling the list past the pointer doesn't count as resting.
let peekTimer = 0, peekQuiet = 0;
function peekAt(c) {
  const light = () => globe.light({ type: "country", id: c.id, lng: c.lng, lat: c.lat });
  return {
    onpointerenter: (e) => {
      if (e.pointerType !== "mouse") return;
      light();
      clearTimeout(peekTimer);
      peekTimer = setTimeout(() => {
        if (performance.now() < peekQuiet) return;
        const at = frameOf(c);
        hideHint();
        globe.flyTo({ lng: at.lng, lat: at.lat, r: clamp(at.r * 2.6, 0.32, 1.3) }, { duration: 900 });
      }, 340);
    },
    onpointerleave: () => { clearTimeout(peekTimer); globe.light(null); },
    onfocus: light,
    onblur: () => globe.light(null),
  };
}
panel.addEventListener("scroll", () => {
  peekQuiet = performance.now() + 500; clearTimeout(peekTimer);
  sheet.classList.toggle("scrolled", panel.scrollTop > 4);
}, { passive: true });

// "Surprise me": the globe spins and lands on a guide. With filters on, it is one of the guides that match.
let spinning = false;
async function surprise() {
  if (spinning) return;
  const all = Object.keys(guides).filter((id) => byId.has(id) && id !== state.selected);
  const fitting = all.filter(matches);
  const pool = fitting.length ? fitting : all;
  const id = pool[Math.floor(Math.random() * pool.length)];
  hideHint(); stopTour();
  if (reducedMotion || globe.mode === "flat") return select(id);

  // While the globe spins, the button runs through names like a departures board
  spinning = true;
  const label = $("#surprise-text"), said = label.textContent, button = $("#surprise");
  button.classList.add("rolling");
  const roll = setInterval(() => { const c = byId.get(pool[Math.floor(Math.random() * pool.length)]); label.textContent = `${c.flag} ${c.name}`; }, 95);
  if (state.selected || state.tab !== "discover") { state.selected = state.place = null; state.tab = "discover"; paint(); showTab("discover"); }
  const landed = await globe.flyTo(frameOf(byId.get(id)), { spins: 1 });
  clearInterval(roll);
  spinning = false;
  if (landed) {
    const c = byId.get(id);
    label.textContent = `${c.flag} ${c.name}`;
    select(id, { arrived: true });
    await wait(1400);
  }
  button.classList.remove("rolling");
  label.textContent = said;
}

// "Play route": the map flies from stop to stop. Touching the map, or the button again, ends it.
let tour = null;
function stopTour() {
  if (!tour) return;
  tour = null;
  globe.light(null);
  const btn = $("#play");
  if (btn) btn.replaceChildren(icon("play"), "Play route");
}
async function playRoute() {
  if (tour) return stopTour();
  const mine = tour = {};
  hideHint();
  $("#play")?.replaceChildren(icon("stop"), "Stop");
  for (let i = 0; i < trip.stops.length && tour === mine; i++) {
    const info = stopInfo(trip.stops[i]);
    globe.light({ type: "stop", index: i });
    flash(`.stops li[data-i="${i}"]`);
    if (!await globe.flyTo({ lng: info.lng, lat: info.lat, ppd: 56 })) break;
    await wait(1200);
  }
  if (tour !== mine) return;
  stopTour();
  fitTrip();
}

// ---------- the panel, and the sheet it sits in on a phone ----------

// On a phone the panel is a sheet over the map that rests at three heights
const SNAPS = { peek: () => 124, half: () => Math.round(innerHeight * 0.47), full: () => innerHeight - 72 };
let snap = "half";

function setSnap(name, animate = true) {
  snap = name;
  sheet.dataset.snap = name;
  if (phone.matches) document.body.style.setProperty("--sheet-h", `${SNAPS[name]()}px`);
  else document.body.style.removeProperty("--sheet-h");
  setInsets(animate);
}

// Tells the map which part of the window is clear of the panel, so the globe sits in the middle of that
function setInsets(animate) {
  if (!globe) return;
  const box = stage.getBoundingClientRect();
  if (phone.matches) globe.insets({ top: 58, left: 0, right: 0, bottom: Math.min(SNAPS[snap](), box.height * 0.5) + 46 }, animate);
  else globe.insets({ top: 70, left: 8, right: box.right - sheet.getBoundingClientRect().left + 8, bottom: 80 }, animate);
}

function sheetDrag() {
  const head = $("#sheet-head");
  let drag = null, swallow = 0;
  head.addEventListener("pointerdown", (e) => {
    if (phone.matches) drag = { id: e.pointerId, y: e.clientY, h: sheet.getBoundingClientRect().height, moved: false, last: e.clientY, v: 0 };
  });
  // The pointer soon leaves the head it started on, so the rest of the drag is followed on the window
  addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) < 6) return;
    if (!drag.moved) { drag.moved = true; document.body.classList.add("sheet-drag"); }
    drag.v = e.clientY - drag.last; drag.last = e.clientY;
    document.body.style.setProperty("--sheet-h", `${clamp(drag.h - dy, 88, SNAPS.full())}px`);
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const was = drag; drag = null;
    if (!was.moved) return;
    document.body.classList.remove("sheet-drag");
    // A flick carries the sheet on to the next height
    const at = sheet.getBoundingClientRect().height - was.v * 14;
    setSnap(["peek", "half", "full"].reduce((a, b) => (Math.abs(SNAPS[b]() - at) < Math.abs(SNAPS[a]() - at) ? b : a)));
    swallow = performance.now() + 350;
  };
  addEventListener("pointerup", end);
  addEventListener("pointercancel", end);
  // A drag that began on a tab must not also press it
  head.addEventListener("click", (e) => { if (performance.now() < swallow) { e.stopPropagation(); e.preventDefault(); } }, true);
  head.querySelector(".grip").addEventListener("click", () => setSnap(snap === "full" ? "half" : snap === "half" ? "full" : "half"));
  phone.addEventListener("change", () => setSnap(snap, false));
  addEventListener("resize", () => setSnap(snap, false));
}

function showTab(tab) {
  if (tab === "trip" && state.tab !== "trip") fitTrip();
  if (tab !== "trip") stopTour();
  state.tab = tab;
  $("#tabs").dataset.on = tab === "trip" ? 1 : 0;
  for (const btn of document.querySelectorAll("#tabs button")) {
    if (btn.dataset.tab === tab) btn.setAttribute("aria-current", "page"); else btn.removeAttribute("aria-current");
  }
  if (phone.matches && snap === "peek") setSnap("half");
  render();
}

function select(id, opts = {}) {
  if (!state.selected && state.tab === "discover") state.scroll = panel.scrollTop;
  state.selected = id;
  state.place = opts.place || null;
  if (state.place) state.info = "todo";
  const country = byId.get(id);
  const place = state.place && guides[id].places.find((p) => p.id === state.place);
  hideHint();
  if (opts.arrived) { /* the map is already there */ }
  else if (place) globe.flyTo({ lng: place.lng, lat: place.lat, ppd: Math.max(globe.ppd, 48) });
  else globe.flyTo(frameOf(country));
  history.replaceState(null, "", `#c=${id}`);
  paint();
  showTab("discover");
  if (phone.matches && snap !== "half") setSnap("half");
}

function clearSelection() {
  state.selected = state.place = null;
  history.replaceState(null, "", location.pathname);
  globe.light(null);
  if (globe.k > 2.4) globe.home();
  paint();
  render();
  panel.scrollTop = state.scroll;
}

function render() {
  tipKey = ""; tip.hidden = true;
  if (state.tab === "trip") renderTrip();
  else if (state.selected) renderDestination();
  else renderDiscover();
  panel.scrollTop = 0;
  panel.classList.remove("swap"); void panel.offsetWidth; panel.classList.add("swap");
}

function renderDiscover() {
  const live = Object.keys(guides).filter((id) => byId.has(id));
  const tags = [...new Set(live.flatMap((id) => guides[id].tags || []))].sort();
  const regions = [...new Set(live.map((id) => byId.get(id).region))].filter((r) => REGIONS[r]).sort();
  const thisMonth = new Date().getMonth() + 1;

  // Every filter button is a toggle that knows how to show whether it is on
  const syncs = [];
  const refresh = () => { for (const sync of syncs) sync(); renderResults(); paint(); };
  const toggle = (label, isOn, flip, attrs) => {
    const btn = h("button", { type: "button", text: label, "aria-pressed": String(isOn()), ...attrs, onclick: () => { flip(); refresh(); } });
    syncs.push(() => btn.setAttribute("aria-pressed", String(isOn())));
    return btn;
  };

  const when = h("span", { class: "group-value" });
  syncs.push(() => { when.textContent = state.month ? MONTHS_LONG[state.month - 1] : "Any month"; });
  const months = h("div", { class: "month-bar", role: "group", "aria-label": "Best month to go" }, MONTHS.map((m, i) =>
    toggle(m.charAt(0), () => state.month === i + 1, () => { state.month = state.month === i + 1 ? 0 : i + 1; },
      { class: i + 1 === thisMonth ? "now" : "", title: MONTHS_LONG[i], "aria-label": MONTHS_LONG[i] })));
  const budget = h("div", { class: "seg-row", role: "group", "aria-label": "Budget per person" }, [0, 50, 100, 150].map((n) =>
    toggle(n ? `Up to ${money(n)}` : "Any", () => state.budget === n, () => { state.budget = n; })));
  const where = h("div", { class: "chips one-line", role: "group", "aria-label": "Part of the world" }, regions.map((r) =>
    toggle(r, () => state.region === r, () => {
      state.region = state.region === r ? "" : r;
      if (state.region) { hideHint(); globe.flyTo(REGIONS[r]); }
    }, { class: "chip" })));
  const chips = h("div", { class: "chips", role: "group", "aria-label": "Interests" }, tags.map((tag) =>
    toggle(tag, () => state.tags.has(tag), () => { if (state.tags.has(tag)) state.tags.delete(tag); else state.tags.add(tag); }, { class: "chip" })));

  const group = (label, value, body) => h("div", { class: "group" }, h("p", { class: "group-label" }, label, value), body);
  // Budget and interests stay folded away until asked for; a badge says how many are on
  const extras = h("b");
  syncs.push(() => { extras.textContent = (state.budget ? 1 : 0) + state.tags.size || ""; });
  const filters = h("div", { class: "filters" },
    group("Where", null, where),
    group("When", when, months),
    h("details", { class: "more", open: Boolean(state.budget || state.tags.size) },
      h("summary", null, "Budget and interests", extras, icon("down")),
      group("Budget per person, per day", null, budget),
      tags.length > 0 && group("Interests", null, chips)));
  for (const sync of syncs) sync();
  // The results narrow to a country as you type its name
  const find = h("input", {
    type: "search", id: "search", placeholder: "Filter by country", autocomplete: "off", value: state.query,
    oninput: (e) => { state.query = e.target.value; renderResults(); paint(); },
    onfocus: () => { if (phone.matches && snap !== "full") setSnap("full"); },
    onkeydown: (e) => {
      if (e.key === "Enter") panel.querySelector("#results .card")?.click();
      else if (e.key === "Escape" && state.query) { e.preventDefault(); e.stopPropagation(); state.query = e.target.value = ""; renderResults(); paint(); }
    },
  });
  state.clear = () => { state.month = state.budget = 0; state.region = ""; state.query = find.value = ""; state.tags.clear(); refresh(); };

  panel.replaceChildren(
    h("h1", { class: "hero" }, "Where to ", h("em", { text: "next?" })),
    filters,
    h("div", { class: "results-head" }, h("h2", { class: "section", id: "count" }), h("button", { type: "button", class: "link", id: "clear", text: "Clear filters", onclick: () => state.clear() })),
    h("div", { class: "sort", id: "sort", role: "group", "aria-label": "Order" }, [["score", "Top rated"], ["name", "A to Z"]].map(([key, label]) =>
      h("button", { type: "button", "data-sort": key, "aria-pressed": String(state.sort === key), text: label, onclick: () => { state.sort = key; renderResults(); } }))),
    h("label", { class: "sr-only", for: "search", text: "Filter by country" }),
    h("div", { class: "search find" }, icon("search"), find, h("kbd", { text: "/", "aria-hidden": "true" })),
    h("div", { id: "results" }),
    credits());
  renderResults();
}

// The number in a heading counts up or down to its new value
let lastCount = null;
function countTo(el, to) {
  const from = lastCount ?? to;
  lastCount = to;
  el.textContent = to;
  if (reducedMotion || from === to) return;
  const began = performance.now();
  (function tick(now) {
    const t = clamp((now - began) / 420, 0, 1);
    el.textContent = Math.round(from + (to - from) * d3.easeCubicOut(t));
    if (t < 1 && el.isConnected) requestAnimationFrame(tick);
  })(began);
}

function renderResults() {
  const box = $("#results"), head = $("#count");
  if (!box) return;
  const all = Object.keys(guides).filter((id) => byId.has(id)).sort((a, b) => byId.get(a).name.localeCompare(byId.get(b).name));
  const shown = all.filter(matches);
  if (state.sort === "score") shown.sort((a, b) => (scoreOf(byId.get(b))?.overall ?? -1) - (scoreOf(byId.get(a))?.overall ?? -1));
  for (const btn of document.querySelectorAll("#sort button")) btn.setAttribute("aria-pressed", String(btn.dataset.sort === state.sort));
  const active = filtersActive();
  const colour = scoreScale();
  const number = h("b");
  head.replaceChildren(number, active ? ` of ${plural(all.length, "guide")} match` : shown.length === 1 ? " guide" : " guides");
  $("#clear").hidden = !active;
  box.replaceChildren(shown.length
      ? h("ul", { class: "cards" }, shown.map((id) => {
          const c = byId.get(id), g = guides[id], whole = byId.get(c.within), places = g.places || [];
          const meta = [g.bestMonths && `Best ${monthRanges(g.bestMonths)}`, g.budgetPerDay && `about ${money(g.budgetPerDay)} a day`].filter(Boolean).join(" · ");
          return h("li", null, h("button", { type: "button", class: "card", "data-id": id, onclick: () => select(id), ...peekAt(c) },
            h("span", { class: "card-flag", text: c.flag, "aria-hidden": "true" }),
            h("span", { class: "card-main" },
              h("span", { class: "card-title", text: c.name }),
              h("span", { class: "card-sub", text: [whole ? whole.name : c.subregion || c.region, places.length && plural(places.length, "place")].filter(Boolean).join(" · ") }),
              h("span", { class: "card-text", text: g.summary }),
              meta && h("span", { class: "card-meta", text: meta })),
            scoreOf(c) ? scoreBadge(scoreOf(c), colour(scoreOf(c).overall)) : icon("next")));
        }))
      : h("p", { class: "empty", text: state.query.trim() ? "No guide for a country by that name yet." : "No guides match those choices yet. Try removing one." }));
  countTo(number, shown.length);
}

function credits() {
  const odbl = () => h("a", { href: "https://opendatacommons.org/licenses/odbl/1-0/", target: "_blank", rel: "noopener", text: "ODbL" });
  return h("p", { class: "credits" },
    "Map shapes: Natural Earth. Country facts: mledoze/countries (", odbl(), "). Road distances: OSRM, © OpenStreetMap contributors (", odbl(),
    "). Airports: OurAirports. ", h("a", { href: "privacy/", text: "Privacy" }), " · ", h("a", { href: "terms/", text: "Terms" }));
}

// The UK government's travel advice for a country (`advice` in countries.json, from scripts/advice.mjs).
// As on the guide pages (scripts/build-pages.mjs). Nothing for the UK itself.
function adviceLine(c) {
  if (c.advice == null) return null;
  return h("p", { class: "note" }, "Before you book, read the ",
    h("a", { href: `https://www.gov.uk/foreign-travel-advice/${c.advice}`, target: "_blank", rel: "noopener", text: `UK government's travel advice for ${c.name}` }),
    ": safety, entry rules and health. Guides are for ideas and planning, and things change, so check anything important before you go.");
}

// The weather tab: every month rated Great, Okay or Bad, with its average high and low and its rain.
// A guide's best months are its Great ones (scripts/build-weather.mjs), and its note on them comes first.
const RATING = { G: "Great", O: "Okay", B: "Bad" };
function weatherTab(c, g) {
  const w = weather[c.id], kids = [];
  if (g?.bestMonths) kids.push(h("h2", { class: "section", text: "Best time to go" }),
    h("p", { class: "note", text: [monthRanges(g.bestMonths) + ".", g.bestTimeNote].filter(Boolean).join(" ") }));
  if (!w) return kids.length ? kids : [h("p", { class: "empty", text: `There are no weather figures for ${c.name} yet.` })];
  const now = new Date().getMonth();
  kids.push(
    h("h2", { class: "section", text: "Month by month" }),
    h("div", { class: "wx-strip", role: "img", "aria-label": RATING_ORDER.map((r) => `${RATING[r]}: ${monthRanges(w.m.flatMap((m, i) => (m[3] === r ? [i + 1] : []))) || "none"}`).join(". ") },
      w.m.map((m, i) => h("span", { class: `wx-${m[3]}`, text: MONTHS[i].charAt(0), title: `${MONTHS_LONG[i]}: ${RATING[m[3]]}` }))),
    h("p", { class: "wx-key", "aria-hidden": "true" }, RATING_ORDER.map((r) => h("span", null, h("i", { class: `wx-${r}` }), RATING[r]))),
    h("table", { class: "wx" },
      h("thead", null, h("tr", null, ["Month", "", "High / low", "Rain"].map((t) => h("th", { scope: "col", text: t })))),
      h("tbody", null, w.m.map(([high, low, rain, r], i) => h("tr", { class: i === now ? "now" : "" },
        h("th", { scope: "row", text: MONTHS_LONG[i] }),
        h("td", null, h("span", { class: `wx-tag wx-${r}`, text: RATING[r] })),
        h("td", { text: `${high}° / ${low}°` }),
        h("td", { text: `${rain} mm` }))))),
    h("p", { class: "note", text: `Averages for ${w.at || `the middle of ${c.name}`}, 2015–2024, from NASA POWER. Great: highs of 17–33 °C and not too wet. Bad: very cold, very hot or very wet. Mountains and coasts can differ a lot, so check the forecast nearer the time.` }));
  return kids;
}
const RATING_ORDER = ["G", "O", "B"];

function renderDestination() {
  const c = byId.get(state.selected), g = guides[c.id], whole = byId.get(c.within);
  const facts = [
    ["Capital", c.capital],
    ["Currency", c.currencies.join(", ")],
    ["Languages", c.languages.join(", ")],
    ["Dialling code", c.dial],
  ].filter(([, value]) => value);

  const kids = [
    h("button", { type: "button", class: "back", onclick: clearSelection }, icon("back"), "All destinations"),
    h("div", { class: "dest-head" },
      h("span", { class: "flag big", text: c.flag, "aria-hidden": "true" }),
      h("div", null,
        h("h1", null, c.name, g?.status === "draft" && h("span", { class: "badge", text: "Draft" })),
        h("p", { class: "muted", text: [whole ? [c.group, whole.name].filter(Boolean).join(", ") : c.subregion || c.region, c.capital && `Capital ${c.capital}`].filter(Boolean).join(" · ") }))),
    TRIP_PLANNER && h("div", { class: "actions" },
      h("button", { type: "button", class: "primary", onclick: () => addStop(c.id) }, icon("plus"), "Add to my trip"),
      placesIn(c.id).length > 0 && h("button", { type: "button", class: "small", text: "Build me a trip here", onclick: () => {
        state.build = { ids: [c.id], nights: g?.nights?.[0] || state.build.nights };
        showTab("trip");
      } })),
  ];

  // Three tabs: what there is to do, the weather month by month, and what to know before going
  const INFO = [["todo", "Things to do"], ["weather", "Weather"], ["advice", "Travel advice"]];
  kids.push(h("div", { class: "seg three info-tabs", role: "tablist", "aria-label": `About ${c.name}`, "data-on": INFO.findIndex(([key]) => key === state.info) },
    INFO.map(([key, label]) => h("button", { type: "button", role: "tab", id: `info-${key}`, "aria-selected": String(state.info === key), "aria-controls": "info-body",
      text: label, onclick: () => { if (state.info !== key) { state.info = key; render(); } } }))));
  const body = [];

  if (state.info === "todo") {
    const score = scoreOf(c);
    if (score) {
      const colour = scoreScale();
      body.push(h("div", { class: "rating" },
        h("div", { class: "rating-head" }, h("h2", { class: "section", text: "Our scores" }), scoreBadge(score, colour(score.overall)), h("span", { class: "muted", text: "out of 10" })),
        h("ul", { class: "rating-bars" }, ratings.categories.map((name, i) => h("li", null,
          h("span", { text: name }),
          h("span", { class: "bar", "aria-hidden": "true" }, Object.assign(h("i"), { style: `width: ${score.parts[i] * 10}%; background: ${colour(score.parts[i])}` })),
          h("b", { text: String(score.parts[i]) }))))));
    }
    const top = activities[c.id];
    if (top?.length) body.push(h("h2", { class: "section", text: "Top 3 things to do" }), h("ol", { class: "top3" }, top.slice(0, 3).map((t) => h("li", { text: t }))));

    if (g) {
      body.push(h("p", { class: "summary", text: g.summary }));
      if (g.tags?.length) body.push(h("p", { class: "tags" }, g.tags.map((t) => h("span", { class: "tag", text: t }))));

      if (g.places?.length) body.push(
        h("h2", { class: "section", text: "Places" }),
        h("ul", { class: "places" }, g.places.map((p) => {
          const pin = pinOf.get(`${c.id}/${p.id}`);
          return h("li", { class: p.id === state.place ? "active" : "", "data-place": p.id,
            onpointerenter: () => globe.light({ type: "place", pin }), onpointerleave: () => globe.light(null) },
            h("div", null,
              h("button", { type: "button", class: "link", text: p.name, onclick: () => select(c.id, { place: p.id }) }),
              PLACE_TYPES[p.type] && h("span", { class: "muted", text: ` · ${PLACE_TYPES[p.type]}` }),
              h("p", { text: p.blurb }),
              bookRow(partnerLinks(c, p), p.links)),
            TRIP_PLANNER && h("button", { type: "button", class: "small", text: "Add", "aria-label": `Add ${p.name} to my trip`, onclick: () => addStop(c.id, p.id) }));
        })));

      if (g.itineraries?.length) body.push(
        h("h2", { class: "section", text: TRIP_PLANNER ? "Ready-made itineraries" : "Suggested routes" }),
        ...g.itineraries.map((it) => {
          // Pointing at an itinerary draws its route on the map
          const show = () => globe.preview(it.stops.map((s) => g.places.find((p) => p.id === s.place)).filter(Boolean));
          return h("div", { class: "itinerary", tabindex: TRIP_PLANNER ? null : 0, onpointerenter: show, onpointerleave: () => globe.preview(null), onfocusin: show, onfocusout: () => globe.preview(null) },
            h("div", null,
              h("strong", { text: it.name }),
              h("p", { text: it.stops.map((s) => `${g.places.find((p) => p.id === s.place).name} ${s.nights}`).join(" → ") + " nights" })),
            TRIP_PLANNER && h("button", { type: "button", class: "small", text: "Use this", onclick: () => useItinerary(c.id, it) }));
        }));
    } else if (whole && guides[whole.id]) {
      body.push(h("p", { class: "empty" }, `There's no guide for ${c.name} on its own yet. It's covered by the `,
        h("button", { type: "button", class: "link", text: `${whole.name} guide`, onclick: () => select(whole.id) }), "."));
    } else if (!top?.length) {
      body.push(h("p", { class: "empty", text: `There's no guide for ${c.name} yet.` }));
    }

    if (c.parts.length) body.push(
      h("h2", { class: "section", text: "Explore by area" }),
      h("p", { class: "tags" }, c.parts.map((part) => h("button", { type: "button", class: "tag", text: part.name, onclick: () => select(part.id),
        onpointerenter: () => globe.light({ type: "country", id: part.id, lng: part.lng, lat: part.lat }), onpointerleave: () => globe.light(null) }))));
  } else if (state.info === "weather") {
    body.push(...weatherTab(c, g));
  } else {
    const advice = adviceLine(c);
    if (advice) body.push(h("h2", { class: "section", text: "Before you go" }), advice);

    const stats = [
      g?.budgetPerDay && ["Budget", `About ${money(g.budgetPerDay)} a day`, "per person, before flights"],
      g?.nights && ["How long", `${g.nights[0]}–${g.nights[1]} nights`, "suggested stay"],
    ].filter(Boolean);
    if (stats.length) body.push(h("div", { class: "stats" }, stats.map(([label, value, sub]) =>
      h("div", { class: "stat" }, h("span", { class: "stat-l", text: label }), h("span", { class: "stat-v", text: value }), h("span", { class: "stat-l", text: sub })))));

    if (g?.tips?.length) body.push(h("h2", { class: "section", text: "Good to know" }), h("ul", { class: "tips" }, g.tips.map((t) => h("li", { text: t }))));

    body.push(
      h("h2", { class: "section", text: "Facts" }),
      h("dl", { class: "facts" }, facts.flatMap(([label, value]) => [h("dt", { text: label }), h("dd", { text: value })])));

    const booking = bookRow(partnerLinks(c), g?.links);
    if (booking) body.push(h("h2", { class: "section", text: "Book it" }), booking);
  }

  kids.push(h("div", { id: "info-body", role: "tabpanel", "aria-labelledby": `info-${state.info}` }, ...body), credits());
  panel.replaceChildren(...kids.filter(Boolean));
  disclose(panel, panel.querySelector(".credits"));
  const active = panel.querySelector(".places .active");
  if (active) requestAnimationFrame(() => active.scrollIntoView({ block: "center" }));
}

function renderTrip() {
  const field = (label, input) => h("label", null, h("span", { text: label }), input);
  const body = h("div", { id: "trip-body" });
  panel.replaceChildren(
    h("div", { class: "trip-top" },
      h("h1", { text: "My trip" }),
      h("button", { type: "button", class: "small", id: "play", hidden: trip.stops.length < 2, onclick: playRoute }, icon("play"), "Play route")),
    h("div", { class: "trip-fields" },
      field("Trip name", h("input", { type: "text", maxlength: 80, placeholder: "e.g. Jordan in spring", value: trip.name,
        onchange: (e) => { trip.name = e.target.value.trim(); saveTrip(); } })),
      h("div", { class: "field-row" },
        field("Start date", h("input", { type: "date", value: trip.start,
          onchange: (e) => { trip.start = e.target.value; saveTrip(); renderTripBody(); } })),
        field("Travellers", h("input", { type: "number", min: 1, max: 20, value: trip.travellers,
          onchange: (e) => { trip.travellers = clamp(Math.round(Number(e.target.value)) || 1, 1, 20); e.target.value = trip.travellers; saveTrip(); renderTripBody(); } })))),
    tripBuilder(),
    body);
  renderTripBody();
}

// The journey to a stop from the one before, with a link to Rome2Rio for the full options. A flight also links
// to a Google Flights search between the two airports, on the day of travel if the trip has dates.
function legLine(before, after) {
  const leg = travel(before.stop, after.stop);
  const spot = (info) => encodeURIComponent(info.label.replace(/[\s,]+/g, "-"));
  const search = leg.fly && `Flights from ${leg.fly[0].code} to ${leg.fly[1].code}${after.arrive ? ` on ${isoDay(after.arrive)}` : ""} one way`;
  return h("p", { class: "leg" },
    [travelText(leg, before.info.name), leg.note].filter(Boolean).join(": "), " · ",
    h("a", { href: `https://www.rome2rio.com/map/${spot(before.info)}/${spot(after.info)}`, target: "_blank", rel: "noopener", text: "See routes" }),
    search && " · ",
    search && h("a", { href: `https://www.google.com/travel/flights?q=${encodeURIComponent(search)}`, target: "_blank", rel: "noopener", text: "Search flights" }));
}

// "Build a trip for me": the visitor says where and for how long, and the stops are chosen for them
function tripBuilder() {
  const build = state.build;
  const offered = countries.filter((c) => placesIn(c.id).length).sort((a, b) => a.name.localeCompare(b.name));
  const redraw = () => box.replaceWith(tripBuilder());
  const chosen = build.ids.map((id) => byId.get(id));

  const box = h("details", { class: "builder", open: !trip.stops.length || build.ids.length > 0 },
    h("summary", null, icon("spark"), "Build a trip for me"),
    h("p", { class: "note", text: "Say where you want to go and for how long. We'll pick the places, share out the nights and put them in order. You can change anything afterwards." }),
    chosen.length > 0 && h("div", { class: "chips" }, chosen.map((c) => h("button", {
      type: "button", class: "chip", "aria-pressed": "true", text: `${c.flag} ${c.name} ✕`, "aria-label": `Remove ${c.name}`,
      onclick: () => { build.ids = build.ids.filter((id) => id !== c.id); redraw(); },
    }))),
    h("div", { class: "field-row" },
      h("label", null, h("span", { text: "Where" }),
        h("select", { onchange: (e) => { if (e.target.value) build.ids.push(e.target.value); redraw(); } },
          h("option", { value: "", text: chosen.length ? "Add another…" : "Choose a destination…" }),
          offered.filter((c) => !build.ids.includes(c.id)).map((c) => h("option", { value: c.id, text: `${c.flag} ${c.name}` })))),
      h("label", null, h("span", { text: "Nights" }),
        h("input", { type: "number", min: 1, max: 90, value: build.nights,
          onchange: (e) => { build.nights = clamp(Math.round(Number(e.target.value)) || 1, 1, 90); e.target.value = build.nights; } }))),
    h("div", { class: "actions" },
      h("button", { type: "button", class: "primary", text: "Build my trip", disabled: !chosen.length, onclick: async () => {
        if (trip.stops.length && !await ask("Replace the stops already in your trip?", "Replace")) return;
        const built = buildTrip(build.ids, build.nights);
        trip.stops = built.stops;
        trip.name = `${chosen.map((c) => c.name).join(", ")}: ${plural(build.nights, "night")}`.slice(0, 80);
        state.build = { ids: [], nights: build.nights };
        saveTrip();
        renderTrip();
        fitTrip();
        toast(built.spare ? `Trip built, with ${plural(built.spare, "night")} left over. Add another destination to fill them.` : "Trip built. Change anything you like below.");
      } })));
  return box;
}

function renderTripBody() {
  const body = $("#trip-body");
  if (!body) return;
  const play = $("#play");
  if (play) play.hidden = trip.stops.length < 2;
  if (!trip.stops.length) {
    body.replaceChildren(h("p", { class: "empty", text: "No stops yet. Build a trip above, or pick a country on the map and choose “Add to my trip”." }),
      h("button", { type: "button", class: "primary", text: "Browse destinations", onclick: () => showTab("discover") }));
    return;
  }

  const plan = tripPlan();
  const change = (fn) => () => { stopTour(); fn(); saveTrip(); renderTripBody(); };
  const moveTo = (from, to) => change(() => { const [s] = trip.stops.splice(from, 1); trip.stops.splice(to, 0, s); });

  // A stop can be dragged to a new place in the list with a mouse; the arrows do the same for everyone else
  let lifted = null;
  const stops = h("ol", { class: "stops" }, plan.stops.map((s, i) => h("li", {
      "data-i": i, draggable: "true",
      onpointerenter: () => { if (!tour) globe.light({ type: "stop", index: i }); }, onpointerleave: () => { if (!tour) globe.light(null); },
      ondragstart: (e) => { lifted = i; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.info.label); e.currentTarget.classList.add("lifted"); },
      ondragend: (e) => { lifted = null; e.currentTarget.classList.remove("lifted"); for (const el of stops.querySelectorAll(".drop-above, .drop-below")) el.classList.remove("drop-above", "drop-below"); },
      ondragover: (e) => {
        if (lifted == null || lifted === i) return;
        e.preventDefault();
        e.currentTarget.classList.add(lifted < i ? "drop-below" : "drop-above");
      },
      ondragleave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove("drop-above", "drop-below"); },
      ondrop: (e) => { e.preventDefault(); if (lifted != null && lifted !== i) moveTo(lifted, i)(); },
    },
    h("span", { class: "num", text: i + 1 }),
    h("div", { class: "stop-main" },
      i > 0 && legLine(plan.stops[i - 1], s),
      h("button", { type: "button", class: "link", text: s.info.name, onclick: () => select(s.stop.id, { place: s.stop.place }) }),
      h("p", { class: "muted", text: [s.info.place && s.info.country.name, s.arrive && `${dayFmt.format(s.arrive)} to ${dayFmt.format(s.leave)}`].filter(Boolean).join(" · ") }),
      s.offSeason && h("p", { class: "warn", text: s.offSeason }),
      bookRow(partnerLinks(s.info.country, s.info.place, s), s.info.place?.links),
      h("div", { class: "stop-tools" },
        h("span", { class: "stepper" },
          h("button", { type: "button", text: "−", "aria-label": `One night fewer in ${s.info.name}`, disabled: s.stop.nights <= 1, onclick: change(() => { s.stop.nights--; }) }),
          h("span", { text: plural(s.stop.nights, "night") }),
          h("button", { type: "button", text: "+", "aria-label": `One more night in ${s.info.name}`, disabled: s.stop.nights >= 90, onclick: change(() => { s.stop.nights++; }) })),
        h("button", { type: "button", class: "icon", "aria-label": `Move ${s.info.name} earlier`, disabled: i === 0, onclick: moveTo(i, i - 1) }, icon("up")),
        h("button", { type: "button", class: "icon", "aria-label": `Move ${s.info.name} later`, disabled: i === plan.stops.length - 1, onclick: moveTo(i, i + 1) }, icon("down")),
        h("button", { type: "button", class: "icon", "aria-label": `Remove ${s.info.name}`, onclick: change(() => { trip.stops.splice(i, 1); }) }, icon("close")))))));

  const nCountries = new Set(trip.stops.map((s) => s.id)).size;
  const stats = [
    ["Length", plural(plan.nights, "night"), plan.start ? `${dayFmt.format(plan.start)} to ${fullFmt.format(plan.end)}` : "add a start date for dates"],
    ["Route", plural(trip.stops.length, "stop"), nCountries === 1 ? "1 country" : `${nCountries} countries`],
  ];
  if (plan.costed) stats.push(["Rough cost", `About ${money(plan.cost)}`,
    `${plural(trip.travellers, "traveller")}, before flights` + (plan.costed < plan.stops.length ? `; covers ${plan.costed} of ${plan.stops.length} stops` : "")]);

  const text = () => tripAsText();
  const link = () => `${location.origin}${location.pathname}#trip=${tripToHash()}`;
  const copy = (make, done) => async () => {
    try { await navigator.clipboard.writeText(make()); toast(done); } catch { toast("Couldn't copy. Your browser blocked it."); }
  };
  const actions = [
    h("button", { type: "button", class: "small", text: "Copy share link", onclick: copy(link, "Link copied") }),
    h("button", { type: "button", class: "small", text: "Copy as text", onclick: copy(text, "Trip copied") }),
    h("button", { type: "button", class: "small", text: "Print", onclick: () => print() }),
    h("button", { type: "button", class: "small danger", text: "Clear trip", onclick: async () => {
      if (!await ask("Clear the whole trip?", "Clear trip", true)) return;
      stopTour(); trip = emptyTrip(); saveTrip(); renderTrip();
    } }),
  ];
  // The planning offer goes to a booking or payment page if site.json has one, and otherwise to an email with the trip in it
  const planning = site.planning || {};
  const paid = /^https:\/\//.test(planning.url || "");
  const page = !paid && /^[a-z0-9][a-z0-9/-]*$/.test(planning.page || "") ? planning.page + "#start" : "";
  const offer = paid || page || site.contactEmail;
  const pitch = offer && h("div", { class: "pitch" },
    planning.text && h("p", { text: planning.text }),
    h("a", { class: "primary",
      href: paid ? planning.url : page || `mailto:${site.contactEmail}?subject=${encodeURIComponent("Help planning: " + (trip.name || "my trip"))}&body=${encodeURIComponent(text() + "\n\n" + link())}`,
      target: paid && "_blank", rel: paid && "noopener",
      text: planning.label || "Ask for help with this trip" }));

  body.replaceChildren(...[
    stops,
    h("div", { class: "stats" }, stats.map(([label, value, sub]) =>
      h("div", { class: "stat" }, h("span", { class: "stat-l", text: label }), h("span", { class: "stat-v", text: value }), h("span", { class: "stat-l", text: sub })))),
    pitch,
    h("div", { class: "actions" }, actions),
    keptWhere(),
    h("h2", { class: "section", text: "Before you go" }),
    h("ul", { class: "checklist" }, CHECKLIST.map(([key, label]) => h("li", null, h("label", null,
      h("input", { type: "checkbox", checked: Boolean(trip.checks[key]), onchange: (e) => { if (e.target.checked) trip.checks[key] = true; else delete trip.checks[key]; saveTrip(); } }),
      h("span", { text: label })))))].filter(Boolean));
  disclose(body, body.querySelector(".checklist").previousSibling);
}

// ---------- the account ----------

// Signing in (assets/account.js) keeps the trip with the visitor's account as well as in this browser,
// so it is there on their other devices. The copy in the browser is still the one the page works from.
const account = window.tcwAccount || { enabled: false, user: null, ready: Promise.resolve(), onChange() {} };
const BASE_KEY = "tcw.trip.base";
let syncing = null;      // the id of the account the trip is being kept with, once the two have been matched up
let pushTimer = 0, pushFailed = false;

// A trip as text, the same for the same trip however it was put together
const tripText = (t) => JSON.stringify(cleanTrip(JSON.parse(JSON.stringify(t))));

// The trip as it was when this browser and the account last agreed. Whichever side differs from it
// since is the side that changed.
function base(uid) {
  try { const b = JSON.parse(localStorage.getItem(BASE_KEY)); return b && b.uid === uid ? b.text : null; } catch { return null; }
}
function setBase(uid, text) {
  try { if (uid) localStorage.setItem(BASE_KEY, JSON.stringify({ uid, text })); else localStorage.removeItem(BASE_KEY); } catch { /* storage blocked */ }
}

function queuePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushTrip, 700);
}

async function pushTrip() {
  clearTimeout(pushTimer); pushTimer = 0;
  const uid = syncing, text = tripText(trip);
  if (!uid || text === base(uid)) return;
  try {
    const { error } = await (await account.db()).from("trips").upsert({ user_id: uid, data: JSON.parse(text) });
    if (error) throw error;
    setBase(uid, text);
    pushFailed = false;
  } catch (err) {
    console.warn("Saving the trip to the account:", err);
    if (!pushFailed) toast("Couldn't save to your account just now. Your trip is safe in this browser.");
    pushFailed = true;
  }
}

function showTrip() {
  if (state.tab === "trip") renderTrip();
  else if (state.selected) renderDestination();
}

// Matches the trip in this browser up with the one in the account, when someone signs in or comes back
async function syncTrip() {
  const uid = account.user.id;
  let theirs = null;
  try {
    const { data, error } = await (await account.db()).from("trips").select("data").eq("user_id", uid).maybeSingle();
    if (error) throw error;
    if (data) theirs = tripText(data.data);
  } catch (err) {
    console.warn("Reading the trip from the account:", err);
    toast("Couldn't reach your account. Your trip is still saved in this browser.");
    return;
  }
  if (!account.user || account.user.id !== uid) return; // signed out while that was fetched
  const mine = tripText(trip), nothing = tripText(emptyTrip()), was = base(uid);
  let take = "neither";
  if (theirs == null) take = mine === nothing ? "neither" : "mine";
  else if (theirs === mine) take = "neither";
  else if (theirs === was) take = "mine";                      // only this browser has changed
  else if (mine === was || mine === nothing) take = "theirs";  // only the account has changed
  else take = await ask("Your account has a different trip from the one in this browser. Open the account's trip? It replaces the one here.", "Open the account's trip") ? "theirs" : "mine";
  if (!account.user || account.user.id !== uid) return;
  syncing = uid;
  if (take === "theirs") {
    stopTour();
    trip = cleanTrip(JSON.parse(theirs));
    setBase(uid, theirs);
    saveTrip();
    showTrip();
    toast("Opened the trip saved to your account");
  } else {
    // Already the same (or both empty): note that they agree, and there is nothing to send
    if (take === "neither") setBase(uid, mine);
    await pushTrip();
    showTrip();
    if (theirs != null && take === "mine" && theirs !== was && !pushFailed) toast("Kept the trip in this browser, and saved it to your account");
  }
}

// A line on the trip tab saying where the trip is kept
function keptWhere() {
  if (!account.enabled) return null;
  if (account.user) return h("p", { class: "kept", text: `Saved to your account (${account.user.email}).` });
  return h("p", { class: "kept" }, "Saved in this browser only. ",
    h("button", { type: "button", class: "link", text: "Sign in to keep it on all your devices", onclick: signInBox }));
}

function dialog(...kids) {
  const box = h("dialog", { class: "ask" }, kids);
  box.addEventListener("close", () => box.remove());
  document.body.append(box);
  box.showModal();
  return box;
}

function signInBox() {
  const box = dialog(
    h("p", { text: "Sign in to The Corner World" }),
    h("p", { class: "fine", text: "Your trip is kept with your account, so it's there on your phone and your laptop. If we've made a trip page for you, signing in opens it." }),
    h("p", { class: "fine" }, "We keep your name and email address from Google, and your trip. ", h("a", { href: "privacy/", text: "What we keep and why" }), "."),
    h("div", { class: "actions" },
      h("button", { type: "button", class: "small", text: "Cancel", onclick: () => box.close() }),
      h("button", { type: "button", class: "primary", text: "Continue with Google", autofocus: true, onclick: async (e) => {
        e.target.disabled = true;
        try { await account.signIn(); } catch (err) { console.error(err); box.close(); toast("Couldn't start sign-in. Check your connection and try again."); }
      } })));
}

function accountBox() {
  const user = account.user;
  const admin = h("a", { class: "small", href: "admin/", text: "Admin", hidden: true });
  account.isAdmin().then((yes) => { admin.hidden = !yes; });
  const box = dialog(
    h("p", { text: user.name || user.email }),
    user.name && h("p", { class: "fine", text: user.email }),
    h("p", { class: "fine" }, "Your trip is saved to this account. ", h("a", { href: "privacy/", text: "What we keep and why" }), "."),
    h("div", { class: "actions" }, h("a", { class: "small", href: "trip/", text: "My trip pages" }), admin),
    h("div", { class: "actions" },
      h("button", { type: "button", class: "small danger", text: "Delete account", onclick: async () => {
        box.close();
        if (!await ask("Delete your account? The trip saved to it is deleted too, and this can't be undone.", "Delete account", true)) return;
        try { await account.remove(); toast("Your account has been deleted"); } catch (err) { console.error(err); toast("Couldn't delete the account. Try again in a moment."); }
      } }),
      h("button", { type: "button", class: "small", text: "Sign out", onclick: async () => {
        box.close();
        await pushTrip();
        try { await account.signOut(); toast("Signed out"); } catch (err) { console.error(err); toast("Couldn't sign out. Try again in a moment."); }
      } }),
      h("button", { type: "button", class: "primary", text: "Done", autofocus: true, onclick: () => box.close() })));
}

function accountButton() {
  const btn = $("#account-btn"), user = account.user;
  btn.hidden = false;
  btn.classList.toggle("in", Boolean(user));
  btn.setAttribute("aria-label", user ? `Your account: ${user.email}` : "Sign in");
  btn.replaceChildren(...(user ? [h("span", { class: "initial", text: (user.name || user.email || "?").trim().charAt(0).toUpperCase() })] : [icon("person"), h("span", { text: "Sign in" })]));
  btn.onclick = user ? accountBox : signInBox;
}

// Shows the account button at once, and then, when it is known who is signed in, matches the trips up
function accounts() {
  if (!account.enabled) return;
  accountButton();
  account.onChange((user, before) => {
    accountButton();
    if (user) return void syncTrip();
    if (!before) return;
    // Signed out: the trip stays with the account and leaves this browser, which may not be theirs
    clearTimeout(pushTimer);
    syncing = null;
    setBase(null);
    stopTour();
    trip = emptyTrip();
    saveTrip();
    showTrip();
  });
  account.ready.then(() => {
    accountButton();
    if (account.problem) toast("Sign-in didn't finish. Try again.");
    if (account.user) syncTrip();
  });
  // A change made just before the page is put away still gets sent
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && pushTimer) pushTrip(); });
}

// ---------- start ----------

// Opens whatever the address asks for: a shared trip or a country. True if it did.
async function openFromHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  const shared = TRIP_PLANNER && params.get("trip") && tripFromHash(params.get("trip"));
  if (shared && shared.stops.length) {
    if (!trip.stops.length || await ask("Open the shared trip? It replaces the trip saved in this browser.", "Open it")) { trip = shared; saveTrip(); }
    history.replaceState(null, "", location.pathname);
    showTab("trip");
    return true;
  }
  if (byId.has(params.get("c"))) { select(params.get("c")); return true; }
  render();
  return false;
}

function shortcuts() {
  addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
    if (e.key === "/" && !typing) {
      e.preventDefault();
      if (state.tab !== "discover" || state.selected) { state.selected = state.place = null; paint(); showTab("discover"); }
      $("#search")?.focus();
    } else if (e.key === "Escape" && !typing && state.tab === "discover" && state.selected) clearSelection();
  });
}

async function start() {
  const load = (name) => fetch(`data/${name}.json`).then((r) => { if (!r.ok) throw new Error(`${name}: ${r.status}`); return r.json(); });
  let world;
  try {
    let written;
    [world, countries, guides, site, written, distances, airports, activities, weather, ratings] = await Promise.all([load("world"), load("countries"), load("guides"), load("site"),
      load("legs").catch(() => []), load("distances").catch(() => ({})), load("airports").catch(() => airports), load("activities").catch(() => ({})), load("weather").catch(() => ({})), load("ratings").catch(() => ratings)]);
    for (const leg of written) legs.set([leg.from, leg.to].sort().join(" "), leg);
  } catch (err) {
    console.error(err);
    panel.replaceChildren(h("p", { class: "empty", text: "The map data didn't load. Check your connection and reload the page." }));
    document.body.classList.add("ready");
    return;
  }
  for (const c of countries) { c.features = []; c.parts = []; byId.set(c.id, c); }
  for (const c of countries) byId.get(c.within)?.parts.push(c); // a country's states
  const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: site.currency || "GBP", maximumFractionDigits: 0 });
  money = (n) => currency.format(n);

  if (TRIP_PLANNER) try { trip = cleanTrip(JSON.parse(localStorage.getItem(TRIP_KEY))); } catch { trip = emptyTrip(); }
  else document.body.classList.add("no-trip");
  buildMap(world);
  if (TRIP_PLANNER) saveTrip(); else paint();
  sheetDrag();
  setSnap("half", false);
  shortcuts();

  for (const btn of document.querySelectorAll("#tabs button")) btn.addEventListener("click", () => showTab(btn.dataset.tab));
  $("#theme-btn").addEventListener("click", () => {
    const now = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = now === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("tcw.theme", next); } catch { /* storage blocked: lasts for this visit */ }
    globe.theme();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => globe.theme());

  $("#hint").textContent = matchMedia("(pointer: coarse)").matches ? "Drag to spin · Pinch to zoom · Tap a country" : "Drag to spin · Scroll to zoom · Click a country";
  document.body.classList.add("ready");
  const opened = await openFromHash();
  accounts();
  if (opened) return;
  // Nothing asked for: the globe arrives and turns slowly until it is touched
  if (await globe.arrive({ lng: 12, lat: 22 })) globe.spin(true);
}

start();
})();
