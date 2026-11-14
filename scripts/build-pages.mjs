// Writes a plain page for every guide into docs/guides/, so each destination has an address of its own
// that search engines can read and people can link to. Run with `npm run build:pages` after changing
// docs/data/guides.json or docs/data/site.json. Needs no `npm install`.
// docs/guides/ is rebuilt from scratch each time: don't edit or keep anything in it by hand.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";

const out = new URL("../docs/", import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(`data/${name}.json`, out), "utf8"));
const guides = read("guides"), site = read("site"), airports = read("airports");
const byId = new Map(read("countries").map((c) => [c.id, c]));

const NAME = "The Corner World";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DISCLOSURE = "Some links earn The Corner World a commission if you book, at no extra cost to you.";
// The same policy as the map page
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

const base = /^https:\/\//.test(site.url || "") ? site.url.replace(/\/*$/, "/") : "";
const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: site.currency || "GBP", maximumFractionDigits: 0 });
const money = (n) => currency.format(n);
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const slug = (name) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// As in docs/assets/app.js
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

// As in docs/assets/app.js, without the dates and travellers: a guide page has no trip
function partnerLinks(country, place) {
  const fill = { place: place ? `${place.name}, ${country.name}` : country.name, country: country.name, checkin: "", checkout: "", travellers: "" };
  return (site.partners || []).map((p) => ({
    label: p.label,
    url: String(p.url || "").replace(/\{(\w+)\}/g, (gap, key) => (key in fill ? encodeURIComponent(fill[key]) : gap)),
  }));
}

// As in docs/assets/app.js
function airportsText(id, place) {
  const list = (airports.places[`${id}/${place}`] || []).map(([code, km]) => ({ code, km, ...airports.airports[code] }));
  return list.length ? `${list.length > 1 ? "Airports" : "Airport"}: ${list.map((a) => `${a.name} (${a.code}) ${a.km.toLocaleString("en-GB")} km`).join(" · ")}` : "";
}

