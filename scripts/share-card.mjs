// Draws the site's share card (docs/assets/share.png, 1200×630): the real globe, every place coloured by its
// score as on the map (SCORE_STOPS and --g-s* in assets/globe.js and home.css, dark set), beside the site's name.
// Run with `node scripts/share-card.mjs` after big score changes. Needs `npm install` and Google Chrome.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import * as d3 from "d3";
import * as topojson from "topojson-client";

const data = (name) => JSON.parse(readFileSync(new URL(`../docs/data/${name}.json`, import.meta.url), "utf8"));
const world = data("world"), countries = data("countries"), ratings = data("ratings");
const byKey = new Map(countries.map((c) => [String(c.key), c]));
const n = ratings.categories.length;
function overall(c) { // as scoreOf in assets/app.js, before flights
  const all = ratings.scores[c.id] || ratings.scores[c.within];
  if (!all) return null;
  const likes = all.slice(n), six = [...all.slice(0, n), ...(likes.length ? [Math.max(...likes)] : [])];
  return six.reduce((a, b) => a + b, 0) / six.length;
}
const colour = d3.scaleLinear().domain([2.5, 5, 6.5, 8.5]).range(["#b9443a", "#c98232", "#bfa944", "#25a87c"]).interpolate(d3.interpolateRgb).clamp(true);

const R = 300, size = 2 * R + 20;
const projection = d3.geoOrthographic().scale(R).translate([size / 2, size / 2]).rotate([-15, -22]).clipAngle(90);
const path = d3.geoPath(projection);
const shapes = topojson.feature(world, world.objects.countries).features;
const land = shapes.map((f) => {
  const c = byKey.get(String(f.id)), s = c && overall(c);
  const d = path(f);
  return d ? `<path d="${d}" fill="${s == null ? "#3b424e" : colour(s)}" stroke="#0a1524" stroke-width="0.6"/>` : "";
}).join("");
const graticule = path(d3.geoGraticule10());
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<defs><radialGradient id="o" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#1d3757"/><stop offset="1" stop-color="#0a1524"/></radialGradient></defs>
<circle cx="${size / 2}" cy="${size / 2}" r="${R}" fill="url(#o)"/>
<path d="${graticule}" fill="none" stroke="rgba(255,255,255,.06)"/>${land}
<circle cx="${size / 2}" cy="${size / 2}" r="${R}" fill="none" stroke="rgba(120,170,230,.35)" stroke-width="2"/></svg>`;

const places = countries.filter((c) => ratings.scores[c.id]).length;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
body{background:radial-gradient(circle at 80% 50%,#123a6b 0,#0b1f3a 55%,#08162a 100%);color:#fff;position:relative}
.globe{position:absolute;right:-40px;top:-5px;filter:drop-shadow(0 0 50px rgba(57,135,229,.45))}
.wrap{position:absolute;left:72px;top:82px;width:560px}
.brand{font-size:30px;font-weight:600;display:flex;align-items:center;gap:14px;color:#dce8f7}
.mark{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#1baf7a,#2a78d6)}
h1{font-size:76px;line-height:1.02;margin:42px 0 24px;letter-spacing:-1.5px}
p{font-size:30px;line-height:1.35;margin:0;color:#c9d9ee}
.scale{display:flex;align-items:center;gap:14px;margin-top:42px;font-size:22px;color:#a9bfdc}
.bar{width:170px;height:12px;border-radius:99px;background:linear-gradient(90deg,#b9443a,#c98232 40%,#bfa944 60%,#25a87c)}
</style></head><body><div class="globe">${svg}</div><div class="wrap">
<div class="brand"><span class="mark"></span>The Corner World</div>
<h1>Where to go,<br>and when</h1>
<p>${places} countries, regions and islands scored out of 10, with the best months to go.</p>
<div class="scale">1<span class="bar"></span>10</div>
</div></body></html>`;

const dir = mkdtempSync(join(tmpdir(), "share-card-"));
writeFileSync(join(dir, "card.html"), html);
const out = new URL("../docs/assets/share.png", import.meta.url).pathname;
execFileSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1200,630", `--screenshot=${out}`, `file://${join(dir, "card.html")}`],
  { stdio: "ignore" });
rmSync(dir, { recursive: true, force: true });
console.log(`Share card written: docs/assets/share.png (${places} places)`);
