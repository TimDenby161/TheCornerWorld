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
const accountsOn = Boolean(site.accounts?.url); // sign-in is on (see npm run accounts)
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DISCLOSURE = "Some links earn The Corner World a commission if you book, at no extra cost to you.";
// Who runs the site. The law on selling online (the E-Commerce Regulations 2002) asks for the trader's
// name, a postal address and an email address on the site: they are `trader` and `contactEmail` in site.json.
const trader = { name: "", address: "", ...site.trader };
const UPDATED = "16 November 2026"; // when the privacy notice or the terms last changed: change it with them
const ODBL = `<a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a>`;
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
<link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<link rel="manifest" href="${up}manifest.webmanifest">
<meta name="apple-mobile-web-app-title" content="Corner World">
<meta name="theme-color" content="#2a78d6">
<script src="${up}assets/theme.js"></script>
<link rel="stylesheet" href="${up}assets/styles.css">
</head>
<body class="page">
<header class="app-bar">
  <p class="brand"><span class="brand-mark" aria-hidden="true"></span><span>${NAME}</span></p>
  <nav class="tabs" aria-label="Main">
    <span class="mode">
      <a href="${up}" class="on">Discover</a>
      <a href="${up}plan/">Book</a>
    </span>
  </nav>
</header>
<main>
${body}
<p class="credits">Country facts: mledoze/countries (${ODBL}). Airports: OurAirports.</p>
${legal(up)}
</main>
</body>
</html>
`;
}

// The line at the foot of every page: who runs the site, and the privacy notice and terms
function legal(up) {
  const who = trader.name ? `${NAME} is run by ${esc(trader.name)}, a sole trader${trader.address ? `, at ${esc(trader.address)}` : ""}. ` : "";
  return `<p class="credits">${who}<a href="${up}privacy/">Privacy</a> · <a href="${up}terms/">Terms</a></p>`;
}

// The UK government's travel advice for a country: a line on its guide page. Nothing for the UK itself.
function adviceLine(c) {
  if (c.advice == null) return "";
  const url = `https://www.gov.uk/foreign-travel-advice/${c.advice}`;
  return `<p class="note">Before you book, read the <a href="${esc(url)}" target="_blank" rel="noopener">UK government's travel advice for ${esc(c.name)}</a>: safety, entry rules and health. This guide is for ideas and planning, and things change, so check anything important before you go.</p>`;
}

function guidePage(c, g) {
  const parts = [];
  const draft = g.status === "draft" ? `<span class="badge">Draft</span>` : "";
  parts.push(`<div class="dest-head"><span class="flag big" aria-hidden="true">${esc(c.flag)}</span><div>
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
  const advice = adviceLine(c);
  if (advice) parts.push(`<h2 class="section">Before you go</h2>\n${advice}`);
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
<span class="card-title"><span class="flag" aria-hidden="true">${esc(c.flag)}</span>${esc(c.name)}${g.status === "draft" ? `<span class="badge">Draft</span>` : ""}</span>
<span class="card-text">${esc(g.summary || "")}</span></a></li>`).join("\n")}</ul>`,
}));

// The privacy notice: what the site and the planning service keep about people, why, and for how long.
// If what is collected changes (the brief form, payments, the mailing list, accounts in
// docs/assets/account.js and supabase/migrations/), change this page with it, and UPDATED above.
const mail = site.contactEmail ? `<a href="mailto:${esc(site.contactEmail)}">${esc(site.contactEmail)}</a>` : "";
const contactLine = [mail && `email ${mail}`, trader.address && `write to ${esc(trader.name)}, ${esc(trader.address)}`].filter(Boolean).join(", or ");

mkdirSync(new URL("privacy/", out), { recursive: true });
writeFileSync(new URL("privacy/index.html", out), page({
  up: "../", path: "privacy/",
  title: `Privacy | ${NAME}`,
  description: "What The Corner World keeps about you, why, and how to have it deleted.",
  index: true,
  body: `<h1>Privacy</h1>
<p class="lede">You can use the map, the guides and the trip planner without telling us anything: a trip you build stays in your own browser. This page is about what happens if you ask us to plan a trip, pay us, or join our emails${accountsOn ? ", or sign in" : ""}.</p>
<p class="muted">Last updated ${UPDATED}.</p>
<h2 class="section">Who we are</h2>
<p class="note">${NAME} is run by ${esc(trader.name || "its owner")}, a sole trader in the UK, who decides how your information is used (the "controller", in the words of UK data protection law).${contactLine ? ` To ask anything about your information, ${contactLine}.` : ""}</p>