function bookRow(...links) {
  const good = links.flat().filter((l) => l && l.label && /^https:\/\//.test(l.url));
  return good.length ? `<p class="book-links">${good.map((l) =>
    `<a class="book" href="${esc(l.url)}" target="_blank" rel="sponsored noopener">${esc(l.label)}</a>`).join("")}</p>` : "";
}

// `up` is the way back to docs/ from the page; `path` is the page's place under it
function page({ up, path, title, description, index, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${index ? "" : `<meta name="robots" content="noindex">\n`}${base ? `<link rel="canonical" href="${esc(base + path)}">\n<meta property="og:url" content="${esc(base + path)}">\n` : ""}<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="article">
<link rel="icon" type="image/svg+xml" href="${up}favicon.svg">
<meta name="theme-color" content="#2a78d6">
<script src="${up}assets/theme.js"></script>
<link rel="stylesheet" href="${up}assets/styles.css">
</head>
<body class="page">
<header class="app-bar">
  <p class="brand"><span class="brand-mark" aria-hidden="true"></span><span>${NAME}</span></p>
  <nav class="tabs" aria-label="Main">
    <a href="${up}">Map</a>
    <a href="${up}guides/">Guides</a>
    <a href="${up}plan/">Plan a trip</a>
  </nav>
</header>
<main>
${body}
<p class="credits">Country facts: mledoze/countries (ODbL). Airports: OurAirports.</p>
</main>
</body>
</html>
`;
}

function guidePage(c, g) {
  const parts = [];
  const draft = g.status === "draft" ? `<span class="badge">Draft</span>` : "";
  parts.push(`<div class="dest-head"><span class="flag big" aria-hidden="true">${c.flag}</span><div>
<h1>${esc(c.name)} travel guide${draft}</h1>
<p class="muted">${esc([c.subregion || c.region, c.capital && `Capital ${c.capital}`].filter(Boolean).join(" · "))}</p></div></div>`);
  if (g.summary) parts.push(`<p class="summary">${esc(g.summary)}</p>`);
  parts.push(`<a class="primary cta" href="../../#c=${esc(c.id)}">Plan a ${esc(c.name)} trip on the map</a>`);

  if (g.bestMonths) parts.push(`<h2 class="section">Best time to visit ${esc(c.name)}</h2>
<div class="months" role="img" aria-label="Best months: ${esc(monthRanges(g.bestMonths))}">${MONTHS.map((m, i) =>
    `<span${g.bestMonths.includes(i + 1) ? ` class="on"` : ""} title="${MONTHS_LONG[i]}">${m.charAt(0)}</span>`).join("")}</div>
<p class="note">${esc([monthRanges(g.bestMonths) + ".", g.bestTimeNote].filter(Boolean).join(" "))}</p>`);

  const stats = [
    g.budgetPerDay && ["Budget", `About ${money(g.budgetPerDay)} a day`, "per person, before flights"],
    g.nights && ["How long", `${g.nights[0]}–${g.nights[1]} nights`, "suggested stay"],
  ].filter(Boolean);
  if (stats.length) parts.push(`<div class="stats">${stats.map(([label, value, sub]) =>
    `<div class="stat"><span class="stat-l">${label}</span><span class="stat-v">${esc(value)}</span><span class="stat-l">${sub}</span></div>`).join("")}</div>`);
  if (g.tags?.length) parts.push(`<p class="tags">${g.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</p>`);

  if (g.places?.length) parts.push(`<h2 class="section">Places to visit in ${esc(c.name)}</h2>
<ul class="places">${g.places.map((p) =>
    `<li><div><h3>${esc(p.name)}</h3><p>${esc(p.blurb || "")}</p>${airportsText(c.id, p.id) ? `<p class="muted">${esc(airportsText(c.id, p.id))}</p>` : ""}${bookRow(partnerLinks(c, p), p.links)}</div></li>`).join("\n")}</ul>`);

  if (g.itineraries?.length) parts.push(`<h2 class="section">${esc(c.name)} itineraries</h2>
${g.itineraries.map((it) => `<div class="itinerary"><div><h3>${esc(it.name)}</h3><p>${esc(it.stops.map((s) =>
    `${g.places.find((p) => p.id === s.place).name} ${s.nights}`).join(" → "))} nights</p></div></div>`).join("\n")}`);

  if (g.tips?.length) parts.push(`<h2 class="section">Good to know</h2>
<ul class="tips">${g.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`);

  const booking = bookRow(partnerLinks(c), g.links);
  if (booking) parts.push(`<h2 class="section">Book it</h2>\n${booking}`);

  const planning = site.planning || {};
  const paid = /^https:\/\//.test(planning.url || "");
  // planning.page is a page on this site (e.g. "plan/"); guide pages sit two folders down
  const page = !paid && /^[a-z0-9][a-z0-9/-]*$/.test(planning.page || "") ? `../../${planning.page}#start` : "";
  if (paid || page || site.contactEmail) parts.push(`<h2 class="section">Want it planned for you?</h2>
${planning.text ? `<p class="note">${esc(planning.text)}</p>\n` : ""}<a class="small primary cta" href="${esc(paid ? planning.url : page ||
    `mailto:${site.contactEmail}?subject=${encodeURIComponent(`Help planning: ${c.name}`)}`)}"${paid ? ` target="_blank" rel="noopener"` : ""}>${esc(planning.label || "Ask for help with this trip")}</a>`);

  const facts = [["Capital", c.capital], ["Currency", c.currencies.join(", ")], ["Languages", c.languages.join(", ")], ["Dialling code", c.dial]].filter(([, value]) => value);
  parts.push(`<h2 class="section">Facts</h2>
<dl class="facts">${facts.map(([label, value]) => `<dt>${label}</dt><dd>${esc(value)}</dd>`).join("")}</dl>`);

  const body = parts.join("\n");
  return body.includes(`class="book"`) ? `${body}\n<p class="disclosure">${DISCLOSURE}</p>` : body;
}

const list = Object.keys(guides).filter((id) => byId.has(id))
  .map((id) => ({ c: byId.get(id), g: guides[id], slug: slug(byId.get(id).name) }))
  .sort((a, b) => a.c.name.localeCompare(b.c.name));

const dir = new URL("guides/", out);
rmSync(dir, { recursive: true, force: true });
for (const { c, g, slug } of list) {
  mkdirSync(new URL(`${slug}/`, dir), { recursive: true });
  writeFileSync(new URL(`${slug}/index.html`, dir), page({
    up: "../../", path: `guides/${slug}/`,
    title: `${c.name} travel guide | ${NAME}`,
    description: g.summary || `When to go, where to go and how long to stay in ${c.name}.`,
    index: g.status !== "draft", // an unfinished guide stays out of search results
    body: guidePage(c, g),
  }));
}

writeFileSync(new URL("index.html", dir), page({
  up: "../", path: "guides/",
  title: `Travel guides | ${NAME}`,
  description: "Destination guides: when to go, what it costs, where to stop and ready-made itineraries.",
  index: true,
  body: `<h1>Travel guides</h1>
<p class="lede">When to go, what it costs, where to stop and ready-made routes.</p>
<ul class="cards">${list.map(({ c, g, slug }) => `<li><a class="card" href="${slug}/">
<span class="card-title"><span class="flag" aria-hidden="true">${c.flag}</span>${esc(c.name)}${g.status === "draft" ? `<span class="badge">Draft</span>` : ""}</span>
<span class="card-text">${esc(g.summary || "")}</span></a></li>`).join("\n")}</ul>`,
}));

// The sitemap needs full addresses, so it waits for `url` in site.json
const live = list.filter(({ g }) => g.status !== "draft");
if (base) {
  const urls = ["", "guides/", ...live.map(({ slug }) => `guides/${slug}/`)];
  writeFileSync(new URL("sitemap.xml", out), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${esc(base + u)}</loc></url>`).join("\n")}
</urlset>
`);
}

console.log(`${list.length} guide pages: ${live.length} open to search engines, ${list.length - live.length} draft`);
console.log(base ? `Sitemap written for ${base}` : "No sitemap: set \"url\" in docs/data/site.json to the site's address");
