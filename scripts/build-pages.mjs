// Writes the privacy notice and the terms, the footers of the planning and sample pages, and the
// sitemap, from docs/data/site.json. Run with `npm run build:pages` after changing site.json.
// Needs no `npm install`.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";

const out = new URL("../docs/", import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(`data/${name}.json`, out), "utf8"));
const site = read("site");

const NAME = "The Corner World";
// Who runs the site. The law on selling online (the E-Commerce Regulations 2002) asks for the trader's
// name, a postal address and an email address on the site: they are `trader` and `contactEmail` in site.json.
const trader = { name: "", address: "", ...site.trader };
const UPDATED = "17 November 2026"; // when the privacy notice or the terms last changed: change it with them
const ODBL = `<a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a>`;
// The same policy as the map page
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

const base = /^https:\/\//.test(site.url || "") ? site.url.replace(/\/*$/, "/") : "";
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
// `up` is the way back to docs/ from the page; `path` is the page's place under it
function page({ up, path, title, description, index, body, footer }) {
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
${base ? `<meta property="og:image" content="${esc(base)}assets/share.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n` : ""}<link rel="icon" type="image/svg+xml" href="${up}favicon.svg">
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
      <a href="${up}samples/">Samples</a>
      <a href="${up}plan/">Book</a>
    </span>
  </nav>
</header>
<main>
${body}
<p class="credits">Country facts: mledoze/countries (${ODBL}). Airports: OurAirports.</p>
${footer === "short" ? `<p class="credits"><a href="${up}places/">All places</a> · <a href="${up}privacy/">Privacy</a> · <a href="${up}terms/">Terms</a></p>` : legal(up)}
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

// The privacy notice: what the site and the planning service keep about people, why, and for how long.
// If what is collected changes (the brief form, payments, the mailing list), change this page with it,
// and UPDATED above.
const mail = site.contactEmail ? `<a href="mailto:${esc(site.contactEmail)}">${esc(site.contactEmail)}</a>` : "";
const contactLine = [mail && `email ${mail}`, trader.address && `write to ${esc(trader.name)}, ${esc(trader.address)}`].filter(Boolean).join(", or ");

mkdirSync(new URL("privacy/", out), { recursive: true });
writeFileSync(new URL("privacy/index.html", out), page({
  up: "../", path: "privacy/",
  title: `Privacy | ${NAME}`,
  description: "What The Corner World keeps about you, why, and how to have it deleted.",
  index: true,
  body: `<h1>Privacy</h1>
<p class="lede">You can use the map without telling us anything. This page is about what happens if you ask us to plan a trip, pay us, or join our emails.</p>
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
<li><b>Your browser:</b> your choice of light or dark, and, on a trip page, the changes you make and the page's password (so you aren't asked again) are kept in your own browser's storage. They are never sent to us. Clearing your browser's site data removes them.</li>
<li><b>Links:</b> links to other sites, such as GOV.UK or booking sites, take you to sites with their own privacy notices.</li>
</ul>

<h2 class="section">Who else handles it</h2>
<p class="note">Only the companies that run the services above for us: Google (Gmail), Stripe (payments), Kit (our emails) and GitHub (hosting). Each may only use it to provide that service. Some of them hold it in the United States; where they do, it is protected by the UK's data bridge with the US (the UK Extension to the EU-US Data Privacy Framework) or by the standard data protection contracts approved for the UK. We never sell your information or share it for advertising.</p>

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
<p class="lede">The terms for our trip planning service, and for using the map. They're written to be read, so please do: when you pay for a trip page, you're agreeing to them.</p>
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

<h2 class="section">The free map</h2>
<p class="note">The map is free to use, for ideas and planning. The scores we give countries are our own opinion, not a safety assessment: for safety, read the UK government's travel advice. We try to keep them accurate but can't promise they are complete or up to date, so check anything important before you rely on it. Some booking links may earn us a commission, at no cost to you; we say so where they appear. Linked sites aren't ours and we aren't responsible for them.</p>

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

// The planning and sample-trip pages are written by hand, but their footers say who runs the site, from site.json
for (const page of ["plan/index.html", "samples/index.html"]) {
  const planPage = new URL(page, out);
  writeFileSync(planPage, readFileSync(planPage, "utf8").replace(/(<!-- trader: [^>]*-->)[\s\S]*?(<!-- \/trader -->)/,
  (all, open, close) => `${open}© ${NAME}${trader.name ? `, run by ${esc(trader.name)}, a sole trader${trader.address ? `, ${esc(trader.address)}` : ""}` : ""}${close}`));
}

// ---------- A page for every place with its own scores (docs/places/<slug>/) ----------
// So search engines and shared links reach each place: "Best time to visit Japan", its scores, top three things
// to do, the weather month by month and the travel advice, with a link that opens it on the globe (#c=JPN).
// Written from the same data files as the map. The overall score here leaves out flights (the map adds them from
// the visitor's home, which a fixed page can't know), and says so. The trader's address stays on the privacy and
// terms pages, not repeated on hundreds of these.
const countries = read("countries"), ratings = read("ratings"), activities = read("activities"), weather = read("weather");
const byId = new Map(countries.map((c) => [c.id, c]));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const RATING = { G: "Great", O: "Okay", B: "Bad" };
const GREAT = 8, SKI_NORTH = [12, 1, 2, 3], SKI_SOUTH = [6, 7, 8, 9]; // as in assets/app.js
const LETTERS = { ø: "o", æ: "ae", œ: "oe", ß: "ss", ł: "l", đ: "d", ð: "d", þ: "th", ı: "i", ħ: "h" };
const slugify = (s) => s.toLowerCase().replace(/[øæœßłđðþıħ]/g, (ch) => LETTERS[ch]).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function monthRanges(months) { // as in assets/app.js
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

const places = countries.filter((c) => ratings.scores[c.id]);
const slugOf = new Map();
for (const c of places) { // a region carries its country's name unless it already has it: "spain-andalusia"
  const parent = c.within && byId.get(c.within);
  let slug = slugify(parent && !c.name.includes(parent.name) ? `${parent.name} ${c.name}` : c.name);
  while ([...slugOf.values()].includes(slug)) slug += `-${c.id.toLowerCase()}`;
  slugOf.set(c.id, slug);
}

function placeFacts(c) {
  const all = ratings.scores[c.id], n = ratings.categories.length;
  const parts = all.slice(0, n), likes = all.slice(n);
  const six = [...parts, ...(likes.length ? [Math.max(...likes)] : [])];
  const overall = Math.round(six.reduce((a, b) => a + b, 0) / six.length * 10) / 10;
  const w = weather[c.id] || weather[c.within];
  const great = w?.m?.flatMap((m, i) => (m[3] === "G" ? [i + 1] : [])) || [];
  const seasons = { ...(w?.s || {}) };
  const ski = ratings.interests.indexOf("Skiing");
  if (ski >= 0 && likes[ski] >= GREAT) seasons.Skiing = c.lat < 0 ? SKI_SOUTH : SKI_NORTH;
  const when = [great.length && `Great weather ${monthRanges(great)}`,
    ...Object.entries(seasons).map(([what, months]) => `${what} ${monthRanges(months)}`)].filter(Boolean);
  return { parts, likes, overall, w, great, when, todo: activities[c.id] || [] };
}

function placePage(c) {
  const f = placeFacts(c), parent = c.within && byId.get(c.within), slug = slugOf.get(c.id);
  const full = parent ? `${c.name}, ${parent.name}` : c.name;
  const scoreRows = [...ratings.categories.map((name, i) => [name, f.parts[i]]), ...ratings.interests.map((name, i) => [name, f.likes[i]])]
    .filter(([, v]) => v != null)
    .map(([name, v]) => `<tr><th scope="row">${esc(name)}</th><td>${v}</td><td>${v >= GREAT ? "Great" : ""}</td></tr>`).join("\n");
  const weatherRows = (f.w?.m || []).map((m, i) =>
    `<tr${m[3] === "G" ? ' class="on"' : ""}><th scope="row">${MONTH_NAMES[i]}</th><td>${m[0]}°</td><td>${m[1]}°</td><td>${m[2]} mm</td><td>${RATING[m[3]] || ""}</td></tr>`).join("\n");
  const areas = places.filter((p) => p.within === c.id);
  const greatFor = ratings.categories.filter((_, i) => f.parts[i] >= GREAT).concat(ratings.interests.filter((_, i) => f.likes[i] >= GREAT));
  const where = c.town || c.capital;
  const facts = [
    parent && ["Part of", `<a href="../${esc(slugOf.get(parent.id))}/">${esc(parent.flag || "")} ${esc(parent.name)}</a>`],
    where && [c.town ? "Main town" : "Capital", esc(where)],
    c.subregion && ["Region", esc(c.subregion)],
    c.currencies?.length && ["Currency", esc(c.currencies.join(", "))],
    c.languages?.length && ["Languages", esc(c.languages.slice(0, 4).join(", "))],
  ].filter(Boolean);
  const description = [`${full} scores ${f.overall.toFixed(1)} out of 10 on The Corner World.`,
    f.when.length ? `Best time to visit: ${f.when.join("; ")}.` : "",
    f.todo.length ? `Top things to do: ${f.todo.slice(0, 2).join("; ")}.` : ""].filter(Boolean).join(" ");
  const body = `
<p class="back-link"><a href="../">All places</a>${parent ? ` · <a href="../${esc(slugOf.get(parent.id))}/">${esc(parent.name)}</a>` : ""}</p>
<div class="dest-head"><p class="flag big" aria-hidden="true">${esc(c.flag || "")}</p><div><h1>${esc(c.name)}</h1><p class="lede">${parent ? `${esc(parent.name)} · ` : ""}${esc(c.subregion || c.region || "")}</p></div></div>
<div class="stats">
  <p class="stat"><span class="stat-v">${f.overall.toFixed(1)}</span><span class="stat-l">out of 10, before flights</span></p>
  <p class="stat"><span class="stat-v">${esc(f.great.length ? monthRanges(f.great) : "None")}</span><span class="stat-l">great weather</span></p>
</div>
${greatFor.length ? `<p class="great-for">Great for</p>\n<ul class="tags">${greatFor.map((g) => `<li class="tag">${esc(g)}</li>`).join("")}</ul>` : ""}
<p><a class="primary cta" href="../../#c=${encodeURIComponent(c.id)}">See ${esc(c.name)} on the globe</a></p>
${f.todo.length ? `<h2 class="section">Top 3 things to do</h2>\n<ol class="top3">${f.todo.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>` : ""}
<h2 class="section">Best time to visit ${esc(c.name)}</h2>
<p>${f.when.length ? esc(f.when.join(" · ")) : "No month has great weather; okay months are marked below."}</p>
${weatherRows ? `<table class="place-table"><caption>Average weather${f.w?.at ? ` at ${esc(f.w.at)}` : where ? ` around ${esc(where)}` : ""}, 2015 to 2024</caption>
<thead><tr><th scope="col">Month</th><th scope="col">High</th><th scope="col">Low</th><th scope="col">Rain</th><th scope="col">Weather</th></tr></thead>
<tbody>
${weatherRows}
</tbody></table>` : ""}
<h2 class="section">Scores out of 10</h2>
<table class="place-table"><tbody>
${scoreRows}
</tbody></table>
<p class="note">Our own judgement of each category. The overall score is the average of the five categories and the best interest. On the globe, Budget also counts the flights from where you live.</p>
${facts.length ? `<h2 class="section">Facts</h2>\n<dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>` : ""}
${areas.length ? `<h2 class="section">Explore by area</h2>\n<ul class="tags">${areas.map((a) => `<li><a class="tag" href="../${esc(slugOf.get(a.id))}/">${esc(a.name)}</a></li>`).join("")}</ul>` : ""}
${c.advice != null ? `<h2 class="section">Before you go</h2>\n<p class="note">Read the <a href="https://www.gov.uk/foreign-travel-advice/${esc(c.advice)}" target="_blank" rel="noopener">UK government's travel advice for ${esc(parent ? parent.name : c.name)}</a>.</p>` : ""}
<h2 class="section">Want it planned for you?</h2>
<p class="note">A trip page for ${esc(c.name)}: every day hour by hour, every journey timed and every cost added up. <a href="../../plan/">See what you get</a>.</p>
<p class="credits">Weather: NASA POWER daily readings, 2015 to 2024. Scores and things to do: The Corner World.</p>`;
  return page({
    up: "../../", path: `places/${slug}/`, index: true, body, footer: "short",
    title: `Best time to visit ${full}: weather, things to do and scores | ${NAME}`, description,
  });
}

function placesIndex() {
  const byRegion = new Map();
  for (const c of [...places].sort((a, b) => a.name.localeCompare(b.name))) {
    const region = (c.within ? byId.get(c.within)?.region : c.region) || "Other";
    if (!byRegion.has(region)) byRegion.set(region, []);
    byRegion.get(region).push(c);
  }
  const body = `
<h1>Every place we score</h1>
<p class="lede">${places.length} countries, regions and islands, each with its best time to visit, top three things to do and scores out of 10.</p>
${[...byRegion.keys()].sort().map((region) => `<h2 class="section">${esc(region)}</h2>
<ul class="tags">${byRegion.get(region).map((c) => `<li><a class="tag" href="${esc(slugOf.get(c.id))}/">${esc(c.flag || "")} ${esc(c.name)}${c.within ? `, ${esc(byId.get(c.within)?.name || "")}` : ""}</a></li>`).join("")}</ul>`).join("\n")}`;
  return page({ up: "../", path: "places/", index: true, body, footer: "short",
    title: `Every place: best time to visit, things to do and scores | ${NAME}`,
    description: `The best time to visit, top things to do and scores out of 10 for ${places.length} countries, regions and islands.` });
}

rmSync(new URL("places/", out), { recursive: true, force: true }); // places that left the data leave the site
mkdirSync(new URL("places/", out), { recursive: true });
writeFileSync(new URL("places/index.html", out), placesIndex());
for (const c of places) {
  mkdirSync(new URL(`places/${slugOf.get(c.id)}/`, out), { recursive: true });
  writeFileSync(new URL(`places/${slugOf.get(c.id)}/index.html`, out), placePage(c));
}
console.log(`${places.length} place pages written`);

// The sitemap needs full addresses, so it waits for `url` in site.json
if (base) {
  const urls = ["", "samples/", "plan/", "privacy/", "terms/", "places/", ...places.map((c) => `places/${slugOf.get(c.id)}/`)];
  writeFileSync(new URL("sitemap.xml", out), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${esc(base + u)}</loc></url>`).join("\n")}
</urlset>
`);
}

console.log("Privacy notice, terms and footers written");
console.log(base ? `Sitemap written for ${base}` : "No sitemap: set \"url\" in docs/data/site.json to the site's address");
