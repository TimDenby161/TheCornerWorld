// The Corner World: the map, the destination guides and the trip planner.
// Data: data/world.json (map shapes), data/countries.json (basic facts, both built by
// scripts/build-data.mjs), data/guides.json (the hand-written guides) and data/site.json (settings).
// Journeys: data/legs.json (hand-written), data/distances.json and data/airports.json (both built).
(function () {
"use strict";

const W = 960, H = 500;
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

const $ = (sel) => document.querySelector(sel);
const panel = $("#panel");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let countries = [], byId = new Map(), guides = {}, legs = new Map(), distances = {}, airports = { airports: {}, places: {} }, site = { currency: "GBP", contactEmail: "", partners: [], planning: {} };
let money = (n) => String(n);
let trip = emptyTrip();
const state = { tab: "discover", selected: null, place: null, query: "", month: 0, budget: 0, tags: new Set(), build: { ids: [], nights: 10 } };

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

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

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
  toast(`Added ${place ? place.name : byId.get(id).name} to your trip`);
}

function useItinerary(id, itinerary) {
  if (trip.stops.length && !confirm("Replace the stops already in your trip?")) return;
  trip.stops = itinerary.stops.map((s) => ({ id, place: s.place, nights: s.nights }));
  if (!trip.name) trip.name = `${byId.get(id).name}: ${itinerary.name}`;
  saveTrip();
  showTab("trip");
}

// The airports for a place, from data/airports.json: [{ code, name, city, lat, lng, size, km }], the one to fly from first
function airportsFor(id, place) {
  return (airports.places[`${id}/${place}`] || []).map(([code, km]) => ({ code, km, ...airports.airports[code] }));
}

// "Airports: Queen Alia International Airport (AMM) 26 km · Marka International Airport (ADJ) 6 km"
// scripts/build-pages.mjs does the same for the guide pages.
function airportsText(id, place) {
  const list = airportsFor(id, place);
  return list.length ? `${list.length > 1 ? "Airports" : "Airport"}: ${list.map((a) => `${a.name} (${a.code}) ${a.km.toLocaleString("en-GB")} km`).join(" · ")}` : "";
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

const svg = d3.select("#map");
const projection = d3.geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: "Sphere" });
const path = d3.geoPath(projection);
const root = svg.append("g");
const layers = {};
let zoomK = 1;

const zoom = d3.zoom()
  .scaleExtent([1, 60])
  .translateExtent([[0, 0], [W, H]])
  .on("zoom", (event) => {
    root.attr("transform", event.transform);
    zoomK = event.transform.k;
    svg.classed("zoomed", zoomK >= 3);
    rescale();
    drawAirports(event.transform);
  });

// Dots, pins and trip numbers keep their size on screen however far in the map is zoomed
function rescale() {
  root.selectAll(".marker").attr("transform", (d) => `translate(${d.x},${d.y}) scale(${1 / zoomK})`);
  // Zoomed out, a generous target on the Vatican's dot would swallow clicks meant for Italy
  if (layers.dots) layers.dots.select(".hit").attr("r", zoomK >= 3 ? 9 : 4);
}

function xy(lng, lat) { const [x, y] = projection([lng, lat]); return { x, y }; }

// Airports come into view as the map is zoomed in: the large ones first, then medium, then airstrips. Only
// those inside the part of the map on screen are drawn, so that thousands of them never weigh on the page.
const AIRPORT_ZOOM = { large: 4, medium: 8, small: 14 };
let airportSpots = [];
function drawAirports(t) {
  if (!layers.airports) return;
  const padX = W / t.k / 2, padY = H / t.k / 2;
  const [x0, y0] = t.invert([0, 0]), [x1, y1] = t.invert([W, H]);
  const seen = airportSpots.filter((a) => t.k >= AIRPORT_ZOOM[a.size] && a.x > x0 - padX && a.x < x1 + padX && a.y > y0 - padY && a.y < y1 + padY);
  svg.classed("airports-on", t.k >= AIRPORT_ZOOM.large);
  layers.airports.selectAll("g").data(seen, (a) => a.code)
    .join((enter) => {
      const g = enter.append("g").attr("class", (a) => `airport ${a.size}`)
        .on("click", (event, a) => toast(`${a.name} (${a.code})${a.city && !a.name.includes(a.city) ? `, ${a.city}` : ""}`))
        .on("pointermove", (event, a) => showTip(event, `${a.name} (${a.code})`))
        .on("pointerleave", hideTip);
      g.append("circle").attr("r", 8).attr("class", "hit");
      g.append("rect").attr("x", -3).attr("y", -3).attr("width", 6).attr("height", 6).attr("transform", "rotate(45)");
      return g;
    })
    .attr("transform", (a) => `translate(${a.x},${a.y}) scale(${1 / t.k})`);
}

