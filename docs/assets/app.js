// The Corner World: every country on the map, scored out of 10, with filters and a panel for each.
// The globe itself (drawing, dragging, zooming) is assets/globe.js.
// Data: data/world.json (map shapes), data/countries.json (basic facts, both built by
// scripts/build-data.mjs) and data/site.json (settings).
// Top 3 things to do in each country: data/activities.json (hand-written).
// The main cities for visitors in each country, each with its top 3: data/cities.json (hand-written).
// The weather month by month: data/weather.json (built by scripts/build-weather.mjs).
// Scores out of 10 for each country: data/ratings.json (hand-written, or with npm run rate).
(function () {
"use strict";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// Where the globe turns to when a part of the world is chosen: the middle, and the angle across it (radians)
const REGIONS = {
  Africa: { lng: 18, lat: 3, r: 0.78 }, Americas: { lng: -82, lat: 8, r: 1.25 }, Asia: { lng: 95, lat: 30, r: 0.85 },
  Europe: { lng: 14, lat: 51, r: 0.42 }, Oceania: { lng: 150, lat: -24, r: 0.62 },
};
// Line icons, drawn on a 24 by 24 grid
const ICONS = {
  search: "M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM21 21l-4.3-4.3",
  back: "M19 12H5M11 18l-6-6 6-6",
  settings: "M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
};

const $ = (sel) => document.querySelector(sel);
const panel = $("#panel"), stage = $("#globe"), sheet = $("#sheet"), tip = $("#tip");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone = matchMedia("(max-width: 820px)");

let countries = [], byId = new Map(), ratings = { categories: [], scores: {} }, activities = {}, weather = {}, site = { partners: [] };
// Cities by country id: [{ id, name, lat, lng, todo, country }], in order of importance, and every city by id
let cities = {};
const cityById = new Map();

// ---------- getting there ----------

// The Budget score in ratings.json is what a country costs once you're there. What it costs a visitor also
// depends on the flights from home, so the Budget score shown is the average of the two: the cost there and
// a score for the flights, worked out from how far the place is from the visitor's home. Home is guessed
// from the browser's time zone (nothing is sent anywhere: the site makes no outside requests, so it can't
// look up an IP address) and the visitor can change it under "Flying from"; their choice is kept in the browser.
const BUDGET = 2; // where Budget friendly is among the categories
const HOME_KEY = "tcw.home";
// Time zone to home (a country, or a state where a country's are on the map)
const ZONES = {
  "Europe/London": "GBR", "Europe/Belfast": "GBR", "Europe/Dublin": "IRL", "Europe/Paris": "FRA", "Europe/Berlin": "DEU", "Europe/Madrid": "ESP",
  "Europe/Lisbon": "PRT", "Europe/Rome": "ITA", "Europe/Amsterdam": "NLD", "Europe/Brussels": "BEL", "Europe/Luxembourg": "LUX", "Europe/Zurich": "CHE",
  "Europe/Vienna": "AUT", "Europe/Prague": "CZE", "Europe/Warsaw": "POL", "Europe/Budapest": "HUN", "Europe/Bratislava": "SVK", "Europe/Ljubljana": "SVN",
  "Europe/Zagreb": "HRV", "Europe/Belgrade": "SRB", "Europe/Sarajevo": "BIH", "Europe/Skopje": "MKD", "Europe/Tirane": "ALB", "Europe/Podgorica": "MNE",
  "Europe/Athens": "GRC", "Europe/Sofia": "BGR", "Europe/Bucharest": "ROU", "Europe/Chisinau": "MDA", "Europe/Kiev": "UKR", "Europe/Kyiv": "UKR",
  "Europe/Minsk": "BLR", "Europe/Vilnius": "LTU", "Europe/Riga": "LVA", "Europe/Tallinn": "EST", "Europe/Helsinki": "FIN", "Europe/Stockholm": "SWE",
  "Europe/Oslo": "NOR", "Europe/Copenhagen": "DNK", "Atlantic/Reykjavik": "ISL", "Europe/Malta": "MLT", "Asia/Nicosia": "CYP", "Europe/Istanbul": "TUR",
  "Europe/Moscow": "RUS", "Atlantic/Canary": "ES-GCA", "Atlantic/Madeira": "PT-30", "Atlantic/Azores": "PT-20",
  "America/New_York": "US-NY", "America/Detroit": "US-MI", "America/Indiana/Indianapolis": "US-IN", "America/Kentucky/Louisville": "US-KY",
  "America/Chicago": "US-IL", "America/Denver": "US-CO", "America/Boise": "US-ID", "America/Phoenix": "US-AZ", "America/Los_Angeles": "US-CA",
  "America/Anchorage": "US-AK", "Pacific/Honolulu": "US-HI",
  "America/Toronto": "CA-ON", "America/Montreal": "CA-QC", "America/Vancouver": "CA-BC", "America/Edmonton": "CA-AB", "America/Winnipeg": "CA-MB",
  "America/Regina": "CA-SK", "America/Halifax": "CA-NS", "America/St_Johns": "CA-NL", "America/Moncton": "CA-NB",
  "America/Mexico_City": "MEX", "America/Cancun": "MEX", "America/Monterrey": "MEX", "America/Tijuana": "MEX", "America/Guatemala": "GTM",
  "America/Belize": "BLZ", "America/El_Salvador": "SLV", "America/Tegucigalpa": "HND", "America/Managua": "NIC", "America/Costa_Rica": "CRI",
  "America/Panama": "PAN", "America/Havana": "CUB", "America/Jamaica": "JAM", "America/Santo_Domingo": "DOM", "America/Puerto_Rico": "PRI",
  "America/Port_of_Spain": "TTO", "America/Barbados": "BRB", "America/Bogota": "COL", "America/Caracas": "VEN", "America/Lima": "PER",
  "America/Guayaquil": "ECU", "America/La_Paz": "BOL", "America/Santiago": "CHL", "America/Argentina/Buenos_Aires": "ARG", "America/Buenos_Aires": "ARG",
  "America/Montevideo": "URY", "America/Asuncion": "PRY", "America/Sao_Paulo": "BRA", "America/Fortaleza": "BRA", "America/Manaus": "BRA",
  "Africa/Casablanca": "MAR", "Africa/Algiers": "DZA", "Africa/Tunis": "TUN", "Africa/Cairo": "EGY", "Africa/Lagos": "NGA", "Africa/Accra": "GHA",
  "Africa/Dakar": "SEN", "Africa/Abidjan": "CIV", "Africa/Nairobi": "KEN", "Africa/Addis_Ababa": "ETH", "Africa/Dar_es_Salaam": "TZA",
  "Africa/Kampala": "UGA", "Africa/Kigali": "RWA", "Africa/Lusaka": "ZMB", "Africa/Harare": "ZWE", "Africa/Maputo": "MOZ", "Africa/Windhoek": "NAM",
  "Africa/Gaborone": "BWA", "Africa/Johannesburg": "ZAF", "Indian/Mauritius": "MUS", "Indian/Antananarivo": "MDG",
  "Asia/Dubai": "ARE", "Asia/Qatar": "QAT", "Asia/Bahrain": "BHR", "Asia/Kuwait": "KWT", "Asia/Riyadh": "SAU", "Asia/Muscat": "OMN",
  "Asia/Amman": "JOR", "Asia/Beirut": "LBN", "Asia/Jerusalem": "ISR", "Asia/Baghdad": "IRQ", "Asia/Tehran": "IRN", "Asia/Tbilisi": "GEO",
  "Asia/Yerevan": "ARM", "Asia/Baku": "AZE", "Asia/Almaty": "KAZ", "Asia/Tashkent": "UZB", "Asia/Bishkek": "KGZ", "Asia/Karachi": "PAK",
  "Asia/Kabul": "AFG", "Asia/Kolkata": "IND", "Asia/Calcutta": "IND", "Asia/Kathmandu": "NPL", "Asia/Dhaka": "BGD", "Asia/Colombo": "LKA",
  "Indian/Maldives": "MDV", "Asia/Thimphu": "BTN", "Asia/Yangon": "MMR", "Asia/Bangkok": "THA", "Asia/Vientiane": "LAO", "Asia/Phnom_Penh": "KHM",
  "Asia/Ho_Chi_Minh": "VNM", "Asia/Saigon": "VNM", "Asia/Kuala_Lumpur": "MY-PM", "Asia/Kuching": "MY-EM", "Asia/Singapore": "SGP",
  "Asia/Jakarta": "ID-JW", "Asia/Makassar": "ID-BA", "Asia/Manila": "PHL", "Asia/Shanghai": "CHN", "Asia/Hong_Kong": "HKG", "Asia/Macau": "MAC",
  "Asia/Taipei": "TWN", "Asia/Seoul": "KOR", "Asia/Tokyo": "JPN", "Asia/Ulaanbaatar": "MNG", "Asia/Novosibirsk": "RUS", "Asia/Yekaterinburg": "RUS",
  "Asia/Vladivostok": "RUS",
  "Australia/Sydney": "AU-NSW", "Australia/Melbourne": "AU-VIC", "Australia/Brisbane": "AU-QLD", "Australia/Perth": "AU-WA",
  "Australia/Adelaide": "AU-SA", "Australia/Hobart": "AU-TAS", "Australia/Darwin": "AU-NT", "Australia/Canberra": "AU-ACT",
  "Pacific/Auckland": "NZL", "Pacific/Fiji": "FJI", "Pacific/Tahiti": "PYF", "Pacific/Guam": "GUM",
};
// Where people fly from and to in countries whose middle is far from their main airports (lat, lng, and a
// name for the place). Other places use the middle of their shape.
const HUBS = {
  GBR: [51.5, -0.1, "London"], RUS: [55.8, 37.6, "Moscow"], CAN: [43.7, -79.4, "Toronto"], AUS: [-33.9, 151.2, "Sydney"],
  CHN: [31.2, 121.5, "Shanghai"], BRA: [-23.5, -46.6, "São Paulo"], USA: [40.7, -74, "New York"], CHL: [-33.4, -70.7, "Santiago"],
  ARG: [-34.6, -58.4, "Buenos Aires"], NOR: [59.9, 10.8, "Oslo"], SWE: [59.3, 18.1, "Stockholm"], FIN: [60.2, 24.9, "Helsinki"],
  IDN: [-8.4, 115.2, "Bali"], KAZ: [43.2, 76.9, "Almaty"], EGY: [30, 31.2, "Cairo"], ZAF: [-33.9, 18.4, "Cape Town"], NZL: [-36.8, 174.8, "Auckland"],
};
// Names that read with "the" in front
const THE = new Set(["USA", "NLD", "PHL", "ARE", "BHS", "GMB", "CZE", "DOM", "CAF", "COD", "MDV", "SYC", "SLB", "MHL", "COM", "CYM", "VGB", "VIR", "TCA", "FRO", "FLK"]);
// Flight score by distance (km): short hops score 10, the other side of the world 2
const FLIGHT_STEPS = [[0, 10], [1000, 9.5], [2500, 8], [5000, 6.5], [8000, 5], [11000, 3.5], [14000, 2.5], [17000, 2]];

const where = (c) => (HUBS[c.id] ? { lat: HUBS[c.id][0], lng: HUBS[c.id][1] } : { lat: c.lat, lng: c.lng });
const homeName = (c) => HUBS[c.id]?.[2] || (THE.has(c.id) ? `the ${c.name}` : c.name);

function guessHome() {
  try { const kept = localStorage.getItem(HOME_KEY); if (byId.has(kept)) return kept; } catch { /* storage blocked */ }
  let zone = "";
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { /* no time zone */ }
  return byId.has(ZONES[zone]) ? ZONES[zone] : "GBR";
}
function setHome(id) {
  state.home = id;
  scoreCache.clear();
  try { localStorage.setItem(HOME_KEY, id); } catch { /* storage blocked: lasts for this visit */ }
}

// How far a place is from home, in km, and the flight score for that
function getThere(c) {
  const home = byId.get(state.home);
  if (!home || !c) return null;
  const a = where(home), b = c.within ? { lat: c.lat, lng: c.lng } : where(c);
  const km = Math.round(d3.geoDistance([a.lng, a.lat], [b.lng, b.lat]) * 6371);
  let i = 1;
  while (i < FLIGHT_STEPS.length - 1 && km > FLIGHT_STEPS[i][0]) i++;
  const [[k0, s0], [k1, s1]] = [FLIGHT_STEPS[i - 1], FLIGHT_STEPS[i]];
  return { km, score: clamp(s0 + (s1 - s0) * (km - k0) / (k1 - k0), s1, s0), from: homeName(home) };
}

// A country's scores: { parts: [food, activities, budget, family, safety], likes: [beaches, history, wildlife,
// hiking, relax], overall, there, flight } with overall the average of six numbers, to one decimal place: the
// five parts and the best of the likes (a country is judged by what it does best, not by what it lacks). The
// budget part includes the flights from home (see "getting there"); `there` is the cost there alone and
// `flight` the distance and its score. A state or island without its own scores takes its country's. Null if unscored.
const scoreCache = new Map();
function scoreOf(c) {
  if (!c) return null;
  if (scoreCache.has(c.id)) return scoreCache.get(c.id);
  const all = ratings.scores[c.id] || ratings.scores[c.within];
  let score = null;
  if (all?.length) {
    const n = ratings.categories.length, parts = all.slice(0, n);
    const there = parts[BUDGET], flight = getThere(c);
    if (flight && there != null) parts[BUDGET] = clamp(Math.round((there + flight.score) / 2), 1, 10);
    const likes = all.slice(n), six = [...parts, ...(likes.length ? [Math.max(...likes)] : [])];
    score = { parts, likes, there, flight, overall: Math.round(six.reduce((a, b) => a + b, 0) / six.length * 10) / 10 };
  }
  scoreCache.set(c.id, score);
  return score;
}
// A score out of 10 for each name, as bars in the colour of the score
function bars(names, scores, colour) {
  return h("ul", { class: "rating-bars" }, names.map((name, i) => h("li", null,
    h("span", { text: name }),
    h("span", { class: "bar", "aria-hidden": "true" }, Object.assign(h("i"), { style: `width: ${scores[i] * 10}%; background: ${colour(scores[i])}` })),
    h("b", { text: String(scores[i]) }))));
}
// Score to colour, as on the map (SCORE_STOPS in assets/globe.js): red for the lowest to green for the highest.
// Read from the theme each time, so it follows light and dark.
function scoreScale() {
  const css = getComputedStyle($("#globe") || document.body);
  return d3.scaleLinear().domain([2.5, 5, 6.5, 8.5]).range(["--g-s1", "--g-s2", "--g-s3", "--g-s4"].map((v) => css.getPropertyValue(v).trim())).interpolate(d3.interpolateRgb).clamp(true);
}
const scoreText = (n) => n.toFixed(1);
// A place's months with great weather (data/weather.json), 1 to 12. Every state, island and region has its own
// (Lofoten and Oslo are good at different times); only one without falls back on its country's.
const weatherOf = (id) => weather[id] || weather[byId.get(id)?.within];
const greatMonths = (id) => weatherOf(id)?.m?.flatMap((m, i) => (m[3] === "G" ? [i + 1] : [])) || [];
// What a score of 8 or more in a category earns a country, as "Great for" filters and on its card
const GREAT = 8;
// A place is worth going at a time its weather isn't Great when that time has something only it has: the northern
// lights, the midnight sun (`s` in weather.json, from scripts/weather-points.json), or snow for one with a Skiing score
// of 8 or more: December to March north of the equator, June to September south of it.
const SKI_NORTH = [12, 1, 2, 3], SKI_SOUTH = [6, 7, 8, 9];
function seasons(id) {
  const c = byId.get(id), all = { ...(weatherOf(id)?.s || {}) };
  const ski = ratings.interests.indexOf("Skiing"), score = scoreOf(c);
  if (ski >= 0 && score?.likes[ski] >= GREAT) all.Skiing = c.lat < 0 ? SKI_SOUTH : SKI_NORTH;
  return all;
}
// The months a place is good to go: great weather, or one of its seasons
const goodMonths = (id) => [...new Set([...greatMonths(id), ...Object.values(seasons(id)).flat()])];
// Why: "Great weather Jun–Aug · Northern lights Sep–Mar · Midnight sun May–Jul"
function whenText(id) {
  const best = greatMonths(id);
  return [best.length && `Great weather ${monthRanges(best)}`, ...Object.entries(seasons(id)).map(([what, months]) => `${what} ${monthRanges(months)}`)].filter(Boolean).join(" · ");
}
// "Hot weather": an average high of HOT °C or more in the month chosen, or, with no month chosen, in at least
// HOT_MONTHS months of the year
const HOT = 27, HOT_MONTHS = 4;
function hot(id, month) {
  const m = weatherOf(id)?.m;
  if (!m) return false;
  return month ? m[month - 1][0] >= HOT : m.filter((x) => x[0] >= HOT).length >= HOT_MONTHS;
}
const GREAT_LABELS = ["Food", "Activities", "Budget", "Families", "Safety"];
// The destinations the list and "Surprise me" choose from: every country, state, island and region with scores of
// its own. Each is judged on its own scores and weather, not its country's.
const listed = () => countries.filter((c) => ratings.scores[c.id]).map((c) => c.id);

function scoreBadge(score, colour) {
  // Styles go on through the DOM: the security policy blocks style="" attributes
  const badge = h("span", { class: "score", title: `Scores ${scoreText(score.overall)} out of 10`, text: scoreText(score.overall) });
  badge.style.setProperty("--score", colour);
  return badge;
}
let globe = null;
const state = { home: "GBR", info: "todo", selected: null, city: null, query: "", sort: "score", month: 0, hot: false, region: "", great: new Set(), likes: new Set(), scroll: 0 };

// ---------- small helpers ----------

// Builds an element. Text always goes in as text, never as HTML.
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

// ---------- booking links ----------

const DISCLOSURE = "Some links earn The Corner World a commission if you book, at no extra cost to you.";

// The partners in site.json as links for a country, with the {gaps} in their addresses filled in. There are
// no dates or travellers to give them.
function partnerLinks(country, place = country.name) {
  const fill = { place, country: country.name, checkin: "", checkout: "", travellers: "" };
  return (site.partners || []).map((p) => ({
    label: p.label,
    url: String(p.url || "").replace(/\{(\w+)\}/g, (gap, key) => (key in fill ? encodeURIComponent(fill[key]) : gap)),
  }));
}

// A row of booking links. Nothing if there are none.
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

// Where to point the map to take in a country: the middle of its land and the angle across it (in radians).
// A country is framed to fill about 80% of the free map: its outline's circle is padded by a tenth, so near 1 (the circle overstates most shapes)
// Malaysia is two halves with the sea between, so its size alone frames only one of them
const FRAMES = { MYS: { lng: 109.6, lat: 3.6, r: 0.16, fill: 1 } };
function frameOf(country) {
  if (country.frame) return country.frame;
  if (FRAMES[country.id]) return (country.frame = FRAMES[country.id]);
  // A country drawn mostly as its states is framed by its size, as is one too small for a shape
  const spread = drawnAsStates(country);
  const bySize = { lng: country.lng, lat: country.lat, r: clamp(Math.sqrt(country.area / Math.PI) / 6371 * 1.8, 0.004, 1.3), fill: 1 };
  if (!country.features.length || spread) return (country.frame = bySize);
  const polygons = country.features.flatMap((f) => f.geometry.type === "MultiPolygon"
    ? f.geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }))
    : [f.geometry]);
  // A ring squashed flat by the map's simplification can read as "everything but this island": skip those
  const sized = polygons.map((p) => [p, d3.geoArea(p)]).filter(([, area]) => area < Math.PI);
  if (!sized.length) return (country.frame = bySize);
  // The largest piece of land, and every island near it worth seeing, so a click on Hawaii or the Bahamas shows the
  // whole group, not one island of it. An island counts if it is at least 1% the size of the largest piece and lies
  // within 800 km of the group (or one and a half times the largest piece's reach, for a big one), so far-off
  // territories (France's in South America, New Zealand's Chatham Islands) don't pull the view out to sea.
  const pieces = sized.map(([p, area]) => {
    const middle = d3.geoCentroid(p);
    return { p, area, middle, r: Math.max(...p.coordinates[0].map((point) => d3.geoDistance(middle, point))) };
  });
  const main = pieces.reduce((a, b) => (b.area > a.area ? b : a));
  const reach = Math.max(800 / 6371, main.r * 1.5), least = main.area * 0.01;
  const group = [main];
  for (let grew = true; grew;) {
    grew = false;
    for (const x of pieces) {
      if (group.includes(x) || x.area < least) continue;
      if (group.some((g) => d3.geoDistance(g.middle, x.middle) - g.r - x.r < reach)) { group.push(x); grew = true; }
    }
  }
  const middle = d3.geoCentroid({ type: "MultiPolygon", coordinates: group.map((g) => g.p.coordinates) });
  const r = Math.max(...group.flatMap((g) => g.p.coordinates[0].map((point) => d3.geoDistance(middle, point))));
  return (country.frame = { lng: middle[0], lat: middle[1], r: Math.max(r * 1.1, 0.004), fill: 1 });
}

