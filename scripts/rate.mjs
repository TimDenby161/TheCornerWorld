// npm run rate: the owner's rating page, on this computer only (http://127.0.0.1:8740).
// Pick a country, give it a score out of 10 for each category, and it is written straight into
// docs/data/ratings.json, which the map colours from. Nothing here is published: the page lives in
// scripts/, and the server only listens on this machine.
//
// ratings.json: { categories: [...], interests: [...], checked: [ids you have scored yourself],
//   scores: { id: [a score for each category, then one for each interest] } }
// The overall score is the average of six numbers: the categories, and the best of the interests.
// A state or island with no scores of its own takes its country's.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "docs/data/ratings.json");
const countries = JSON.parse(readFileSync(join(root, "docs/data/countries.json"), "utf8"))
  .map(({ id, name, flag, region, within }) => ({ id, name, flag, region, within }));
const ids = new Set(countries.map((c) => c.id));
const PORT = 8740;

// One country to a line, so a change shows up in git as one line
export function format(r) {
  const rows = Object.keys(r.scores).sort().map((id) => `  ${JSON.stringify(id)}: [${r.scores[id].join(", ")}]`);
  return `{\n "categories": ${JSON.stringify(r.categories)},\n "interests": ${JSON.stringify(r.interests)},\n "checked": ${JSON.stringify([...new Set(r.checked)].sort())},\n "scores": {\n${rows.join(",\n")}\n }\n}\n`;
}

function valid(r) {
  if (!r || !Array.isArray(r.categories) || !Array.isArray(r.interests) || !Array.isArray(r.checked) || typeof r.scores !== "object") return "missing categories, interests, checked or scores";
  const size = r.categories.length + r.interests.length;
  for (const [id, parts] of Object.entries(r.scores)) {
    if (!ids.has(id)) return `unknown country ${id}`;
    if (!Array.isArray(parts) || parts.length !== size || !parts.every((n) => Number.isInteger(n) && n >= 1 && n <= 10)) return `${id}: each score must be a whole number from 1 to 10`;
  }
  return "";
}

const server = createServer((req, res) => {
  const send = (code, type, body) => { res.writeHead(code, { "content-type": type, "cache-control": "no-store" }); res.end(body); };
  if (req.method === "GET" && req.url === "/") return send(200, "text/html; charset=utf-8", readFileSync(join(root, "scripts/rate.html")));
  if (req.method === "GET" && req.url === "/data") return send(200, "application/json", JSON.stringify({ countries, ratings: JSON.parse(readFileSync(file, "utf8")) }));
  if (req.method === "POST" && req.url === "/data") {
    // Only this page may write: a page on another site can't send this header without the browser asking first
    if (req.headers["x-rate"] !== "1") return send(403, "text/plain", "no");
    let body = "";
    req.on("data", (chunk) => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on("end", () => {
      let r;
      try { r = JSON.parse(body); } catch { return send(400, "text/plain", "not JSON"); }
      const problem = valid(r);
      if (problem) return send(400, "text/plain", problem);
      writeFileSync(file + ".tmp", format(r));
      renameSync(file + ".tmp", file);
      send(200, "text/plain", "saved");
    });
    return;
  }
  send(404, "text/plain", "not found");
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${PORT}/`;
    console.log(`Rating page: ${url}  (Ctrl+C to stop). Saves go to docs/data/ratings.json.`);
    exec(`${process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"} ${url}`);
  });
}