function buildMap(world) {
  const features = topojson.feature(world, world.objects.countries).features;
  const byKey = new Map(countries.filter((c) => c.key).map((c) => [c.key, c]));
  for (const f of features) {
    f.country = byKey.get(f.id ?? f.properties.name) || null;
    if (f.country) f.country.features.push(f);
  }

  root.append("path").attr("class", "sphere").attr("d", path({ type: "Sphere" }));
  root.append("path").attr("class", "graticule").attr("d", path(d3.geoGraticule10()));

  layers.countries = root.append("g").selectAll("path").data(features).join("path")
    .attr("d", path)
    .on("click", (event, f) => { if (f.country) select(f.country.id); })
    .on("pointermove", (event, f) => showTip(event, f.country ? f.country.name : f.properties.name))
    .on("pointerleave", hideTip);

  // Countries too small to click (or missing from the map at this detail) get a dot
  const small = countries.filter((c) => c.capital && !c.parts.length && (!c.features.length || c.area < 2500)).map((c) => ({ country: c, ...xy(c.lng, c.lat) }));
  layers.dots = root.append("g").selectAll("g").data(small).join("g")
    .attr("class", "marker dot")
    .on("click", (event, d) => select(d.country.id))
    .on("pointermove", (event, d) => showTip(event, d.country.name))
    .on("pointerleave", hideTip);
  layers.dots.append("circle").attr("class", "hit");
  layers.dots.append("circle").attr("r", 2.6);

  airportSpots = Object.entries(airports.airports).map(([code, a]) => ({ code, ...a, ...xy(a.lng, a.lat) }));
  layers.airports = root.append("g");

  layers.route = root.append("path").attr("class", "route");

  const places = Object.entries(guides).flatMap(([id, guide]) => (guide.places || []).map((place) => ({ id, place, ...xy(place.lng, place.lat) })));
  layers.pins = root.append("g").selectAll("g").data(places).join("g")
    .attr("class", "marker pin")
    .on("click", (event, d) => select(d.id, { place: d.place.id }))
    .on("pointermove", (event, d) => showTip(event, d.place.name))
    .on("pointerleave", hideTip);
  layers.pins.append("circle").attr("r", 10).attr("class", "hit");
  layers.pins.append("circle").attr("r", 4);
  layers.pins.append("text").attr("x", 8).attr("y", 4).text((d) => d.place.name);

  layers.trip = root.append("g");

  svg.call(zoom).on("dblclick.zoom", null);
  $("#zoom-in").addEventListener("click", () => svg.transition().duration(200).call(zoom.scaleBy, 1.8));
  $("#zoom-out").addEventListener("click", () => svg.transition().duration(200).call(zoom.scaleBy, 1 / 1.8));
  $("#zoom-reset").addEventListener("click", () => flyTo(d3.zoomIdentity));
  rescale();
}

function showTip(event, text) {
  if (event.pointerType !== "mouse") return;
  const tip = $("#tip"), box = tip.parentElement.getBoundingClientRect();
  tip.textContent = text;
  tip.hidden = false;
  tip.style.left = `${event.clientX - box.left + 12}px`;
  tip.style.top = `${event.clientY - box.top + 12}px`;
}
function hideTip() { $("#tip").hidden = true; }

function flyTo(transform) {
  svg.transition().duration(reducedMotion ? 0 : 650).call(zoom.transform, transform);
}

function flyToPoint(lng, lat, k) {
  const p = xy(lng, lat);
  flyTo(d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-p.x, -p.y));
}