// A country drawn mostly as its states (Australia, the USA, Canada...): a click on one of its states opens the
// country first, and only once inside it does a click open the state
const drawnAsStates = (c) => Boolean(c) && c.parts.reduce((sum, part) => sum + part.area, 0) > c.area / 2;
const inside = (whole) => state.selected === whole.id || byId.get(state.selected)?.within === whole.id;
function wholeFirst(target) {
  const whole = target?.type === "country" && byId.get(target.country.within);
  return whole && drawnAsStates(whole) && !inside(whole) ? { type: "country", country: whole } : target;
}

function buildMap(world) {
  const features = topojson.feature(world, world.objects.countries).features;
  const byKey = new Map(countries.filter((c) => c.key).map((c) => [c.key, c]));
  for (const f of features) {
    f.country = byKey.get(f.id ?? f.properties.name) || null;
    if (f.country) f.country.features.push(f);
  }

  // Countries too small to click (or missing from the map at this detail) get a dot
  const dots = countries.filter((c) => (c.capital || c.town) && !c.parts.length && (!c.features.length || c.area < 2500)).map((c) => ({ country: c, lng: c.lng, lat: c.lat }));

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
    wrap: stage, base: $("#map-base"), over: $("#map-over"), topology: world, object: "countries", features, dots, labels: [...names.values()], reducedMotion,
    on: {
      target: wholeFirst,
      pick(target) {
        if (target?.type === "city") selectCity(target.city.id);
        else if (target?.type === "country") select(target.country.id);
      },
      hover: showTip,
      interact: hideHint,
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

// The card that follows the pointer over the map: the country, its score, and what a click will do
let tipKey = "";
function showTip(target, x, y) {
  const key = !target ? "" : target.type === "city" ? `t${target.city.id}` : `c${target.country.id}`;
  if (key !== tipKey) {
    tipKey = key;
    for (const el of panel.querySelectorAll(".lit")) el.classList.remove("lit");
    if (!target) { tip.hidden = true; return; }
    tip.replaceChildren(...(target.type === "city" ? cityTipLines(target.city) : tipLines(target)));
    tip.hidden = false;
    panel.querySelector(target.type === "city" ? `[data-city="${target.city.id}"]` : `[data-id="${target.country.id}"]`)?.classList.add("lit");
  }
  if (!target) return;
  const box = stage.getBoundingClientRect(), right = phone.matches ? box.width : sheet.getBoundingClientRect().left - box.left;
  const w = tip.offsetWidth, tall = tip.offsetHeight;
  const left = x + 18 + w > right - 8 ? x - w - 14 : x + 18, top = y + 18 + tall > box.height - 8 ? y - tall - 12 : y + 18;
  tip.style.transform = `translate(${Math.max(8, left)}px, ${Math.max(8, top)}px)`;
}

function tipLines(target) {
  const line = (cls, text) => text && h("p", { class: cls, text });
  const c = target.country, whole = byId.get(c.within), when = whenText(c.id);
  return [
    h("p", { class: "tip-title" }, h("span", { class: "flag", text: c.flag, "aria-hidden": "true" }), c.name),
    line("tip-sub", whole ? [c.group, whole.name].filter(Boolean).join(", ") : c.subregion || c.region),
    line("tip-meta", when),
    scoreOf(c) && h("p", { class: "tip-score" }, scoreBadge(scoreOf(c), scoreScale()(scoreOf(c).overall)), " out of 10"),
    h("p", { class: "tip-go", text: "See the scores" }),
  ].filter(Boolean);
}

function cityTipLines(city) {
  const c = city.country;
  return [
    h("p", { class: "tip-title" }, h("span", { class: "flag", text: c.flag, "aria-hidden": "true" }), city.name),
    h("p", { class: "tip-sub", text: c.name }),
    h("p", { class: "tip-go", text: "See the top 3 things to do" }),
  ];
}

let hinted = false;
function hideHint() {
  if (hinted) return;
  hinted = true;
  $("#hint").classList.add("gone");
}

function filtersActive() { return Boolean(state.query.trim() || state.month || state.hot || state.region || state.great.size || state.likes.size); }

// Whether a country passes the filters. A state or island is judged as its country.
function matches(id) {
  const c = byId.get(id), score = scoreOf(c);
  if (!c || !score) return false;
  const q = state.query.trim().toLowerCase();
  if (q) {
    // The country box: a word in the country's name (or the country it is part of) starts with what was typed
    const names = [c.name, byId.get(c.within)?.name].filter(Boolean);
    if (!names.some((n) => n.toLowerCase().split(/[\s-]+/).some((w) => w.startsWith(q)) || n.toLowerCase().startsWith(q))) return false;
  }
  if (state.month && !goodMonths(id).includes(state.month)) return false;
  if (state.hot && !hot(id, state.month)) return false;
  // Skiing in a month means snow that month, not a sunny July in the Alps
  if (state.month && state.likes.has(ratings.interests.indexOf("Skiing")) && !seasons(id).Skiing?.includes(state.month)) return false;
  if (state.region && c.region !== state.region) return false;
  for (const i of state.great) if (score.parts[i] < GREAT) return false;
  for (const i of state.likes) if (!(score.likes[i] >= GREAT)) return false;
  return true;
}

// Colours the map: every place by its own score, red to green (with a filter on, only the ones that match on their
// own scores and weather), and the selection
function paint() {
  if (!globe) return;
  const active = filtersActive();
  // A state is coloured for its country's selection as well as its own
  const either = (c, test) => test(c.id) || Boolean(c.within && test(c.within));
  const picked = (id) => id === state.selected;
  const fill = (c) => !c ? "none" : either(c, picked) ? "selected"
    : active && !matches(c.id) ? "land" : scoreOf(c) ? `s${Math.round(scoreOf(c).overall * 10)}` : "land";
  globe.paint({
    fill: (f) => fill(f.country),
    selected: (f) => Boolean(f.country) && either(f.country, picked),
    dot: (d) => fill(d.country),
  });
  // The cities of the country on show (or of the country a state on show is part of)
  const c = byId.get(state.selected);
  globe.pins(c ? cities[c.within] || cities[c.id] || [] : [], state.city);
}

// ---------- cities ----------

const slug = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// The cities to list for a country or state: all of a country's, or those inside a state's outline
function citiesIn(c) {
  if (!c.within) return cities[c.id] || [];
  return (cities[c.within] || []).filter((city) => c.features.some((f) => d3.geoContains(f, [city.lng, city.lat])));
}

// Opens a city: the map moves in on it, and the panel shows its top 3. The country stays selected
// under it, so going back returns to the country (or to the state the city was opened from).
function selectCity(id) {
  const city = cityById.get(id);
  if (!city) return;
  const on = byId.get(state.selected);
  if (!on || (on.id !== city.country.id && on.within !== city.country.id)) {
    if (!state.selected) state.scroll = panel.scrollTop;
    state.selected = city.country.id;
  }
  state.city = id;
  hideHint();
  globe.flyTo({ lng: city.lng, lat: city.lat, r: 0.08 });
  history.replaceState(null, "", `#c=${state.selected}&city=${id}`);
  paint();
  render();
  if (phone.matches && snap !== "half") setSnap("half");
}

// A row of buttons, one for each city, that open them
function cityTags(list) {
  return h("p", { class: "tags" }, list.map((city) => h("button", { type: "button", class: "tag", "data-city": city.id, text: city.name, onclick: () => selectCity(city.id) })));
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

// "Surprise me": the globe spins and lands on a country. With filters on, it is one of the ones that match.
let spinning = false;
async function surprise() {
  if (spinning) return;
  const all = listed().filter((id) => id !== state.selected);
  const fitting = all.filter(matches);
  const pool = fitting.length ? fitting : all;
  const id = pool[Math.floor(Math.random() * pool.length)];
  hideHint();
  if (reducedMotion || globe.mode === "flat") return select(id);

  // While the globe spins, the button runs through names like a departures board
  spinning = true;
  const label = $("#surprise-text"), said = label.textContent, button = $("#surprise");
  button.classList.add("rolling");
  const roll = setInterval(() => { const c = byId.get(pool[Math.floor(Math.random() * pool.length)]); label.textContent = `${c.flag} ${c.name}`; }, 95);
  if (state.selected) { state.selected = state.city = null; paint(); render(); }
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

// ---------- the panel, and the sheet it sits in on a phone ----------

// On a phone the panel is a sheet over the map that rests at three heights
// Half is tall enough for all the filters (measured in renderDiscover), from 47% to 62% of the screen
let filtersFit = 0;
const SNAPS = { peek: () => 124, half: () => Math.round(clamp(filtersFit, innerHeight * 0.47, innerHeight * 0.62)), full: () => innerHeight - 72 };
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
  // A drag must not also count as a tap on the grip
  head.addEventListener("click", (e) => { if (performance.now() < swallow) { e.stopPropagation(); e.preventDefault(); } }, true);
  head.querySelector(".grip").addEventListener("click", () => setSnap(snap === "full" ? "half" : snap === "half" ? "full" : "half"));
  phone.addEventListener("change", () => setSnap(snap, false));
  addEventListener("resize", () => setSnap(snap, false));
}

function select(id, opts = {}) {
  if (!state.selected) state.scroll = panel.scrollTop;
  state.selected = id;
  state.city = null;
  hideHint();
  if (!opts.arrived) globe.flyTo(frameOf(byId.get(id)));
  history.replaceState(null, "", `#c=${id}`);
  paint();
  render();
  if (phone.matches && snap !== "half") setSnap("half");
}

// Back from a state goes to its country; back from a country goes to them all
function goBack() {
  if (state.city) return select(state.selected);
  const whole = byId.get(byId.get(state.selected)?.within);
  if (whole && drawnAsStates(whole)) select(whole.id);
  else clearSelection();
}

function clearSelection() {
  state.selected = null;
  state.city = null;
  history.replaceState(null, "", location.pathname);
  globe.light(null);
  if (globe.k > 2.4) globe.home();
  paint();
  render();
  panel.scrollTop = state.scroll;
}

function render() {
  tipKey = ""; tip.hidden = true;
  if (state.city) renderCity();
  else if (state.selected) renderDestination();
  else renderDiscover();
  panel.scrollTop = 0;
  panel.classList.remove("swap"); void panel.offsetWidth; panel.classList.add("swap");
}

function renderDiscover() {
  const regions = Object.keys(REGIONS);
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
  const months = h("div", { class: "month-bar", role: "group", "aria-label": "A good month to go" }, MONTHS.map((m, i) =>
    toggle(m.charAt(0), () => state.month === i + 1, () => { state.month = state.month === i + 1 ? 0 : i + 1; },
      { class: i + 1 === thisMonth ? "now" : "", title: MONTHS_LONG[i], "aria-label": MONTHS_LONG[i] })));
  const where = h("div", { class: "chips one-line", role: "group", "aria-label": "Part of the world" }, regions.map((r) =>
    toggle(r, () => state.region === r, () => {
      state.region = state.region === r ? "" : r;
      if (state.region) { hideHint(); globe.flyTo(REGIONS[r]); }
    }, { class: "chip" })));
  // Great for: the categories, the interests and hot weather in one grid, five to a row (5, 5, 4, with room for one more)
  const greatChip = (label, i) => toggle(label, () => state.great.has(i), () => { if (state.great.has(i)) state.great.delete(i); else state.great.add(i); },
    { class: "chip", title: `${ratings.categories[i] || label}: ${GREAT} or more out of 10` });
  const likeChip = (label, i) => toggle(label, () => state.likes.has(i), () => { if (state.likes.has(i)) state.likes.delete(i); else state.likes.add(i); },
    { class: "chip", title: `${label}: ${GREAT} or more out of 10` });
  const hotChip = toggle(`Hot ${HOT}°+`, () => state.hot, () => { state.hot = !state.hot; },
    { class: "chip", title: `Hot weather: average highs of ${HOT} °C or more in the month chosen (with no month chosen, for at least ${HOT_MONTHS} months of the year)` });
  const great = h("div", { class: "chips grid5", role: "group", "aria-label": `Great for: scores ${GREAT} or more` },
    GREAT_LABELS.map(greatChip), ratings.interests.map(likeChip), hotChip);

  // Home, for the flights in the Budget scores: every country, and the states and islands that are on the map
  const placeName = (c) => (c.within ? `${c.name} (${byId.get(c.within).name})` : c.name);
  const homes = countries.filter((c) => !c.within || byId.has(c.within)).sort((a, b) => placeName(a).localeCompare(placeName(b)));
  const from = h("select", { id: "home", class: "home-pick", onchange: (e) => { setHome(e.target.value); refresh(); } },
    homes.map((c) => h("option", { value: c.id, selected: c.id === state.home, text: placeName(c) })));

  const group = (label, value, ...body) => h("div", { class: "group" }, h("p", { class: "group-label" }, label, value), ...body);
  // Flying from is a setting, out of the way under the gear, so the filters fit on a phone's first screen
  const settings = h("div", { class: "settings", id: "settings", hidden: !state.settingsOpen },
    h("label", { class: "group-label", for: "home", text: "Flying from" }),
    from,
    h("p", { class: "home-note", text: "Budget scores include the flights from here." }));
  const gear = h("button", { type: "button", class: "gear", "aria-label": "Settings", title: "Settings: flying from", "aria-controls": "settings", "aria-expanded": String(!!state.settingsOpen),
    onclick: () => { state.settingsOpen = !state.settingsOpen; settings.hidden = !state.settingsOpen; gear.setAttribute("aria-expanded", String(state.settingsOpen)); } }, icon("settings"));
  const filters = h("div", { class: "filters" },
    group("Where", null, where),
    group("When", when, months),
    // The categories and the interests share one heading, a row each
    group("Great for", null, great));
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
  state.clear = () => { state.month = 0; state.hot = false; state.region = ""; state.query = find.value = ""; state.great.clear(); state.likes.clear(); refresh(); };

  panel.replaceChildren(
    // How many destinations are left sits beside the heading, so a phone's first screen is the heading and the filters
    h("div", { class: "hero-row" }, h("h1", { class: "hero" }, "Where to ", h("em", { text: "next?" })),
      h("div", { class: "hero-side" },
        h("p", { class: "left-count", id: "count", "aria-live": "polite" }),
        h("button", { type: "button", class: "link", id: "clear", text: "Clear", "aria-label": "Clear filters", onclick: () => state.clear() }),
        gear)),
    settings,
    filters,
    h("div", { class: "sort", id: "sort", role: "group", "aria-label": "Order" }, [["score", "Top rated"], ["name", "A to Z"]].map(([key, label]) =>
      h("button", { type: "button", "data-sort": key, "aria-pressed": String(state.sort === key), text: label, onclick: () => { state.sort = key; renderResults(); } }))),
    h("label", { class: "sr-only", for: "search", text: "Filter by country" }),
    h("div", { class: "search find" }, icon("search"), find, h("kbd", { text: "/", "aria-hidden": "true" })),
    h("div", { id: "results" }),
    credits());
  renderResults();
  // offsetTop is from the top of the sheet (the nearest positioned box) and ignores the panel's scroll and animation
  if (phone.matches) {
    filtersFit = filters.offsetTop + filters.offsetHeight + 12;
    if (snap === "half") setSnap("half");
  }
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
  const all = listed().sort((a, b) => byId.get(a).name.localeCompare(byId.get(b).name));
  const shown = all.filter(matches);
  if (state.sort === "score") shown.sort((a, b) => (scoreOf(byId.get(b))?.overall ?? -1) - (scoreOf(byId.get(a))?.overall ?? -1));
  for (const btn of document.querySelectorAll("#sort button")) btn.setAttribute("aria-pressed", String(btn.dataset.sort === state.sort));
  const active = filtersActive();
  const colour = scoreScale();
  const number = h("b");
  // With filters on: "3/243" (all a phone has room for beside the heading); with none: "243 destinations"
  head.replaceChildren(number, active ? `/${all.length}` : shown.length === 1 ? " destination" : " destinations");
  head.title = active ? `${shown.length} of ${all.length} destinations left` : "";
  $("#clear").hidden = !active;
  box.replaceChildren(shown.length
      ? h("ul", { class: "cards" }, shown.map((id) => {
          const c = byId.get(id), score = scoreOf(c), when = whenText(id);
          const strong = [...GREAT_LABELS.filter((_, i) => score.parts[i] >= GREAT), ...ratings.interests.filter((_, i) => score.likes[i] >= GREAT)];
          const meta = [strong.length && `Great for ${strong.join(", ").toLowerCase()}`, when && when.charAt(0).toLowerCase() + when.slice(1)].filter(Boolean).join(" · ");
          return h("li", null, h("button", { type: "button", class: "card", "data-id": id, onclick: () => select(id), ...peekAt(c) },
            h("span", { class: "card-flag", text: c.flag, "aria-hidden": "true" }),
            h("span", { class: "card-main" },
              h("span", { class: "card-title", text: c.name }),
              h("span", { class: "card-sub", text: c.within ? [c.group, byId.get(c.within).name].filter(Boolean).join(", ") : c.subregion || c.region }),
              activities[id]?.length > 0 && h("span", { class: "card-text", text: activities[id].slice(0, 3).join(" · ") }),
              meta && h("span", { class: "card-meta", text: meta.charAt(0).toUpperCase() + meta.slice(1) })),
            scoreBadge(score, colour(score.overall))));
        }))
      : h("p", { class: "empty", text: state.query.trim() ? "No destination by that name." : "No destinations left with those choices. Try removing one." }));
  countTo(number, shown.length);
}

function credits() {
  const odbl = () => h("a", { href: "https://opendatacommons.org/licenses/odbl/1-0/", target: "_blank", rel: "noopener", text: "ODbL" });
  return h("p", { class: "credits" },
    "Map shapes: Natural Earth. Country facts: mledoze/countries (", odbl(), "). Weather: NASA POWER. ", h("a", { href: "privacy/", text: "Privacy" }), " · ", h("a", { href: "terms/", text: "Terms" }));
}

// The UK government's travel advice for a country (`advice` in countries.json, from scripts/advice.mjs).
// Nothing for the UK itself.
function adviceLine(c) {
  if (c.advice == null) return null;
  return h("p", { class: "note" }, "Before you book, read the ",
    h("a", { href: `https://www.gov.uk/foreign-travel-advice/${c.advice}`, target: "_blank", rel: "noopener", text: `UK government's travel advice for ${c.name}` }),
    ": safety, entry rules and health. Our scores are for ideas and planning, and things change, so check anything important before you go.");
}

// The weather tab: every month rated Great, Okay or Bad, with its average high and low and its rain.
const RATING = { G: "Great", O: "Okay", B: "Bad" };
function weatherTab(c) {
  const w = weather[c.id], kids = [];
  if (!w) return [h("p", { class: "empty", text: `There are no weather figures for ${c.name} yet.` })];
  const now = new Date().getMonth();
  kids.push(
    h("h2", { class: "section", text: "Month by month" }),
    h("div", { class: "wx-strip", role: "img", "aria-label": RATING_ORDER.map((r) => `${RATING[r]}: ${monthRanges(w.m.flatMap((m, i) => (m[3] === r ? [i + 1] : []))) || "none"}`).join(". ") },
      w.m.map((m, i) => h("span", { class: `wx-${m[3]}`, text: MONTHS[i].charAt(0), title: `${MONTHS_LONG[i]}: ${RATING[m[3]]}` }))),
    h("p", { class: "wx-key", "aria-hidden": "true" }, RATING_ORDER.map((r) => h("span", null, h("i", { class: `wx-${r}` }), RATING[r]))),
    // What else makes a month worth going, whatever the weather
    Object.keys(seasons(c.id)).length > 0 && h("p", { class: "wx-also", text: `Also worth going for: ${Object.entries(seasons(c.id)).map(([what, months]) => `${what.toLowerCase()} ${monthRanges(months)}`).join(", ")}.` }),
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
  const c = byId.get(state.selected), whole = byId.get(c.within);
  const facts = [
    ["Capital", c.capital],
    ["Main town", c.town], // a travel region has no capital, only a main town for visitors
    ["Currency", c.currencies.join(", ")],
    ["Languages", c.languages.join(", ")],
    ["Dialling code", c.dial],
  ].filter(([, value]) => value);

  const kids = [
    h("button", { type: "button", class: "back", onclick: goBack }, icon("back"), whole && drawnAsStates(whole) ? whole.name : "All countries"),
    h("div", { class: "dest-head" },
      h("span", { class: "flag big", text: c.flag, "aria-hidden": "true" }),
      h("div", null,
        h("h1", null, c.name),
        h("p", { class: "muted", text: [whole ? [c.group, whole.name].filter(Boolean).join(", ") : c.subregion || c.region, c.capital ? `Capital ${c.capital}` : c.town && `Main town ${c.town}`].filter(Boolean).join(" · ") }))),
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
        bars(ratings.categories, score.parts, colour),
        score.flight && h("p", { class: "note budget-note",
          text: `Budget is the cost there (${score.there}/10) and the flights (${Math.round(score.flight.score)}/10): ${c.name} is ${score.flight.km.toLocaleString("en-GB")} km from ${score.flight.from}. Change where you fly from on the Discover page.` }),
        h("h2", { class: "section rating-sub", text: "Interests" }),
        bars(ratings.interests, score.likes, colour)));
    }
    const top = activities[c.id];
    if (top?.length) body.push(h("h2", { class: "section", text: "Top 3 things to do" }), h("ol", { class: "top3" }, top.slice(0, 3).map((t) => h("li", { text: t }))));

    if (!score && !top?.length) body.push(h("p", { class: "empty", text: `There's nothing on ${c.name} yet.` }));

    const here = citiesIn(c);
    if (here.length) body.push(h("h2", { class: "section", text: "Cities" }), cityTags(here));

    if (c.parts.length) body.push(
      h("h2", { class: "section", text: "Explore by area" }),
      h("p", { class: "tags" }, c.parts.map((part) => h("button", { type: "button", class: "tag", text: part.name, onclick: () => select(part.id),
        onpointerenter: () => globe.light({ type: "country", id: part.id, lng: part.lng, lat: part.lat }), onpointerleave: () => globe.light(null) }))));
  } else if (state.info === "weather") {
    body.push(...weatherTab(c));
  } else {
    const advice = adviceLine(c);
    if (advice) body.push(h("h2", { class: "section", text: "Before you go" }), advice);

    body.push(
      h("h2", { class: "section", text: "Facts" }),
      h("dl", { class: "facts" }, facts.flatMap(([label, value]) => [h("dt", { text: label }), h("dd", { text: value })])));

    const booking = bookRow(partnerLinks(c));
    if (booking) body.push(h("h2", { class: "section", text: "Book it" }), booking);
  }

  kids.push(h("div", { id: "info-body", role: "tabpanel", "aria-labelledby": `info-${state.info}` }, ...body), credits());
  panel.replaceChildren(...kids.filter(Boolean));
  disclose(panel, panel.querySelector(".credits"));
}

// A city: its top 3 things to do, and the country's other cities to go on to
function renderCity() {
  const city = cityById.get(state.city), c = city.country, on = byId.get(state.selected);
  const others = (cities[c.id] || []).filter((x) => x !== city);
  const body = [
    h("h2", { class: "section", text: "Top 3 things to do" }),
    h("ol", { class: "top3" }, city.todo.slice(0, 3).map((t) => h("li", { text: t }))),
  ];
  if (others.length) body.push(h("h2", { class: "section", text: `More cities in ${c.name}` }), cityTags(others));
  const booking = bookRow(partnerLinks(c, city.name));
  if (booking) body.push(h("h2", { class: "section", text: "Book it" }), booking);
  panel.replaceChildren(
    h("button", { type: "button", class: "back", onclick: goBack }, icon("back"), on.name),
    h("div", { class: "dest-head" },
      h("span", { class: "flag big", text: c.flag, "aria-hidden": "true" }),
      h("div", null,
        h("h1", null, city.name),
        h("p", { class: "muted", text: on.id === c.id ? c.name : `${on.name}, ${c.name}` }))),
    ...body,
    credits());
  disclose(panel, panel.querySelector(".credits"));
}

// ---------- start ----------

// Opens the country the address asks for, if any (#c=JPN). True if it did.
function openFromHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (byId.has(params.get("c"))) {
    select(params.get("c"));
    if (cityById.has(params.get("city"))) selectCity(params.get("city"));
    return true;
  }
  render();
  return false;
}