<h2 class="section">If you ask us to plan a trip</h2>
<ul class="tips">
<li><b>Your brief:</b> the form on our planning page opens your own email app, so what you send reaches us as an email: your name, your email address and the details of your trip, which may include who is travelling (and children's ages) and anything you tell us about mobility or health. We keep it, and our emails with you, in our Gmail account, to plan your trip and make the changes you ask for. Please only tell us about health or mobility what we need to plan around.</li>
<li><b>Your trip page:</b> we publish it on this site locked with a password that only you are sent. Without the password it can't be read, even by someone who finds the file. Its address doesn't include your name.</li>
<li><b>Paying:</b> payments are handled by Stripe. We see your name, email address and what you paid, never your card details.</li>
</ul>
<p class="note"><b>Why we may use it:</b> to agree and carry out our contract with you (UK GDPR Article 6(1)(b)). Anything you tell us about health or mobility is used only with your consent, which you give by sending it and can withdraw at any time. Payment records we keep because tax law requires it (Article 6(1)(c)).</p>
<p class="note"><b>How long:</b> your brief, our emails and your trip page until two years after we deliver the page, so we can answer questions about the trip, unless you ask us to delete them sooner. Payment records for six years, as UK tax law requires.</p>

<h2 class="section">If you join our emails</h2>
<p class="note">Our mailing list is kept by Kit (kit.com). We hold your email address (and your name, if you give it) and use it only to send you our emails, including the launch offer code if you asked for it. We do this because you agreed to it (Article 6(1)(a)). Every email has a link to unsubscribe, which removes you at once, and we keep your address until you do.</p>

<h2 class="section">When you visit the site</h2>
<ul class="tips">
<li><b>No tracking:</b> the site has no analytics, no advertising and no cookies of its own, and loads nothing from other websites.</li>
<li><b>Hosting:</b> the site is served by GitHub Pages. Like any web host, GitHub records the internet (IP) address of each visit in its logs, to keep the service running and secure. We can't see these logs.</li>
<li><b>Your browser:</b> the trip you build on the map, your choice of light or dark, and, on a trip page, the changes you make and the page's password (so you aren't asked again) are kept in your own browser's storage. They are never sent to us. Clearing your browser's site data removes them.</li>
<li><b>Links:</b> links to other sites, such as GOV.UK, Google Flights or booking sites, take you to sites with their own privacy notices.</li>
</ul>
`
  // Sign-in (accounts in data/site.json) is described only while it is on
  + (accountsOn ? `
<h2 class="section">If you sign in: what we keep</h2>
<ul class="tips">
<li><b>From Google, when you sign in:</b> your name, your email address and the address of your profile picture. We never see your Google password.</li>
<li><b>Your trip:</b> the trip you build on the map (its name, start date, number of travellers, stops and checklist), so it is there on your other devices.</li>
<li><b>If we made a trip page for you:</b> the page, and the email addresses allowed to open it.</li>
</ul>
<p class="note">The choices you make on a trip page (what you have booked or paid, activities you add) stay in your browser and are not sent to us.</p>
<h2 class="section">If you sign in: what we use it for</h2>
<p class="note">To sign you in, to keep your trip, and to show your trip page to you and nobody else: the service you asked for when you signed in (Article 6(1)(b)). We don't sell it, share it or use it for advertising.</p>
<h2 class="section">If you sign in: where it is kept</h2>
<p class="note">With Supabase, our database provider, on servers in Ireland. Signing in is handled by Google and Supabase. While you are signed in, a sign-in token is kept in your browser's storage, and it is removed when you sign out.</p>
<h2 class="section">If you sign in: how long, and how to delete it</h2>
<p class="note">Until you delete your account. On the map, open your account (top right) and choose Delete account: the account and the trip saved to it are deleted at once. A trip page we made for you is kept as described above.</p>
` : "") + `
<h2 class="section">Who else handles it</h2>
<p class="note">Only the companies that run the services above for us: Google (Gmail), Stripe (payments), Kit (our emails) and GitHub (hosting)${accountsOn ? " and Supabase (accounts)" : ""}. Each may only use it to provide that service. Some of them hold it in the United States; where they do, it is protected by the UK's data bridge with the US (the UK Extension to the EU-US Data Privacy Framework) or by the standard data protection contracts approved for the UK. We never sell your information or share it for advertising.</p>

<h2 class="section">Your rights</h2>
<p class="note">You can ask for a copy of what we hold about you, or for it to be corrected or deleted, ask us to stop or limit using it, or object to how we use it, and you can withdraw any consent you have given${mail ? `, by emailing ${mail}` : ""}. We will reply within a month. If you are unhappy with how we have handled it, you can complain to the Information Commissioner's Office (<a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a>).</p>

