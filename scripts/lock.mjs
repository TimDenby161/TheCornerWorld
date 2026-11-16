// Publishes a client's trip page on the site, locked with a password.
//
//   npm run lock -- <slug>
//
// Reads business/clients/<slug>/trip.html, builds it into page, styles and script with the
// travel-plan-client skill's to-site.mjs (inside the client's folder, which git ignores), and writes
// docs/c/<slug>/: an unlock page and trip.lock, the trip scrambled with AES-256-GCM under a key made
// from the password (PBKDF2-SHA256). The repository is public, so this is what keeps a client's trip
// private: without the password, trip.lock is noise. Nothing readable about the trip goes into docs/.
//
// The password is kept in business/clients/<slug>/password.txt and made there the first time, so a
// rebuild after changes keeps the one the client already has. To give a client a new one, delete that
// file and run this again.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { webcrypto, randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const ITERATIONS = 600000;

const slug = process.argv[2];
if (!slug || !/^[a-z0-9]+-[a-z0-9-]+$/.test(slug)) {
  console.error("Usage: npm run lock -- <slug>   (the client's folder in business/clients/, e.g. k7q2-japan)");
  process.exit(1);
}
const client = join(root, "business/clients", slug);
const source = join(client, "trip.html");
if (!existsSync(source)) { console.error(`No trip page at business/clients/${slug}/trip.html`); process.exit(1); }

// The password: four groups of four letters and digits, with none that look alike (no 0/o, 1/l/i)
const passwordFile = join(client, "password.txt");
let password = existsSync(passwordFile) ? readFileSync(passwordFile, "utf8").trim() : "";
const made = !password;
if (made) {
  const letters = "abcdefghjkmnpqrstuvwxyz23456789";
  password = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => letters[randomInt(letters.length)]).join("")).join("-");
  writeFileSync(passwordFile, password + "\n");
}
// The unlock page forgives capitals and spaces, so the key is made from the same tidied form
const tidy = (text) => text.toLowerCase().replace(/\s+/g, "");

// Build the readable page inside the client's folder (ignored by git), never in docs/
const build = join(client, "build");
rmSync(build, { recursive: true, force: true });
const toSite = process.env.TO_SITE || join(homedir(), ".claude/skills/travel-plan-client/to-site.mjs");
execFileSync(process.execPath, [toSite, source, build, `c/${slug}`], { stdio: "pipe" });
const built = join(build, "docs/c", slug);
const page = readFileSync(join(built, "index.html"), "utf8");
const trip = {
  title: (page.match(/<title>([^<]*)<\/title>/) || [, "Your trip"])[1].replace(/ \| The Corner World$/, ""),
  html: page.slice(page.indexOf("<body>") + 6, page.lastIndexOf('<script src="trip.js')).trim(),
  css: readFileSync(join(built, "trip.css"), "utf8"),
  js: readFileSync(join(built, "trip.js"), "utf8"),
};
rmSync(build, { recursive: true, force: true });

// Scramble it
const { subtle } = webcrypto;
const salt = webcrypto.getRandomValues(new Uint8Array(16)), iv = webcrypto.getRandomValues(new Uint8Array(12));
const base = await subtle.importKey("raw", new TextEncoder().encode(tidy(password)), "PBKDF2", false, ["deriveKey"]);
const key = await subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const data = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(trip))));
const b64 = (bytes) => Buffer.from(bytes).toString("base64");
const locked = { v: 1, kdf: "PBKDF2-SHA256", iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(data) };

// Write the site's copy: the unlock page and the scrambled trip, and nothing else
const out = join(root, "docs/c", slug);
mkdirSync(out, { recursive: true });
for (const file of readdirSync(out)) rmSync(join(out, file), { recursive: true, force: true });
writeFileSync(join(out, "trip.lock"), JSON.stringify(locked) + "\n");
writeFileSync(join(out, "index.html"), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- A client's trip page, locked with a password. trip.lock is the page scrambled; once the right
     password unscrambles it, ../../assets/unlock.js shows it and runs its script from memory, which is
     what blob: allows. Nothing written into a page can use it, only a script already running. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex, nofollow">
<title>Your trip | The Corner World</title>
<link rel="icon" type="image/svg+xml" href="../../favicon.svg">
<link rel="apple-touch-icon" href="../../apple-touch-icon.png">
<link rel="stylesheet" href="../../assets/trip-view.css" id="tv-style">
</head>
<body>
<main class="tv" id="tv">
  <p class="tv-brand"><a href="../../">The Corner World</a></p>
  <h1 class="tv-title">Your trip</h1>
  <p class="tv-text" id="tv-text" role="status">Enter the password from our email to open your trip page.</p>
  <div class="tv-actions" id="tv-actions"></div>
  <noscript><p class="tv-text">Your trip page needs JavaScript switched on.</p></noscript>
</main>
<script src="../../assets/unlock.js"></script>
</body>
</html>
`);
execFileSync(process.execPath, [join(root, "scripts/stamp.mjs")], { stdio: "pipe" });

const site = JSON.parse(readFileSync(join(root, "docs/data/site.json"), "utf8"));
console.log(`Locked: docs/c/${slug}/ (index.html, trip.lock)`);
console.log(`Link:     ${site.url || "<site url>/"}c/${slug}/`);
console.log(`Password: ${password}${made ? "  (new: saved in business/clients/" + slug + "/password.txt)" : "  (the same as before)"}`);
