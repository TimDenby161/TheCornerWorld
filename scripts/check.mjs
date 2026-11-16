// Looks over the site in docs/ for the mistakes that are easy to make and hard to see. Run with
// `npm run check` before publishing; it changes nothing. It fails (and says why) if:
//   - a page is missing the security policy, or has script written into it, or loads anything from
//     another site, or opens a new tab without `rel="noopener"`;
//   - a page may talk to anywhere but this site and, where it has sign-in, the Supabase project in
//     data/site.json; or a secret key has got into the site;
//   - an email address has found its way into the published site (client details must never be there);
//   - the copies of D3, topojson and Supabase's library in docs/assets/lib/ differ from the ones npm installed;
//   - a data file or script doesn't parse;
//   - a page points at an old version of its scripts or styles (see scripts/stamp.mjs);
//   - a client's trip page isn't locked with a password (scripts/lock.mjs), could be listed by a search
//     engine, or would pass its address on to other sites.
// It warns, without failing, about things only you can decide.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { pages, stamped } from "./stamp.mjs";
import { problem as accountsProblem, applied as withAccounts } from "./accounts.mjs";

const root = fileURLToPath(new URL("../", import.meta.url)), docs = join(root, "docs");
const failures = [], warnings = [];
const name = (file) => relative(root, file);
const fail = (file, message) => failures.push(`${name(file)}: ${message}`);
const isClient = (file) => /^c[\\/]/.test(relative(docs, file)); // a client's trip page, in docs/c/

const files = (dir, ends) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? files(join(dir, entry.name), ends) : ends.some((end) => entry.name.endsWith(end)) ? [join(dir, entry.name)] : []);

// ---------- pages ----------

const site = JSON.parse(readFileSync(join(docs, "data/site.json"), "utf8"));
const accounts = { url: "", key: "", ...site.accounts };
const all = pages();
for (const page of all) {
  const html = readFileSync(page, "utf8");
  const policy = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1];
  if (!policy) fail(page, "no Content-Security-Policy");
  else {
    const rule = (key) => policy.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${key} `)) || "";
    if (rule("default-src") !== "default-src 'self'") fail(page, "the policy's default-src must be 'self' alone");
    // trip/ and a locked client page (docs/c/) run a trip page's script from memory once it has been
    // handed over or unscrambled, which needs blob:
    const fromMemory = relative(docs, page) === join("trip", "index.html") || isClient(page);
    const scripts = fromMemory ? "script-src 'self' blob:" : "script-src 'self'";
    if (rule("script-src") !== scripts) fail(page, `the policy's script-src must be exactly ${scripts.slice(11)}: no inline script, no eval, no other sites`);
    // A page with sign-in may talk to the Supabase project; every other page, to this site alone
    const signIn = /<script\b[^>]*\bsrc="[^"]*account\.js/.test(html);
    const talksTo = `connect-src 'self'${signIn && accounts.url ? ` ${accounts.url}` : ""}`;
    if (rule("connect-src") !== talksTo) fail(page, `the policy's connect-src must be exactly ${talksTo.slice(12)}${signIn ? ". Run: npm run accounts" : ""}`);
    if (signIn && withAccounts(html, accounts) !== html) fail(page, "its account settings differ from data/site.json. Run: npm run accounts");
    for (const key of ["object-src 'none'", "base-uri 'none'", "form-action 'none'"]) if (!policy.includes(key)) fail(page, `the policy is missing ${key}`);
  }
  const tags = html.match(/<[a-zA-Z][^>]*>/g) || [];
  for (const tag of tags) {
    const short = tag.length > 90 ? `${tag.slice(0, 90)}…` : tag;
    if (/^<script\b/i.test(tag) && !/\bsrc="/.test(tag)) fail(page, `script written into the page (the policy blocks it): ${short}`);
    if (/\son[a-z]+\s*=/i.test(tag)) fail(page, `an on… attribute (the policy blocks it): ${short}`);
    if (/\b(?:href|src)="\s*javascript:/i.test(tag)) fail(page, `a javascript: address: ${short}`);
    if (/^<(?:script|link|img|iframe|video|audio|source|embed|object)\b/i.test(tag) && /\b(?:src|href)="(?:[a-z]+:)?\/\//i.test(tag) && !/\brel="(?:canonical)"/.test(tag)) fail(page, `loads from another site: ${short}`);
    if (/^<a\b/i.test(tag) && /\btarget="_blank"/.test(tag) && !/\brel="[^"]*\bnoopener\b/.test(tag)) fail(page, `opens a new tab without rel="noopener": ${short}`);
  }
  if (stamped(page, html) !== html) fail(page, "points at an old version of its scripts or styles. Run: npm run build:version");
}

// ---------- client trip pages ----------

// The repository is public, so a client's trip may be in docs/c/ only locked with a password
// (scripts/lock.mjs): each folder holds the unlock page and trip.lock, and nothing readable.
const clientPages = all.filter(isClient);
for (const page of clientPages) {
  const html = readFileSync(page, "utf8");
  if (!/<meta name="robots" content="[^"]*noindex/.test(html)) fail(page, "a client's page must ask search engines not to list it (meta robots noindex)");
  if (!/<meta name="referrer" content="no-referrer"/.test(html)) fail(page, "a client's page must not pass its address to sites it links to (meta referrer no-referrer)");
}
const clientDir = join(docs, "c");
if (existsSync(clientDir)) {
  for (const entry of readdirSync(clientDir, { withFileTypes: true })) {
    const dir = join(clientDir, entry.name);
    if (!entry.isDirectory()) { fail(dir, "only locked trip folders belong in docs/c/"); continue; }
    const inside = readdirSync(dir).sort().join(" ");
    if (inside !== "index.html trip.lock") { fail(dir, `a client's trip must be locked: the folder should hold index.html and trip.lock only, not ${inside || "nothing"}. Run: npm run lock -- ${entry.name}`); continue; }
    if (!/<script src="\.\.\/\.\.\/assets\/unlock\.js[?"]/.test(readFileSync(join(dir, "index.html"), "utf8"))) fail(join(dir, "index.html"), `isn't the unlock page. Run: npm run lock -- ${entry.name}`);
    try {
      const locked = JSON.parse(readFileSync(join(dir, "trip.lock"), "utf8"));
      if (locked.v !== 1 || !locked.salt || !locked.iv || !locked.data || !(locked.iterations >= 600000)) throw new Error("not a trip.lock that scripts/lock.mjs made");
    } catch (err) { fail(join(dir, "trip.lock"), `${err.message}. Run: npm run lock -- ${entry.name}`); }
  }
}