<h2 class="section">Changes</h2>
<p class="note">If we change what we collect or how we use it, we will update this page and the date at the top. If you are a client, we'll tell you about a change that affects you by email.</p>`,
}));

// The terms for the paid trip-planning service (docs/plan/), and for using the free site. The Consumer
// Contracts Regulations 2013 decide much of what's here: who we are, the price, the 14-day right to cancel
// and the model cancellation form. The plans and their prices also appear in docs/plan/index.html,
// docs/assets/plan.js and the travel-plan-client skill: keep them in step.
mkdirSync(new URL("terms/", out), { recursive: true });
writeFileSync(new URL("terms/index.html", out), page({
  up: "../", path: "terms/",
  title: `Terms | ${NAME}`,
  description: "The terms for The Corner World's trip planning service and for using the site.",
  index: true,
  body: `<h1>Terms</h1>
<p class="lede">The terms for our trip planning service, and for using the map and guides. They're written to be read, so please do: when you pay for a trip page, you're agreeing to them.</p>
<p class="muted">Last updated ${UPDATED}.</p>

<h2 class="section">Who we are</h2>
<p class="note">${NAME} is run by ${esc(trader.name || "its owner")}, a sole trader in the UK${trader.address ? `, at ${esc(trader.address)}` : ""}. We are not registered for VAT, so no VAT is added to our prices.${mail ? ` You can reach us at ${mail}.` : ""}</p>

<h2 class="section">What you're buying</h2>
<p class="note">A trip page: a web page made for your trip, with the route, every day hour by hour, an estimate of every cost in pounds for your group, and a list of what to book. It's a plan only. We don't book or sell any travel (see "What we don't do" below).</p>
<ul class="tips">
<li><b>Short trip, £79:</b> up to 7 days and up to 3 stops, with 1 round of changes.</li>
<li><b>Standard, £149:</b> 8 to 16 days and up to 7 stops in one or two countries, with flights and the order of stops worked out, entry and visa notes for UK passports, and 2 rounds of changes.</li>
<li><b>Big trip, £229:</b> 17 days or more, or 3 or more countries, with as many stops as the trip needs, another way to do the route with the cost of each, and 3 rounds of changes.</li>
</ul>
<p class="note">Prices are in pounds and are for the whole page, whatever the size of your group.</p>

<h2 class="section">How it works</h2>
<ul class="tips">
<li><b>Your brief:</b> you send us the form on our planning page. We reply within one working day with any questions, the plan that fits and a link to pay.</li>
<li><b>Our contract:</b> it starts when you pay. Nothing is charged before then.</li>
<li><b>Delivery:</b> we send you your trip page within 5 working days of your payment, or of your answers to our questions if those come later. If we can't, we'll tell you why and when it will be ready, and you can cancel for a full refund.</li>
<li><b>Changes:</b> a round of changes is one list of changes sent in one email, such as "more beach, one stop fewer". We make each round within 3 working days. Ask for them within 6 months of delivery and before your trip starts. Changes that turn it into a different trip (a new country, or many more days) may need a different plan: we'll agree that with you before doing anything.</li>
<li><b>Places we won't plan:</b> if the UK government advises against all travel, or all but essential travel, to somewhere in your brief, we'll tell you before you pay, and won't plan travel there.</li>
</ul>

<h2 class="section" id="cancel">Your right to cancel</h2>
<p class="note">You have 14 days from the day you pay to cancel, without giving a reason. To cancel, tell us clearly by email; you can use the form at the end of these terms, but you don't have to.</p>
<ul class="tips">
<li><b>If we haven't started:</b> we refund you in full.</li>
<li><b>If you asked us to start straight away</b> and cancel before your page is delivered, we refund what you paid less a fair amount for the work we've done by the time you tell us.</li>
<li><b>Once your page is delivered</b>, if you asked us to start within the 14 days and agreed that you'd lose the right to cancel once it was delivered, you can no longer cancel. We ask you to confirm both when we send the payment link, because we can only start work early if you want us to.</li>
</ul>
<p class="note">We refund you within 14 days of your cancelling, to the card you paid with.</p>

<h2 class="section">If you're not happy</h2>
<p class="note">The rounds of changes are there to get it right. If, after you've used them, your page still doesn't give you what we agreed, tell us and we'll refund you in full. We must plan your trip with reasonable care and skill: nothing here takes away your rights under the Consumer Rights Act 2015.</p>

<h2 class="section">What we don't do</h2>
<ul class="tips">
<li><b>We don't book or sell travel.</b> You book flights, hotels, transport and tours directly, and your contract for each is with that company. Your trip isn't a package holiday and isn't ATOL protected: you keep the protection of the company and the card you pay with.</li>
<li><b>We don't promise prices or timetables.</b> We research each one when we plan, and mark anything we couldn't confirm. Prices, timetables, opening hours and entry rules change: check them, especially visas and passport rules, before you book or travel.</li>
<li><b>We don't replace official advice or insurance.</b> Read the UK government's travel advice for every country you visit, get travel insurance, and check health advice and vaccinations (<a href="https://www.travelhealthpro.org.uk/">travelhealthpro.org.uk</a>).</li>
</ul>

<h2 class="section">Our responsibility to you</h2>
<p class="note">If we break these terms or don't plan with reasonable care and skill, we are responsible for loss you suffer that was a foreseeable result. We aren't responsible for what the companies you book with do or fail to do, for changes to prices, timetables or entry rules after we planned, or for events outside our control such as strikes, weather or closures. Apart from that, our total responsibility to you is limited to what you paid us. None of this limits our responsibility where the law doesn't allow it to be limited, such as for death or injury caused by our negligence, or for fraud.</p>

<h2 class="section">Your trip page</h2>
<p class="note">Your page is for you and the people travelling with you. Please don't sell it or publish it. We keep it online until two years after delivery, or until you ask us to take it down; save a copy if you want it for longer. Changes you make on the page are kept on your device.</p>

<h2 class="section" id="launch-offer">The launch offer</h2>
<p class="note">Half price on any one plan for our first five clients. The code comes from joining our emails, and is entered when you pay. One use per client, and only on your first order. It ends when five clients have used it, and we'll take the offer off the planning page then. We'd love an honest review afterwards, but you don't have to give one to get the offer.</p>

<h2 class="section">Reviews</h2>
<p class="note">We may ask what you thought. Say whatever you think, or nothing at all: we never pay for, reward or edit reviews. If you had the launch offer and leave a review, please mention that you had a discount.</p>

<h2 class="section">The free map and guides</h2>
<p class="note">The map, guides and trip planner are free to use, for ideas and planning. We try to keep them accurate but can't promise they are complete or up to date, so check anything important before you rely on it. Some booking links may earn us a commission, at no cost to you; we say so where they appear. Linked sites aren't ours and we aren't responsible for them.</p>

<h2 class="section">Complaints, and the law</h2>
<p class="note">If something's wrong, email us${mail ? ` at ${mail}` : ""} and we'll reply within 5 working days. These terms are governed by the law of England and Wales. If you live in Scotland or Northern Ireland, you can also bring a claim in your own courts. We may update these terms; the version on the day you paid applies to your trip page.</p>

<h2 class="section">Cancellation form</h2>
<p class="note">If you'd like to use it, copy this into an email to us:</p>
<blockquote class="note">To ${esc(trader.name || NAME)}, ${NAME}${trader.address ? `, ${esc(trader.address)}` : ""}${site.contactEmail ? `, ${esc(site.contactEmail)}` : ""}:<br>
I hereby give notice that I cancel my contract for the supply of the following service: [your plan and trip].<br>
Paid on: [date].<br>
Name: [your name].<br>
Address: [your address].<br>
Date: [today's date].</blockquote>`,
}));

// The planning page is written by hand, but its footer says who runs the site, from site.json
const planPage = new URL("plan/index.html", out);
writeFileSync(planPage, readFileSync(planPage, "utf8").replace(/(<!-- trader: [^>]*-->)[\s\S]*?(<!-- \/trader -->)/,
  (all, open, close) => `${open}© ${NAME}${trader.name ? `, run by ${esc(trader.name)}, a sole trader${trader.address ? `, ${esc(trader.address)}` : ""}` : ""}${close}`));

// The sitemap needs full addresses, so it waits for `url` in site.json
const live = list.filter(({ g }) => g.status !== "draft");
if (base) {
  const urls = ["", "guides/", "plan/", "privacy/", "terms/", ...live.map(({ slug }) => `guides/${slug}/`)];
  writeFileSync(new URL("sitemap.xml", out), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${esc(base + u)}</loc></url>`).join("\n")}
</urlset>
`);
}

console.log(`${list.length} guide pages: ${live.length} open to search engines, ${list.length - live.length} draft`);
console.log(base ? `Sitemap written for ${base}` : "No sitemap: set \"url\" in docs/data/site.json to the site's address");