// Frames the country's largest landmass, so far-off territories don't zoom the map out to the whole world
function flyToCountry(country) {
  // A country drawn mostly as its states is framed by its size, as is one too small for a shape
  const spread = country.parts.reduce((sum, part) => sum + part.area, 0) > country.area / 2;
  if (!country.features.length || spread) return flyToPoint(country.lng, country.lat, clamp(10000 / Math.sqrt(country.area), 1, 12));
  if (!country.main) {
    const polygons = country.features.flatMap((f) => f.geometry.type === "MultiPolygon"
      ? f.geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }))
      : [f.geometry]);
    // A ring squashed flat by the map's simplification can read as "everything but this island": skip those
    const sized = polygons.map((p) => [p, d3.geoArea(p)]).filter(([, area]) => area < Math.PI);
    country.main = sized.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  }
  const [[x0, y0], [x1, y1]] = path.bounds(country.main);
  const k = clamp(0.6 / Math.max((x1 - x0) / W, (y1 - y0) / H), 1, 16);
  flyTo(d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
}

// Frames the whole route when the trip is opened
function fitTrip() {
  if (!trip.stops.length) return;
  const pts = trip.stops.map((stop) => { const info = stopInfo(stop); return xy(info.lng, info.lat); });
  const [x0, x1] = d3.extent(pts, (p) => p.x), [y0, y1] = d3.extent(pts, (p) => p.y);
  const k = clamp(0.6 / Math.max((x1 - x0) / W, (y1 - y0) / H, 0.05), 1, 12);
  flyTo(d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
}

function filtersActive() { return Boolean(state.month || state.budget || state.tags.size); }

function matches(id) {
  const guide = guides[id];
  if (!guide) return false;
  if (state.month && !(guide.bestMonths || []).includes(state.month)) return false;
  if (state.budget && !(guide.budgetPerDay <= state.budget)) return false;
  for (const tag of state.tags) if (!(guide.tags || []).includes(tag)) return false;
  return true;
}

// Colours the map: guides (or, with a filter on, the guides that match), the selection and the trip
function paint() {
  if (!layers.countries) return;
  const active = filtersActive();
  const inTrip = new Set(trip.stops.map((s) => s.id));
  // A state is coloured for its country's guide, trip stops and selection as well as its own
  const either = (c, test) => test(c.id) || Boolean(c.within && test(c.within));
  const classes = (c) => !c ? "country none" : [
    "country",
    either(c, (id) => guides[id] && (!active || matches(id))) ? "guide" : "",
    either(c, (id) => inTrip.has(id)) ? "in-trip" : "",
    either(c, (id) => id === state.selected) ? "selected" : "",
  ].join(" ");
  layers.countries.attr("class", (f) => classes(f.country));
  layers.dots.attr("class", (d) => `marker dot ${classes(d.country)}`);
  layers.pins
    .classed("show", (d) => d.id === state.selected)
    .classed("active", (d) => d.id === state.selected && d.place.id === state.place);
}

function drawTrip() {
  if (!layers.trip) return;
  const points = trip.stops.map((stop, i) => { const info = stopInfo(stop); return { n: i + 1, lng: info.lng, lat: info.lat, ...xy(info.lng, info.lat) }; });
  layers.route.attr("d", points.length > 1 ? path({ type: "LineString", coordinates: points.map((p) => [p.lng, p.lat]) }) : null);
  const marks = layers.trip.selectAll("g").data(points).join("g").attr("class", "marker stop");
  marks.selectAll("*").remove();
  marks.append("circle").attr("r", 9);
  marks.append("text").attr("y", 3.5).text((d) => d.n);
  rescale();
}

// ---------- the panel ----------

function showTab(tab) {
  if (tab === "trip" && state.tab !== "trip") fitTrip();
  state.tab = tab;
  for (const btn of document.querySelectorAll(".tabs button")) {
    if (btn.dataset.tab === tab) btn.setAttribute("aria-current", "page"); else btn.removeAttribute("aria-current");
  }
  render();
}

function select(id, opts = {}) {
  state.selected = id;
  state.place = opts.place || null;
  const country = byId.get(id);
  const place = state.place && guides[id].places.find((p) => p.id === state.place);
  if (place) flyToPoint(place.lng, place.lat, Math.max(zoomK, 9)); else flyToCountry(country);
  history.replaceState(null, "", `#c=${id}`);
  paint();
  showTab("discover");
}

function clearSelection() {
  state.selected = state.place = null;
  history.replaceState(null, "", location.pathname);
  paint();
  render();
}

function render() {
  if (state.tab === "trip") renderTrip();
  else if (state.selected) renderDestination();
  else renderDiscover();
  panel.scrollTop = 0;
}

function renderDiscover() {
  const tags = [...new Set(Object.values(guides).flatMap((g) => g.tags || []))].sort();
  const refresh = () => { renderResults(); paint(); };

  const search = h("input", {
    type: "search", id: "search", placeholder: "Search countries and places", autocomplete: "off", value: state.query,
    oninput: (e) => { state.query = e.target.value; filters.hidden = Boolean(state.query.trim()); renderResults(); },
  });

  const month = h("select", { id: "f-month", onchange: (e) => { state.month = Number(e.target.value); refresh(); } },
    h("option", { value: 0, text: "Any month" }),
    MONTHS_LONG.map((name, i) => h("option", { value: i + 1, text: name, selected: state.month === i + 1 })));
  const budget = h("select", { id: "f-budget", onchange: (e) => { state.budget = Number(e.target.value); refresh(); } },
    h("option", { value: 0, text: "Any budget" }),
    [50, 100, 150].map((n) => h("option", { value: n, text: `Up to ${money(n)} a day`, selected: state.budget === n })));
  const chips = tags.map((tag) => h("button", {
    type: "button", class: "chip", text: tag, "aria-pressed": String(state.tags.has(tag)),
    onclick: (e) => {
      if (state.tags.has(tag)) state.tags.delete(tag); else state.tags.add(tag);
      e.currentTarget.setAttribute("aria-pressed", String(state.tags.has(tag)));
      refresh();
    },
  }));

  const filters = h("div", { class: "filters", hidden: Boolean(state.query.trim()) },
    h("div", { class: "field-row" },
      h("label", { for: "f-month" }, h("span", { text: "When" }), month),
      h("label", { for: "f-budget" }, h("span", { text: "Budget per person" }), budget)),
    h("div", { class: "chips", role: "group", "aria-label": "Interests" }, chips));

  panel.replaceChildren(
    h("h1", { text: "Where to?" }),
    h("p", { class: "lede", text: "Click any country on the map, or narrow down the guides below." }),
    h("label", { class: "sr-only", for: "search", text: "Search countries and places" }),
    search, filters,
    h("div", { id: "results" }),
    credits());
  renderResults();
}

function renderResults() {
  const box = $("#results");
  if (!box) return;
  const q = state.query.trim().toLowerCase();

  if (q) {
    const rows = [];
    for (const c of countries) {
      // A state also comes up under its country's name
      const whole = byId.get(c.within);
      if (c.name.toLowerCase().includes(q)) rows.push({ rank: c.name.toLowerCase().startsWith(q) ? 0 : 1, label: `${c.flag} ${c.name}`, sub: guides[c.id] ? "Guide" : whole?.name || c.region, go: () => select(c.id) });
      else if (c.group?.toLowerCase().includes(q)) rows.push({ rank: 2, label: `${c.flag} ${c.name}`, sub: c.group, go: () => select(c.id) });
      else if (whole?.name.toLowerCase().includes(q)) rows.push({ rank: 2, label: `${c.flag} ${c.name}`, sub: whole.name, go: () => select(c.id) });
      for (const p of guides[c.id]?.places || []) {
        if (p.name.toLowerCase().includes(q)) rows.push({ rank: 1, label: p.name, sub: c.name, go: () => select(c.id, { place: p.id }) });
      }
    }
    rows.sort((a, b) => a.rank - b.rank);
    box.replaceChildren(rows.length
      ? h("ul", { class: "rows" }, rows.slice(0, 14).map((r) => h("li", null,
          h("button", { type: "button", class: "row", onclick: r.go }, h("span", { text: r.label }), h("span", { class: "muted", text: r.sub })))))
      : h("p", { class: "empty", text: "Nothing matches that search." }));
    return;
  }

  const all = Object.keys(guides).filter((id) => byId.has(id)).sort((a, b) => byId.get(a).name.localeCompare(byId.get(b).name));
  const shown = all.filter(matches);
  const heading = filtersActive() ? `${shown.length} of ${plural(all.length, "guide")} match` : plural(all.length, "guide");
  box.replaceChildren(
    h("h2", { class: "section", text: heading }),
    shown.length
      ? h("ul", { class: "cards" }, shown.map((id) => {
          const c = byId.get(id), g = guides[id];
          const meta = [g.bestMonths && `Best ${monthRanges(g.bestMonths)}`, g.budgetPerDay && `about ${money(g.budgetPerDay)} a day`].filter(Boolean).join(" · ");
          return h("li", null, h("button", { type: "button", class: "card", onclick: () => select(id) },
            h("span", { class: "card-title" }, h("span", { class: "flag", text: c.flag, "aria-hidden": "true" }), c.name),
            h("span", { class: "card-text", text: g.summary }),
            h("span", { class: "muted", text: meta })));
        }))
      : h("p", { class: "empty", text: "No guides match those choices yet. Try removing one." }));
}

function credits() {
  return h("p", { class: "credits", text: "Map shapes: Natural Earth. Country facts: mledoze/countries (ODbL). Road distances: OSRM, © OpenStreetMap contributors. Airports: OurAirports." });
}

function monthStrip(best) {
  return h("div", { class: "months", role: "img", "aria-label": `Best months: ${monthRanges(best)}` },
    MONTHS.map((m, i) => h("span", { class: best.includes(i + 1) ? "on" : "", text: m.charAt(0), title: MONTHS_LONG[i] })));
}

function renderDestination() {
  const c = byId.get(state.selected), g = guides[c.id], whole = byId.get(c.within);
  const facts = [
    ["Capital", c.capital],
    ["Currency", c.currencies.join(", ")],
    ["Languages", c.languages.join(", ")],
    ["Dialling code", c.dial],
  ].filter(([, value]) => value);

  const kids = [
    h("button", { type: "button", class: "back", text: "← All destinations", onclick: clearSelection }),
    h("div", { class: "dest-head" },
      h("span", { class: "flag big", text: c.flag, "aria-hidden": "true" }),
      h("div", null,
        h("h1", null, c.name, g?.status === "draft" && h("span", { class: "badge", text: "Draft" })),
        h("p", { class: "muted", text: [whole ? [c.group, whole.name].filter(Boolean).join(", ") : c.subregion || c.region, c.capital && `Capital ${c.capital}`].filter(Boolean).join(" · ") }))),
    h("div", { class: "actions" },
      h("button", { type: "button", class: "primary", text: "Add to my trip", onclick: () => addStop(c.id) }),
      placesIn(c.id).length > 0 && h("button", { type: "button", class: "small", text: "Build me a trip here", onclick: () => {
        state.build = { ids: [c.id], nights: g?.nights?.[0] || state.build.nights };
        showTab("trip");
      } })),
  ];

  if (g) {
    kids.push(h("p", { class: "summary", text: g.summary }));
    if (g.bestMonths) kids.push(
      h("h2", { class: "section", text: "Best time to go" }),
      monthStrip(g.bestMonths),
      h("p", { class: "note", text: [monthRanges(g.bestMonths) + ".", g.bestTimeNote].filter(Boolean).join(" ") }));
    const stats = [
      g.budgetPerDay && ["Budget", `About ${money(g.budgetPerDay)} a day`, "per person, before flights"],
      g.nights && ["How long", `${g.nights[0]}–${g.nights[1]} nights`, "suggested stay"],
    ].filter(Boolean);
    if (stats.length) kids.push(h("div", { class: "stats" }, stats.map(([label, value, sub]) =>
      h("div", { class: "stat" }, h("span", { class: "stat-l", text: label }), h("span", { class: "stat-v", text: value }), h("span", { class: "stat-l", text: sub })))));
    if (g.tags?.length) kids.push(h("p", { class: "tags" }, g.tags.map((t) => h("span", { class: "tag", text: t }))));

    if (g.places?.length) kids.push(
      h("h2", { class: "section", text: "Places" }),
      h("ul", { class: "places" }, g.places.map((p) => h("li", { class: p.id === state.place ? "active" : "", "data-place": p.id },
        h("div", null,
          h("button", { type: "button", class: "link", text: p.name, onclick: () => select(c.id, { place: p.id }) }),
          PLACE_TYPES[p.type] && h("span", { class: "muted", text: ` · ${PLACE_TYPES[p.type]}` }),
          h("p", { text: p.blurb }),
          airportsText(c.id, p.id) && h("p", { class: "muted", text: airportsText(c.id, p.id) }),
          bookRow(partnerLinks(c, p), p.links)),
        h("button", { type: "button", class: "small", text: "Add", "aria-label": `Add ${p.name} to my trip`, onclick: () => addStop(c.id, p.id) })))));

    if (g.itineraries?.length) kids.push(
      h("h2", { class: "section", text: "Ready-made itineraries" }),
      ...g.itineraries.map((it) => h("div", { class: "itinerary" },
        h("div", null,
          h("strong", { text: it.name }),
          h("p", { text: it.stops.map((s) => `${g.places.find((p) => p.id === s.place).name} ${s.nights}`).join(" → ") + " nights" })),
        h("button", { type: "button", class: "small", text: "Use this", onclick: () => useItinerary(c.id, it) }))));

    if (g.tips?.length) kids.push(h("h2", { class: "section", text: "Good to know" }), h("ul", { class: "tips" }, g.tips.map((t) => h("li", { text: t }))));
  } else if (whole && guides[whole.id]) {
    kids.push(h("p", { class: "empty" }, `There's no guide for ${c.name} on its own yet. It's covered by the `,
      h("button", { type: "button", class: "link", text: `${whole.name} guide`, onclick: () => select(whole.id) }), "."));
  } else {
    kids.push(h("p", { class: "empty", text: `There's no guide for ${c.name} yet. You can still add it to your trip.` }));
  }

  if (c.parts.length) kids.push(
    h("h2", { class: "section", text: "Explore by area" }),
    h("p", { class: "tags" }, c.parts.map((part) => h("button", { type: "button", class: "tag", text: part.name, onclick: () => select(part.id) }))));

  const booking = bookRow(partnerLinks(c), g?.links);
  if (booking) kids.push(h("h2", { class: "section", text: "Book it" }), booking);

  kids.push(
    h("h2", { class: "section", text: "Facts" }),
    h("dl", { class: "facts" }, facts.flatMap(([label, value]) => [h("dt", { text: label }), h("dd", { text: value })])),
    credits());
  panel.replaceChildren(...kids);
  disclose(panel, panel.querySelector(".credits"));
  const active = panel.querySelector(".places .active");
  if (active) active.scrollIntoView({ block: "center" });
}

function renderTrip() {
  const field = (label, input) => h("label", null, h("span", { text: label }), input);
  const body = h("div", { id: "trip-body" });
  panel.replaceChildren(
    h("h1", { text: "My trip" }),
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
    h("summary", { text: "Build a trip for me" }),
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
      h("button", { type: "button", class: "primary", text: "Build my trip", disabled: !chosen.length, onclick: () => {
        if (trip.stops.length && !confirm("Replace the stops already in your trip?")) return;
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
  if (!trip.stops.length) {
    body.replaceChildren(h("p", { class: "empty", text: "No stops yet. Build a trip above, or pick a country on the map and choose “Add to my trip”." }),
      h("button", { type: "button", class: "primary", text: "Browse destinations", onclick: () => showTab("discover") }));
    return;
  }

  const plan = tripPlan();
  const change = (fn) => () => { fn(); saveTrip(); renderTripBody(); };
  const move = (i, by) => change(() => { const [s] = trip.stops.splice(i, 1); trip.stops.splice(i + by, 0, s); });

  const stops = h("ol", { class: "stops" }, plan.stops.map((s, i) => h("li", null,
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
        h("button", { type: "button", class: "icon", text: "↑", "aria-label": `Move ${s.info.name} earlier`, disabled: i === 0, onclick: move(i, -1) }),
        h("button", { type: "button", class: "icon", text: "↓", "aria-label": `Move ${s.info.name} later`, disabled: i === plan.stops.length - 1, onclick: move(i, 1) }),
        h("button", { type: "button", class: "icon", text: "✕", "aria-label": `Remove ${s.info.name}`, onclick: change(() => { trip.stops.splice(i, 1); }) }))))));

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
    h("button", { type: "button", class: "small danger", text: "Clear trip", onclick: () => {
      if (!confirm("Clear the whole trip?")) return;
      trip = emptyTrip(); saveTrip(); renderTrip();
    } }),
  ];
  // The planning offer goes to a booking or payment page if site.json has one, and otherwise to an email with the trip in it
  const planning = site.planning || {};
  const paid = /^https:\/\//.test(planning.url || "");
  const page = !paid && /^[a-z0-9][a-z0-9/-]*$/.test(planning.page || "") ? planning.page + "#start" : "";
  const offer = paid || page || site.contactEmail;
  if (offer) actions.unshift(h("a", { class: "small primary",
    href: paid ? planning.url : page || `mailto:${site.contactEmail}?subject=${encodeURIComponent("Help planning: " + (trip.name || "my trip"))}&body=${encodeURIComponent(text() + "\n\n" + link())}`,
    target: paid && "_blank", rel: paid && "noopener",
    text: planning.label || "Ask for help with this trip" }));

  body.replaceChildren(...[
    stops,
    h("div", { class: "stats" }, stats.map(([label, value, sub]) =>
      h("div", { class: "stat" }, h("span", { class: "stat-l", text: label }), h("span", { class: "stat-v", text: value }), h("span", { class: "stat-l", text: sub })))),
    offer && planning.text && h("p", { class: "note", text: planning.text }),
    h("div", { class: "actions" }, actions),
    h("h2", { class: "section", text: "Before you go" }),
    h("ul", { class: "checklist" }, CHECKLIST.map(([key, label]) => h("li", null, h("label", null,
      h("input", { type: "checkbox", checked: Boolean(trip.checks[key]), onchange: (e) => { if (e.target.checked) trip.checks[key] = true; else delete trip.checks[key]; saveTrip(); } }),
      h("span", { text: label })))))].filter(Boolean));
  disclose(body, body.querySelector(".checklist").previousSibling);
}

// ---------- start ----------

function openFromHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  const shared = params.get("trip") && tripFromHash(params.get("trip"));
  if (shared && shared.stops.length) {
    if (!trip.stops.length || confirm("Open the shared trip? It replaces the trip saved in this browser.")) { trip = shared; saveTrip(); }
    history.replaceState(null, "", location.pathname);
    return showTab("trip");
  }
  if (byId.has(params.get("c"))) return select(params.get("c"));
  render();
}

async function start() {
  const load = (name) => fetch(`data/${name}.json`).then((r) => { if (!r.ok) throw new Error(`${name}: ${r.status}`); return r.json(); });
  let world;
  try {
    let written;
    [world, countries, guides, site, written, distances, airports] = await Promise.all([load("world"), load("countries"), load("guides"), load("site"),
      load("legs").catch(() => []), load("distances").catch(() => ({})), load("airports").catch(() => airports)]);
    for (const leg of written) legs.set([leg.from, leg.to].sort().join(" "), leg);
  } catch (err) {
    console.error(err);
    panel.replaceChildren(h("p", { class: "empty", text: "The map data didn't load. Check your connection and reload the page." }));
    return;
  }
  for (const c of countries) { c.features = []; c.parts = []; byId.set(c.id, c); }
  for (const c of countries) byId.get(c.within)?.parts.push(c); // a country's states
  const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: site.currency || "GBP", maximumFractionDigits: 0 });
  money = (n) => currency.format(n);

  try { trip = cleanTrip(JSON.parse(localStorage.getItem(TRIP_KEY))); } catch { trip = emptyTrip(); }
  buildMap(world);
  saveTrip();

  for (const btn of document.querySelectorAll(".tabs button")) btn.addEventListener("click", () => showTab(btn.dataset.tab));
  $("#theme-btn").addEventListener("click", () => {
    const now = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = now === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("tcw.theme", next); } catch { /* storage blocked: lasts for this visit */ }
  });
  openFromHash();
}

start();
})();