// ---------- nothing private in the published site ----------

const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const allowed = new Set([site.contactEmail].filter(Boolean));
const made_up = /@example\.(com|org|net)$/; // addresses that can't belong to anyone, used as examples in the admin page
// A Supabase secret key, new style or old (a token whose contents name the service_role)
const secretKey = /sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
for (const file of files(docs, [".html", ".js", ".css", ".json", ".xml", ".webmanifest", ".svg", ".txt", ".md"])) {
  if (file.includes(`${join("assets", "lib")}`)) continue;
  const content = readFileSync(file, "utf8");
  const found = new Set((content.match(email) || []).filter((address) => !allowed.has(address) && !made_up.test(address)));
  for (const address of found) fail(file, `contains an email address (${address}). Only contactEmail from data/site.json belongs in the published site.`);
  for (const key of content.match(secretKey) || []) {
    let role = "";
    try { role = key.startsWith("sb_secret_") ? "secret" : JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role; } catch { /* not a token after all */ }
    if (role && role !== "anon") fail(file, `contains a Supabase ${role} key. Remove it, and replace the key in the Supabase dashboard at once: it has to be treated as stolen.`);
  }
}
for (const stray of [".env", "business"]) if (existsSync(join(docs, stray))) fail(join(docs, stray), "must not be inside docs/: everything there is published");

// ---------- libraries ----------

const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
for (const [lib, from] of [["d3.min.js", "d3/dist/d3.min.js"], ["topojson-client.min.js", "topojson-client/dist/topojson-client.min.js"], ["supabase.js", "@supabase/supabase-js/dist/umd/supabase.js"]]) {
  const ours = join(docs, "assets/lib", lib), theirs = join(root, "node_modules", from);
  if (!existsSync(theirs)) warnings.push(`${lib} was not compared with npm's copy: run npm install first.`);
  else if (sha(ours) !== sha(theirs)) fail(ours, `differs from node_modules/${from}. Run: npm run build:data`);
}

// ---------- data and scripts parse ----------

for (const file of files(join(docs, "data"), [".json"])) {
  try { JSON.parse(readFileSync(file, "utf8")); } catch (err) { fail(file, `not valid JSON: ${err.message}`); }
}
for (const file of [...files(docs, [".js"]), ...files(join(root, "scripts"), [".mjs"])]) {
  if (file.includes(`${join("assets", "lib")}`)) continue;
  try { execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }); } catch (err) { fail(file, `does not parse: ${String(err.stderr).split("\n").slice(0, 4).join(" ").trim()}`); }
}

// ---------- settings worth a look ----------

const wrong = accountsProblem(accounts) || (Boolean(accounts.url) !== Boolean(accounts.key) ? "an address and a key are both needed" : "");
if (wrong) fail(join(docs, "data/site.json"), `accounts: ${wrong}`);
if (accounts.url && !site.contactEmail) warnings.push("Accounts are on but contactEmail in data/site.json is empty, so the privacy page gives people no way to reach you about their data.");
if (accounts.url && accounts.url.startsWith("http://")) warnings.push(`Accounts point at a database on this computer (${accounts.url}). Don't publish like this: run "npm run accounts -- off" or give it the real project.`);
if (site.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(site.contactEmail)) fail(join(docs, "data/site.json"), "contactEmail is not an email address");
if (site.planning?.url && !/^https:\/\//.test(site.planning.url)) fail(join(docs, "data/site.json"), "planning.url must start with https://");
for (const partner of site.partners || []) if (!/^https:\/\//.test(partner.url || "")) fail(join(docs, "data/site.json"), `partner "${partner.label}" needs an https:// address`);

for (const warning of warnings) console.warn(`WARN  ${warning}`);
if (failures.length) {
  for (const failure of failures.slice(0, 40)) console.error(`FAIL  ${failure}`);
  if (failures.length > 40) console.error(`…and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`Site check passed: ${all.length} pages`);
