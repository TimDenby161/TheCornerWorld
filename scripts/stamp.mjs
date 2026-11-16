// Puts a version on every script and stylesheet address in the site's pages, such as
// `assets/app.js?v=3f9c2a1b`. The version is a fingerprint of the file, so it changes when the file does
// and at no other time. A browser keeps a script or stylesheet for a while under its full address; a new
// address makes it fetch the new file at once, so a page never runs with an old copy of its own code.
// Run with `npm run build:version` after changing anything in docs/assets/ or a trip page's files.
// `npm run build:pages` runs it too. With --check it changes nothing and fails if a page is out of date.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const docs = fileURLToPath(new URL("../docs/", import.meta.url));
const checkOnly = process.argv.includes("--check");

export function pages(dir = docs) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? pages(join(dir, entry.name)) : entry.name.endsWith(".html") ? [join(dir, entry.name)] : []);
}

const fingerprints = new Map();
function fingerprint(file) {
  if (!fingerprints.has(file)) fingerprints.set(file, createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 8));
  return fingerprints.get(file);
}

// A page's text with every local .js and .css address stamped: what a script or stylesheet tag loads,
// and `data-lib`, the library assets/account.js fetches when someone signs in
export function stamped(page, html = readFileSync(page, "utf8")) {
  const stamp = (all, before, address, after) => {
    if (/^([a-z]+:)?\/\//i.test(address)) return all;
    const file = join(dirname(page), address);
    return existsSync(file) ? `${before}${address}?v=${fingerprint(file)}${after}` : all;
  };
  return html
    .replace(/(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"?#]+\.(?:js|css))(?:\?[^"#]*)?(")/g, stamp)
    .replace(/(<script\b[^>]*?\bdata-lib=")([^"?#]+\.js)(?:\?[^"#]*)?(")/g, stamp);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const stale = pages().filter((page) => {
    const html = readFileSync(page, "utf8"), next = stamped(page, html);
    if (next === html) return false;
    if (!checkOnly) writeFileSync(page, next);
    return true;
  });
  if (checkOnly && stale.length) {
    console.error(`${stale.length} page(s) point at old versions of their scripts or styles. Run: npm run build:version`);
    for (const page of stale.slice(0, 10)) console.error(`  ${relative(docs, page)}`);
    process.exit(1);
  }
  console.log(checkOnly ? "Versions are up to date" : stale.length ? `Versions updated on ${stale.length} page(s)` : "Versions already up to date");
}
