// Switches accounts (sign-in) on or off across the site, from one place.
//
//   npm run accounts -- https://abcdefgh.supabase.co sb_publishable_…   switch on, for this Supabase project
//   npm run accounts -- off                                             switch off
//   npm run accounts                                                    apply what data/site.json already says
//
// The project's address and publishable key go into docs/data/site.json ("accounts"), and from there
// into every page that loads assets/account.js: onto its script tag, and into the page's security
// policy, which otherwise lets a page talk to nowhere but this site. `npm run check` fails if a page
// and site.json disagree.
//
// Both values are public by design: they are in every visitor's browser. The key to keep secret is the
// other one, the secret (or "service_role") key, which this script refuses to accept.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import { pages } from "./stamp.mjs";

const docs = fileURLToPath(new URL("../docs/", import.meta.url));
const sitePath = fileURLToPath(new URL("../docs/data/site.json", import.meta.url));

// Says what is wrong with an address and key, or returns nothing if they are fine
export function problem({ url, key }) {
  if (!url && !key) return "";
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url)) return `"${url}" isn't a Supabase project address (https://<project>.supabase.co, with nothing after it)`;
  if (/^sb_secret_/.test(key)) return "that is the SECRET key. It must never go in the site: anyone holding it can read and change everything. Use the publishable key (sb_publishable_…)";
  if (/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(key)) return "";
  // An older project's keys are tokens that say which role they are for
  try {
    const role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role;
    if (role === "anon") return "";
    return `that key is for the "${role}" role. It must never go in the site. Use the publishable (anon) key`;
  } catch { return "that doesn't look like a Supabase publishable key (sb_publishable_…)"; }
}

// A page's text with the account settings written in: on the script tag and in the security policy
export function applied(html, { url, key }) {
  if (!/<script\b[^>]*\bsrc="[^"]*account\.js/.test(html)) return html;
  return html
    .replace(/(<script\b[^>]*\bsrc="[^"]*account\.js[^"]*")\s+data-url="[^"]*"\s+data-key="[^"]*"/, (all, before) => `${before} data-url="${url}" data-key="${key}"`)
    .replace(/(<meta http-equiv="Content-Security-Policy" content="[^"]*?)connect-src [^;"]*/, (all, before) => `${before}connect-src 'self'${url ? ` ${url}` : ""}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const site = JSON.parse(readFileSync(sitePath, "utf8"));
  const [first, second] = process.argv.slice(2);
  if (first === "off") site.accounts = { url: "", key: "" };
  else if (first) site.accounts = { url: first.replace(/\/+$/, ""), key: second || "" };
  site.accounts = { url: "", key: "", ...site.accounts };
  const wrong = problem(site.accounts) || (Boolean(site.accounts.url) !== Boolean(site.accounts.key) ? "an address and a key are both needed" : "");
  if (wrong) { console.error(`Not changed: ${wrong}.`); process.exit(1); }
  if (first) writeFileSync(sitePath, `${JSON.stringify(site, null, 2)}\n`);
  let changed = 0;
  for (const page of pages()) {
    const html = readFileSync(page, "utf8"), next = applied(html, site.accounts);
    if (next !== html) { writeFileSync(page, next); changed++; console.log(`  ${relative(docs, page)}`); }
  }
  execFileSync(process.execPath, [fileURLToPath(new URL("./stamp.mjs", import.meta.url))], { stdio: "inherit" });
  console.log(site.accounts.url ? `Accounts are ON for ${site.accounts.url} (${changed} page(s) updated)` : `Accounts are OFF (${changed} page(s) updated)`);
}