function shortcuts() {
  addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
    if (e.key === "/" && !typing) {
      e.preventDefault();
      if (state.selected) { state.selected = state.city = null; paint(); render(); }
      $("#search")?.focus();
    } else if (e.key === "Escape" && !typing && state.selected) goBack();
  });
}

async function start() {
  const load = (name) => fetch(`data/${name}.json`).then((r) => { if (!r.ok) throw new Error(`${name}: ${r.status}`); return r.json(); });
  let world;
  try {
    [world, countries, site, activities, cities, weather, ratings] = await Promise.all([load("world"), load("countries"), load("site"),
      load("activities").catch(() => ({})), load("cities").catch(() => ({})), load("weather").catch(() => ({})), load("ratings").catch(() => ratings)]);
  } catch (err) {
    console.error(err);
    panel.replaceChildren(h("p", { class: "empty", text: "The map data didn't load. Check your connection and reload the page." }));
    document.body.classList.add("ready");
    return;
  }
  for (const c of countries) { c.features = []; c.parts = []; byId.set(c.id, c); }
  for (const c of countries) byId.get(c.within)?.parts.push(c); // a country's states
  state.home = guessHome();
  for (const [id, list] of Object.entries(cities)) {
    if (!byId.has(id)) { delete cities[id]; continue; }
    for (const city of list) { city.id = `${id.toLowerCase()}-${slug(city.name)}`; city.country = byId.get(id); cityById.set(city.id, city); }
  }
  buildMap(world);
  paint();
  sheetDrag();
  setSnap("half", false);
  shortcuts();

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
  if (openFromHash()) return;
  // Nothing asked for: the globe arrives and turns slowly until it is touched
  if (await globe.arrive({ lng: 12, lat: 22 })) globe.spin(true);
}

start();
})();
