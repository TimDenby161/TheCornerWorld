// Shown inside the planning page's phone frame: hide the "get one made" button there
try { if (window.top !== window) document.documentElement.classList.add("framed"); } catch (e) { document.documentElement.classList.add("framed"); }

const STORE_NS = "trip:plan/samples/italy:";
const PAX = 3; // travellers: every price on the page is the total for this many people
// Fixed timetable items: [day, start, end, title, kind, note, option-only ("a"/"b"), price, duration override]
// Activities (acts) are optional: add, move or remove them on the calendar. pp = £ per person, tr = £ extra transport for 3.
// def = suggested slot [day, start] or null. Free time inside win (arrive → leave) shows as Free.
const PLACES = [
  { name:"Florence", country:"Italy", tz:"1 hour ahead of the UK", arrive:"Sat 22 May, 11:15", stay:"3 nights", from:7, to:22,
    cost:{hotel:[430,860,"3 nights · family room",570],transport:[18,18],act:[0,0],food:[0,0]},
    win:[[0,"12:00"],[3,"10:00"]],
    meals:[["l0", "Lunch · schiacciata", 0, "12:30", 60, 7, "Florence's stuffed flatbread, from a sandwich shop"], ["d0", "Dinner · trattoria", 0, "18:30", 90, 19, "Book the first sitting · plain pasta for the little one"], ["b1", "Breakfast", 1, "08:00", 45, 6, "Cornetto and cappuccino at the bar"], ["l1", "Lunch · Mercato Centrale", 1, "12:30", 60, 11, "Food hall: something for everyone"], ["d1", "Dinner", 1, "18:45", 90, 19, ""], ["b2", "Breakfast", 2, "08:00", 45, 6, ""], ["l2", "Lunch in Pisa", 2, "13:00", 60, 11, ""], ["d2", "Dinner · bistecca night", 2, "18:30", 90, 24, "Bistecca alla fiorentina to share"], ["b3", "Breakfast", 3, "08:00", 45, 6, ""]],
    blurb:"Small enough to walk, with gelato every hundred metres. Short visits to the big galleries, a garden to run around in, and a day trip to Pisa's Leaning Tower.",
    days:[["Day 1","Sat 22 May"],["Day 2","Sun 23 May"],["Day 3","Mon 24 May"],["Day 4","Tue 25 May"]],
    ev:[
      [0,"09:15","11:15","Flight from Heathrow","flight","BA · leaves 08:05 UK time, lands 11:15 Florence time","","£510 for 3","2h10"],
      [0,"11:15","12:00","Bags, then tram T2","shuttle","Airport → Unità in 20 min · under-6s free","","€3.40 (£3) for 3","45m"],
      [3,"10:00","11:35","Frecciarossa to Rome","shuttle","Firenze SMN → Roma Termini · book a table of four · children 4–14 half price","","€100 (£87) for 3","1h35"],
    ],
    acts:[
      {id:"duomo", name:"Duomo + Piazza della Signoria", dur:120, pp:0, note:"Cathedral free to enter · gelato on the way", def:[0,"14:00"]},
      {id:"uffizi", name:"Uffizi (short visit)", dur:120, pp:14.5, note:"€25 (£22) each adult in high season, under-18s free · timed entry · closed Mondays", def:[1,"09:00"]},
      {id:"boboli", name:"Boboli Gardens", dur:120, pp:5.8, note:"€10 (£8.70) each adult, under-18s free · room to run", def:[1,"14:30"]},
      {id:"piazzale", name:"Piazzale Michelangelo view", dur:90, pp:0, tr:6, note:"Bus 12 or 13 up, €1.70 (£1.50) each adult, under-6s free · walk down", def:[1,"16:45"]},
      {id:"pisa", name:"Pisa day trip", dur:330, pp:0, tr:39, note:"Regional train about €9 (£7.80) each adult each way, children half · under-8s can't climb the tower, so it's photos on the lawn", def:[2,"09:30"], segs:[["Train to Pisa", 60, "shuttle", "£19.50"], ["Piazza dei Miracoli + Leaning Tower", 150, "act", "Free"], ["", 60, "gap", ""], ["Train back", 60, "shuttle", "£19.50"]]},
      {id:"carousel", name:"Carousel, Piazza della Repubblica", dur:30, pp:0.6, note:"One ride €2 (£1.75)", def:[2,"16:30"]},
      {id:"leonardo", name:"Leonardo Interactive Museum", dur:90, pp:7, note:"Hands-on models of his machines · about €9 (£7.80) adults, less for children", def:null},
      {id:"accademia", name:"Accademia · Michelangelo's David", dur:75, pp:9.3, note:"About €16 (£14) each adult, under-18s free · closed Mondays", def:null},
    ],
    flag:"<b>Check:</b> BA's Heathrow–Florence times are from the 2026 timetable. Florence airport's runway is short: in bad weather, flights divert to Pisa or Bologna."
  },
  { name:"Rome", country:"Italy", arrive:"Tue 25 May, 11:35", stay:"3 nights", from:7, to:22,
    cost:{hotel:[450,900,"3 nights · family room",600],transport:[120,120],act:[0,0],food:[0,0]},
    win:[[0,"12:15"],[3,"10:00"]],
    meals:[["l0", "Lunch · pizza al taglio", 0, "12:30", 60, 8, "Pizza by the slice, sold by weight"], ["d0", "Dinner", 0, "18:30", 90, 20, "Cacio e pepe and carbonara"], ["b1", "Breakfast", 1, "08:00", 45, 6, ""], ["l1", "Lunch", 1, "12:30", 60, 11, ""], ["d1", "Dinner", 1, "18:30", 90, 20, ""], ["b2", "Breakfast", 2, "07:45", 45, 6, ""], ["l2", "Lunch", 2, "13:15", 60, 11, ""], ["d2", "Dinner in Trastevere", 2, "18:30", 90, 22, ""], ["b3", "Breakfast", 3, "08:00", 45, 6, ""]],
    blurb:"One big sight each morning, then a long lunch, a rest and a park. Under-18s go free at the Colosseum and Pantheon, and under-6s at the Vatican.",
    days:[["Day 1","Tue 25 May"],["Day 2","Wed 26 May"],["Day 3","Thu 27 May"],["Day 4","Fri 28 May"]],
    ev:[
      [0,"10:00","11:35","Frecciarossa to Rome","shuttle","Firenze SMN → Roma Termini · book a table of four · children 4–14 half price","","€100 (£87) for 3","1h35"],
      [0,"11:45","12:15","Taxi to the hotel","walk","From the Termini rank","","€15 (£13) for 3","30m"],
      [3,"10:00","11:10","Frecciarossa to Naples","shuttle","Roma Termini → Napoli Centrale · children 4–14 half price","","€75 (£65) for 3","1h10"],
    ],
    acts:[
      {id:"centro", name:"Pantheon, Piazza Navona + Trevi", dur:180, pp:2.9, note:"Pantheon €5 (£4.35) each adult, under-18s free · a coin in the Trevi", def:[0,"14:00"]},
      {id:"colosseum", name:"Colosseum + Roman Forum", dur:180, pp:10.4, note:"€18 (£15.60) each adult, under-18s free · timed tickets go on sale about 30 days ahead and sell out", def:[1,"09:00"]},
      {id:"borghese", name:"Villa Borghese park", dur:150, pp:5.8, note:"Hire a family rickshaw bike, about €20 (£17.40) an hour · pond rowing boats", def:[1,"15:30"]},
      {id:"vatican", name:"Vatican Museums + St Peter's", dur:240, pp:14.5, note:"€25 (£22) each adult online, under-6s free · buggies allowed · closed Sundays", def:[2,"09:00"]},
      {id:"pizza", name:"Family pizza-making class", dur:150, pp:29, note:"About €40 each adult, €20 a child (£87 for 3)", def:null},
      {id:"explora", name:"Explora children's museum", dur:105, pp:8.7, note:"Hands-on museum for under-12s · about €10 (£8.70) each, timed sessions", def:null},
    ],
    flag:"<b>Check:</b> Colosseum tickets are released about 30 days ahead and go within hours. The Vatican is very busy: book the first entry slot."
  },
  { name:"Sorrento", country:"Italy", arrive:"Fri 28 May, 12:45", stay:"3 nights", from:7, to:22,
    cost:{hotel:[390,780,"3 nights · family room with a pool",525],transport:[301,301],act:[0,0],food:[0,0]},
    win:[[0,"12:45"],[3,"12:00"]],
    meals:[["l0", "Lunch", 0, "13:00", 60, 11, ""], ["d0", "Dinner · gnocchi alla sorrentina", 0, "18:45", 90, 20, ""], ["b1", "Breakfast at the hotel", 1, "08:00", 45, 0, "In the room price"], ["l1", "Lunch on Capri", 1, "12:25", 60, 15, "Pricey: about €17 (£15) each"], ["d1", "Dinner", 1, "18:30", 90, 20, ""], ["b2", "Breakfast at the hotel", 2, "08:00", 45, 0, "In the room price"], ["l2", "Lunch", 2, "13:15", 60, 11, ""], ["d2", "Dinner · Marina Grande", 2, "18:45", 90, 22, "Seafood by the fishing boats"], ["b3", "Breakfast at the hotel", 3, "08:30", 45, 0, "In the room price"]],
    blurb:"Cliffs, lemon groves and a hotel pool. A boat to Capri, a morning in Pompeii under Vesuvius, and an afternoon on the beach.",
    days:[["Day 1","Fri 28 May"],["Day 2","Sat 29 May"],["Day 3","Sun 30 May"],["Day 4","Mon 31 May"]],
    ev:[
      [0,"10:00","11:10","Frecciarossa to Naples","shuttle","Roma Termini → Napoli Centrale · children 4–14 half price","","€75 (£65) for 3","1h10"],
      [0,"11:30","12:45","Private transfer to Sorrento","shuttle","Driver meets you at the station · child seat included","","€130 (£113) for 3","1h15"],
      [3,"12:00","13:15","Private transfer to Naples airport","shuttle","Child seat included","","€130 (£113) for 3","1h15"],
      [3,"13:15","14:15","Lunch at the airport","food","","","€12 (£10.50) each"],
      [3,"14:15","15:05","Security + boarding","other","","","Free"],
      [3,"15:05","17:00","Flight to London Gatwick","flight","easyJet or BA · lands 17:00 UK time","","£390 for 3","2h55"],
    ],
    acts:[
      {id:"lemons", name:"Lemon grove + limoncello tasting", dur:90, pp:8.7, note:"About €15 (£13) each adult, children free · lemonade for the little one", def:[0,"16:00"]},
      {id:"capri", name:"Capri by ferry", dur:380, pp:1.5, tr:116, note:"Fast ferry about €23 (£20) each adult each way, children 3–12 about half · funicular €2.40 each way · Gardens of Augustus €2.50", def:[1,"09:00"], segs:[["Ferry to Capri", 25, "boat", "£52"], ["Funicular, Piazzetta + Gardens of Augustus", 180, "act", "£4.50"], ["", 60, "gap", ""], ["Beach at Marina Grande", 90, "act", "Free"], ["Ferry back", 25, "boat", "£52"]]},
      {id:"pompeii", name:"Pompeii", dur:240, pp:10.4, tr:12, note:"€18 (£15.60) each adult, under-18s free · Circumvesuviana train about €3 each way · rough paths: bring a sturdy buggy or a carrier", def:[2,"09:00"], segs:[["Train to Pompei Scavi", 30, "shuttle", "£6"], ["Pompeii", 180, "act", "£31"], ["Train back", 30, "shuttle", "£6"]]},
      {id:"beach", name:"Beach club afternoon", dur:180, pp:11.6, note:"Sunbeds and an umbrella at a lido on Marina Grande, about €40 (£35) for the day", def:[2,"15:00"]},
      {id:"positano", name:"Positano by boat", dur:420, pp:0, tr:120, note:"Ferry about €20 (£17) each adult each way, children half · steep steps everywhere", def:null},
      {id:"passeggiata", name:"Evening passeggiata", dur:60, pp:0, note:"Corso Italia and Piazza Tasso · free", def:null},
    ],
    flag:"<b>Check:</b> Capri ferry fares change by company and time of day, about €21.50–24.50 an adult each way in 2026. Book both transfers with a child seat."
  },
];

// Show the midpoint of any money range, e.g. "£10–14" → "£12"
const midP = str => !str ? str : str.replace(/(£|€|US\$)(\d[\d,]*(?:\.\d+)?)–(\d[\d,]*(?:\.\d+)?)/g, (m, cur, a, b) => {
  const x = (parseFloat(a.replace(/,/g,"")) + parseFloat(b.replace(/,/g,""))) / 2;
  const v = (x < 10 && x % 1) ? x.toFixed(2) : Math.round(x).toLocaleString("en-GB");
  return cur + v;
});
const HAS_MONEY = /£|€|US\$/;
const LOCAL_EACH = /(€|US\$)([\d,.]+) each/g;
const twice = n => { const v = n * PAX; return v % 1 ? v.toFixed(2) : String(v); };
PLACES.forEach(p => {
  (p.meals || []).forEach(([id, name, day, at, dur, pp, note, opt]) => p.acts.push({ id: "meal_" + id, name, dur, pp, opt, kind: "food", meal: true, def: [day, at],
    note: note.replace(LOCAL_EACH, (m, c, n) => c + twice(parseFloat(n.replace(/,/g, ""))) + " for 3"), price: `£${twice(pp)} for 3` }));
  p.acts.forEach(a => {
    if (a.meal) return;
    const entry = (a.pp || 0) * PAX, tr = a.tr || 0, tot = entry + tr;
    a.price = !tot ? "Free" : (entry && tr ? `£${twice(a.pp)} entry + £${tr} transport = £${twice(a.pp + tr / PAX)} for 3` : `£${twice(tot / PAX)} for 3`);
    (a.segs || []).forEach(g => { g[3] = g[3].replace(/£([\d.]+)( return| sunrise ticket| entry)? each/, (m, n, r) => "£" + twice(parseFloat(n)) + (r || "")).replace(/ per taxi/, ""); });
  });
  p.ev.forEach(e => { if (e[7]) e[7] = midP(e[7]); if (e[5] && HAS_MONEY.test(e[5])) e[5] = midP(e[5]); });
  p.acts.forEach(a => { a.note = midP(a.note || ""); });
});
const TRANSPORT = new Set(["flight","bus","boat","shuttle","walk"]);
const toMin = s => { const [h,m] = s.split(":").map(Number); return h*60+m; };
const toHM = m => String(Math.floor(m/60)).padStart(2,"0") + ":" + String(m%60).padStart(2,"0");
const hourLabel = h => h===0||h===24 ? "12am" : h===12 ? "12pm" : h<12 ? h+"am" : (h-12)+"pm";
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmtDur = m => { const h = Math.floor(m/60), r = m%60; return h ? h + "h" + (r ? String(r).padStart(2,"0") : "") : r + "m"; };
const durOf = e => e[8] || fmtDur(toMin(e[2]) - toMin(e[1]));
const gbp = n => { const v = Math.round(n * 100) / 100; return "£" + v.toLocaleString("en-GB", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
const shortPrice = p => {
  if (!p) return "";
  const eq = p.match(/= £([\d.,]+) for 3/); if (eq) return "£" + eq[1];
  const just = p.match(/^£([\d.,]+) for 3$/); if (just) return "£" + just[1];
  if (/^Free – /.test(p)) return "Free–" + (p.match(/\(£([^)]+)\)/) || ["",""])[1].replace(/^/,"£");
  if (/^Free\b(?! entry| to browse)/.test(p)) return "Free";
  if (/^Incl|^In the|^Your/.test(p)) return /tour/.test(p) ? "in tour" : /combo/.test(p) ? "combo" : /return/.test(p) ? "return tkt" : "incl.";
  const all = [...p.matchAll(/\(£([^)]+)\)/g)].map(m => m[1]);
  const per = (p.match(/per (taxi|car)/) || [""])[0];
  return all.length ? "£" + all.join(" + £") + (per ? " " + per : "") : p;
};

const root = document.getElementById("places");
const store = { get(k, d){ try { const v = JSON.parse(localStorage.getItem(STORE_NS + k)); return v ?? d; } catch(e) { return d; } }, set(k, v){ try { localStorage.setItem(STORE_NS + k, JSON.stringify(v)); } catch(e) {} } };

// Booking status for every flight, transport leg, activity and meal
const ST = [["guess","Guessed"],["research","Researched"],["booked","Booked"],["paid","Booked + paid"]];
const ST_DEF = {};
const SHARED = { "Flight from Heathrow":"flight1", "Flight to London Gatwick":"flight2", "Frecciarossa to Rome":"fr-rome",
  "Frecciarossa to Naples":"fr-naples", "Private transfer to Sorrento":"tr-sorrento" };
let STATUS = store.get("status", {});
const stOf = k => STATUS[k] || ST_DEF[k] || "guess";
const stLabel = k => ST.find(x => x[0] === stOf(k))[1];
const stPill = k => `<button type="button" class="st st-${stOf(k)}" data-st="${esc(k)}" title="Click to change status" aria-label="Status: ${stLabel(k)}. Click to change">${stLabel(k)}</button>`;
const stDot = k => `<span class="sd st-${stOf(k)}" title="${esc(stLabel(k))}" aria-hidden="true"></span>`;
const evStKey = (p, e) => (!e[7] || /^(Free|Included|In the)/i.test(e[7])) ? null : (SHARED[e[3]] || `ev:${p.name}:${e[0]}:${e[3]}`);
function fillStatic(){ document.querySelectorAll("[data-st-slot]").forEach(td => td.innerHTML = stPill(td.dataset.stSlot)); }
document.addEventListener("click", ev => {
  const b = ev.target.closest("[data-st]"); if (!b) return;
  if (ev.target.closest("a") || (ev.target.closest("button") && !ev.target.closest("button[data-st]"))) return;
  if (b.classList.contains("ev") && Date.now() - lastDragAt < 400) return;
  if (b.classList.contains("movable") && lastPointerType !== "mouse") return;
  ev.stopPropagation();
  const k = b.dataset.st, i = ST.findIndex(x => x[0] === stOf(k));
  STATUS[k] = ST[(i + 1) % ST.length][0]; store.set("status", STATUS);
  const y = scrollY; render(); renderSummary(); fillOptionCosts(); fillStatic(); scrollTo(0, y);
  picker.querySelectorAll("[data-st]").forEach(el => { if (el.dataset.st === k) el.outerHTML = stPill(k); });
  document.querySelector(`[data-st="${CSS.escape(k)}"]`)?.focus();
}, true);

let OPT = store.get("firstNight", "A"); if (OPT !== "A" && OPT !== "B") OPT = "A";
const pick = v => (v && typeof v === "object" && !Array.isArray(v)) ? v[OPT] : v;
const inOpt = e => !e[6] || e[6].toUpperCase() === OPT;
const visDays = (p, opt = OPT) => p.days.map((d, i) => i).filter(i => !p.days[i][3] || p.days[i][3] === opt);

// Where each activity sits: PLAN[place][actId] = [day, "HH:MM"] or null
let PLAN = store.get("plan_v2", {});
const slotOf = (p, a) => { const pl = PLAN[p.name]; const v = pl && a.id in pl ? pl[a.id] : a.def; return a.meal && !v ? a.def : v; };
// Meals can't be added or removed, only moved or re-priced. MEALP[place][mealId] = £ for 3
let MEALP = store.get("mealPrices", {});
const mealCost = (p, a) => { const v = MEALP[p.name] && MEALP[p.name][a.id]; return typeof v === "number" && v >= 0 ? v : a.pp * PAX; };
const setSlot = (p, a, v) => { PLAN[p.name] = PLAN[p.name] || {}; PLAN[p.name][a.id] = v; store.set("plan_v2", PLAN); };
const placed = (p, opt = OPT) => p.acts.filter(a => !a.opt || a.opt === opt).map(a => ({ a, s: slotOf(p, a) })).filter(x => x.s && visDays(p, opt).includes(x.s[0]));
const actEvent = (p, a, s) => { const st = toMin(s[1]); const e = [s[0], s[1], toHM(Math.min(st + a.dur, 24*60)), a.name, a.kind || "act", a.note, "", a.meal ? `£${mealCost(p, a)} for 3` : a.price]; e.act = a.id; e.segs = a.segs; e.meal = a.meal; e.stKey = `act:${p.name}:${a.id}`; return e; };
const evList = p => p.ev.filter(inOpt).map(e => { e.stKey = evStKey(p, e); return e; }).concat(placed(p).map(x => actEvent(p, x.a, x.s)))
  .sort((a, b) => a[0] - b[0] || toMin(a[1]) - toMin(b[1]));

let HOTEL = store.get("hotels", {});
const TIERS = [["low","Low","Guesthouses and simple hotels, about 25% less"],["mid","Mid","Boutique and mid-range hotels: our pick"],["high","High","The best in town, about 50% more"]];
const tierOf = p => HOTEL[p.name] || "mid";
function costOf(p, opt = OPT){
  const base = p.cost.A ? p.cost[opt] : p.cost, c = {};
  ["hotel","transport","act","food"].forEach(k => c[k] = base[k].slice());
  const t = tierOf(p), h = base.hotel;
  if (t === "mid" && h[3] != null) c.hotel = [h[3], h[3], h[2]];
  if (t === "low") c.hotel = [h[0], h[0], h[2]];
  if (t === "high") c.hotel = [h[1], h[1], h[2]];
  const add = (k, v) => { c[k][0] += v; c[k][1] += v; };
  placed(p, opt).forEach(({ a }) => { if (a.meal) add("food", mealCost(p, a)); else { add("act", (a.pp || 0) * PAX); add("transport", a.tr || 0); } });
  // fixed food items with a price, e.g. dinner at the airport
  p.ev.filter(e => e[4] === "food" && (!e[6] || e[6].toUpperCase() === opt) && visDays(p, opt).includes(e[0])).forEach(e => { const m = (e[7] || "").match(/\(£([\d.]+)\)/); if (m) add("food", parseFloat(m[1]) * PAX); });
  return c;
}
const mid = r => Math.round((r[0] + r[1]) / 2);
const placeSum = (p, opt = OPT) => { const c = costOf(p, opt); return ["hotel","transport","act","food"].reduce((s, k) => s + mid(c[k]), 0); };

function hotelCell(p, c){
  const v = mid(c.hotel), n = parseInt((c.hotel[2].match(/(\d+) night/) || [0, 1])[1], 10) || 1;
  const t = tierOf(p), desc = TIERS.find(x => x[0] === t)[2];
  const btns = TIERS.map(([id, label, d]) => `<button type="button" data-hotel="${esc(p.name)}" data-tier="${id}" aria-pressed="${t === id}" title="${esc(d)}">${label}</button>`).join("");
  return `<div class="cs cs-hotel"><span class="cs-l">Hotel</span><span class="cs-v mono">${gbp(v)} <span class="per-night">· ${gbp(Math.round(v / n))}/night</span></span>
    <span class="tier" role="group" aria-label="Hotel level">${btns}</span><span>${stPill(`hotel:${p.name}`)}</span></div>`;
}
function costStrip(p){
  const c = costOf(p), n = placed(p).length;
  const cell = (label, r, note) => `<div class="cs"><span class="cs-l">${label}</span><span class="cs-v mono">${gbp(mid(r))}</span>${note ? `<span class="cs-n">${esc(note)}</span>` : ""}</div>`;
  return `<div class="cost-strip" aria-label="Rough cost here for 3 people">
    ${hotelCell(p, c)}
    ${cell("Transport", c.transport, p.name === "Sorrento" ? "Getting here, around, and to the airport home" : "Getting here and getting around")}
    ${cell("Activities", c.act, `${placed(p).filter(x => !x.a.meal).length} planned${""}`)}
    ${cell("Food", c.food, `${placed(p).filter(x => x.a.meal).length} meals, from the calendar`)}
    <div class="cs cs-total"><span class="cs-l">Total for 3</span><span class="cs-v mono">${gbp(placeSum(p))}</span></div>
  </div>`;
}

// No A/B option on this trip
const optionCost = () => 0;
function fillOptionCosts(){
  const a = optionCost("A"), b = optionCost("B"), d = Math.abs(a - b);
  const ea = document.querySelector('[data-cost="A"]'), eb = document.querySelector('[data-cost="B"]');
  if (ea) ea.innerHTML = `<b>£${a}</b> ${a > b ? "£" + d + " more" : a < b ? "£" + d + " less" : ""}`;
  if (eb) eb.innerHTML = `<b>£${b}</b> ${b < a ? "£" + d + " less" : b > a ? "£" + d + " more" : ""}`;
}
const FLIGHTS = 900, EXTRAS = 126, BUDGET = 5000;
// How much is already paid: items marked "Booked + paid"
const priceNum = str => { if (!str) return 0; const m = str.match(/= £([\d.,]+) for 3/) || str.match(/\(£([\d.,]+)\) for 3/) || str.match(/£([\d.,]+)/); return m ? parseFloat(m[1].replace(/,/g, "")) : 0; };
const isPaid = k => stOf(k) === "paid";
function paidOf(p, owner, opt = OPT){
  let t = isPaid(`hotel:${p.name}`) ? mid(costOf(p, opt).hotel) : 0;
  p.ev.filter(e => (!e[6] || e[6].toUpperCase() === opt) && visDays(p, opt).includes(e[0])).forEach(e => {
    const k = evStKey(p, e); if (!k || k === "flight1" || k === "flight2" || owner[k] !== p.name) return;
    if (isPaid(k)) t += priceNum(e[7]);
  });
  placed(p, opt).forEach(({ a }) => { if (isPaid(`act:${p.name}:${a.id}`)) t += a.meal ? mealCost(p, a) : (a.pp || 0) * PAX + (a.tr || 0); });
  return t;
}
function renderSummary(){
  const vis = PLACES.filter(p => !p.only || p.only === OPT);
  const owner = {};
  vis.forEach(p => p.ev.forEach(e => { const k = evStKey(p, e); if (k) owner[k] = p.name; }));
  const rows = vis.map((p, i) => ({ i, name: p.title || p.name, sub: `${costOf(p).hotel[2]} · ${tierOf(p)} hotel · ${placed(p).filter(x => !x.a.meal).length} activities`, v: placeSum(p), pd: paidOf(p, owner) }));
  const total = FLIGHTS + EXTRAS + rows.reduce((a, r) => a + r.v, 0);
  const fPaid = (isPaid("flight1") ? 510 : 0) + (isPaid("flight2") ? 390 : 0);
  const paidTotal = fPaid + rows.reduce((a, r) => a + r.pd, 0);
  document.getElementById("sum-paid").textContent = gbp(paidTotal);
  fillItinerary();
  document.getElementById("sum-total").textContent = gbp(total);
  document.getElementById("sum-pp").textContent = `About ${gbp(Math.round(total / PAX))} each.`;
  const diff = total - BUDGET, bel = document.getElementById("sum-budget");
  bel.className = "budget " + (diff > 0 ? "over" : "under");
  bel.innerHTML = `Budget <b class="mono">${gbp(BUDGET)}</b> · <b class="mono">${gbp(Math.abs(diff))}</b> ${diff > 0 ? "over" : "under"}`;
  document.getElementById("sum-rows").innerHTML =
    `<tr><th>Flights<small>LHR → Florence Sat 22 May · £510</small><small>Naples → LGW Mon 31 May · £390</small></th><td class="mono">${gbp(FLIGHTS)}</td></tr>` +
    rows.map(r => `<tr class="place-row" data-go="p${r.i}"><th><span class="num">${String(r.i + 1).padStart(2, "0")}</span><b>${esc(r.name)}</b><small>${esc(r.sub)}</small></th><td class="mono">${gbp(r.v)}</td></tr>`).join("") +
    `<tr><th>Fees and extras<small><span title="Paid at each hotel, per adult per night: Florence about €7, Rome about €7.50, Sorrento about €3. Children are exempt. About €105 in all." style="text-decoration:underline dotted;cursor:help">City taxes - £91</span></small><small><span title="The EU's travel authorisation, €20 each for adults, free for children. Due to start in late 2026: check whether it is running." style="text-decoration:underline dotted;cursor:help">ETIAS x2 - £35</span></small></th><td class="mono">${gbp(EXTRAS)}</td></tr>` +
    `<tr class="tot"><th>Total for 3</th><td class="mono">${gbp(total)}</td></tr>`;
  document.querySelectorAll("#sum-rows .place-row").forEach(tr => tr.onclick = () => document.getElementById(tr.dataset.go)?.scrollIntoView({ behavior: "smooth" }));
}

// Size each timetable so heading + costs + timetable fit one screen
let OVER = 340; const OVERS = {};
// Each place's calendar is sized so its bottom edge sits inside the screen when that place is snapped to the top
// Phone layout: one day at a time, tap (not drag) to move things, bottom sheets
const MQ = matchMedia("(max-width: 720px)");
let MOBILE = MQ.matches;
const DAYSEL = {};
let lastPointerType = "mouse";
document.addEventListener("pointerdown", e => { lastPointerType = e.pointerType || "mouse"; }, true);
// Phone: each stop (heading, costs, day tabs, one day's calendar) fills one screen (stable small-viewport height, so Safari's toolbar doesn't resize it)
const svhProbe = document.createElement("div"); svhProbe.style.cssText = "position:fixed;top:0;height:100svh;width:0;visibility:hidden;pointer-events:none"; document.body.appendChild(svhProbe);
const hourFor = p => MOBILE ? Math.max(18, Math.min(46, Math.floor(((svhProbe.offsetHeight || window.innerHeight || 700) - (OVERS[p.name] ?? 330)) / (p.to - p.from)))) : Math.max(20, Math.min(64, Math.floor(((window.innerHeight || 900) - (OVERS[p.name] ?? OVER)) / (p.to - p.from))));

// Free time between arrival and departure, awake hours 07:00–22:00
function chillGaps(p, di, evs){
  const w = pick(p.win); if (!w) return [];
  const [s0, s1] = w;
  if (di < s0[0] || di > s1[0]) return [];
  let lo = Math.max(p.from * 60, 7 * 60), hi = Math.min(p.to * 60, 22 * 60);
  if (di === s0[0]) lo = Math.max(lo, toMin(s0[1]));
  if (di === s1[0]) hi = Math.min(hi, toMin(s1[1]));
  const busy = evs.map(e => [toMin(e[1]), toMin(e[2])]).sort((a, b) => a[0] - b[0]);
  const gaps = []; let t = lo;
  for (const [a, b] of busy) { if (a > t) gaps.push([t, Math.min(a, hi)]); t = Math.max(t, b); if (t >= hi) break; }
  if (t < hi) gaps.push([t, hi]);
  return gaps.filter(([a, b]) => b - a >= 45);
}
// Side-by-side lanes for overlapping blocks
function lanes(evs){
  // blocks that sit inside another block's "gap" leg (e.g. lunch during a day trip) take the full width
  const gaps = [];
  evs.forEach(e => { if (!e.segs) return; let t = toMin(e[1]); e.segs.forEach(g => { if (g[2] === "gap") gaps.push([t, t + g[1]]); t += g[1]; }); });
  const inGap = e => !e.segs && gaps.some(([a, b]) => toMin(e[1]) >= a && toMin(e[2]) <= b);
  const sorted = evs.slice().sort((a, b) => toMin(a[1]) - toMin(b[1])); let cl = null;
  sorted.forEach(e => {
    if (inGap(e)) { e._l = 0; e._c = { ends: [0] }; return; }
    const s = toMin(e[1]), en = toMin(e[2]);
    if (!cl || s >= cl.end) cl = { end: en, ends: [] };
    let l = cl.ends.findIndex(x => x <= s); if (l < 0) { l = cl.ends.length; cl.ends.push(en); } else cl.ends[l] = en;
    cl.end = Math.max(cl.end, en); e._l = l; e._c = cl;
  });
}

function block(p, e, hp){
  const s = Math.max(toMin(e[1]), p.from*60), en = Math.min(toMin(e[2]), p.to*60);
  const top = (s - p.from*60) / 60 * hp, h = Math.max((en - s) / 60 * hp - 2, 17);
  const tall = h >= 50, md = h >= 27, tr = TRANSPORT.has(e[4]);
  const showDur = e[4] === "food" && e[8], pr = showDur ? e[8] : shortPrice(e[7]);
  const times = ["bus","boat","shuttle"].includes(e[4]) || (e[4] === "flight" && toMin(e[1]) > p.from * 60);
  const meta = (tr ? (times ? `${e[1]}–${e[2]} · ` : "") + durOf(e) : `${e[1]}–${e[2]}`) + (pr ? " · " + pr : "");
  const tm = `<span class="tm">${esc(md ? meta : (tr ? (times ? `${e[1]}–${e[2]}` : durOf(e)) + (pr ? " · " + pr : "") : (e[4] === "food" ? e[1] + (pr ? " · " + pr : "") : pr)))}</span>`;
  const n = e._c ? e._c.ends.length : 1, l = e._l || 0;
  const cls = `ev k-${e[4]}${e.act ? " movable" : ""}${tall ? " tall" : ""}${tr ? " tr" : ""}${!md ? " short" : ""}`;
  const tip = `${e.stKey ? stLabel(e.stKey) + " · " : ""}${e[3]} · ${e[1]}–${e[2]}${tr ? " · " + durOf(e) : ""}${e[7] ? " · " + e[7] : ""}${e[5] ? " · " + e[5] : ""}${e.act ? " · drag to move" : ""}${e.stKey ? " · click to change status" : ""}`;
  const x = e.act && !e.meal ? `<button type="button" class="ev-x" data-remove="${e.act}" aria-label="Remove ${esc(e[3])}">×</button>` : "";
  if (e.segs) {
    // Activity with travel: one stacked part per leg, each with its own time and price
    const total = e.segs.reduce((t, g) => t + g[1], 0); let t0 = toMin(e[1]);
    const parts = e.segs.map((g, gi) => {
      const sh = g[1] / total * h, a = t0; t0 += g[1];
      const tallSeg = sh >= 44, twoLine = sh >= 26;
      const line = `${TRANSPORT.has(g[2]) ? fmtDur(g[1]) : toHM(a) + "–" + toHM(t0)} · ${g[3]}`;
      if (g[2] === "gap") return `<div class="seg-gap" style="flex:${g[1]} 1 0"></div>`;
      return `<div class="seg k-${g[2]}${twoLine ? "" : " one"}" style="flex:${g[1]} 1 0">
        ${gi === 0 ? x : ""}<b>${esc(g[0])}</b><span class="tm">${esc(line)}</span>${tallSeg && g[2] === "act" && e[5] ? `<small>${esc(e[5])}</small>` : ""}</div>`;
    }).join("");
    const tot = shortPrice(e[7]);
    return `<div class="${cls} has-segs" data-act="${e.act}"${e.stKey ? ` data-st="${esc(e.stKey)}"` : ""} style="top:${top+1}px;height:${h}px;left:calc(${l*100/n}% + 3px);width:calc(${100/n}% - 6px)" title="${esc(tip)}">${parts}${e.stKey ? stDot(e.stKey) : ""}</div>`;
  }
  const link = e[9] ? `<a class="ev-link" href="${esc(e[9])}" target="_blank" rel="noopener">View tour on GetYourGuide ↗</a>` : "";
  const body = x + `<b>${esc(e[3])}</b>${tm}${link}${tall && e[5] ? `<small>${esc(e[5])}</small>` : ""}`;
  return `<div class="${cls}" ${e.act ? `data-act="${e.act}"` : ""}${e.stKey ? ` data-st="${esc(e.stKey)}"` : ""} style="top:${top+1}px;height:${h}px;left:calc(${l*100/n}% + 3px);width:calc(${100/n}% - 6px)" title="${esc(tip)}">${body}${e.stKey ? stDot(e.stKey) : ""}</div>`;
}

const FLAG_SVG = {
  it: '<rect width="20" height="40" fill="#009246"/><rect x="20" width="20" height="40" fill="#FFFFFF"/><rect x="40" width="20" height="40" fill="#CE2B37"/>',
};
const countryOf = p => ["it","Italy"];
const flagFor = p => { const [cc, name] = countryOf(p); return `<svg class="mini-flag" viewBox="0 0 60 40" role="img" aria-label="${name}">${FLAG_SVG[cc]}</svg>`; };
const nightsText = p => {
  const h = costOf(p).hotel[2], n = parseInt((h.match(/(\d+) night/) || [0, 0])[1], 10);
  return `${n} night${n === 1 ? "" : "s"}`;
};

// Illustrated banner for each place (drawn here, no outside images)
const sky = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect x="-300" width="1400" height="220" fill="url(#${id})"/>`;
const palm = (x, top, s = 1, dir = 1, leaf = "#2F6B3A", trunk = "#5B3A24") => {
  const tx = x + 40 * s * dir, ty = top;
  const lv = [[-70,15],[-50,-25],[10,-40],[55,-22],[72,18],[-20,30]].map(([dx, dy]) => { dx *= s; dy *= s;
    return `<path d="M${tx} ${ty} Q${tx + dx/2} ${ty + dy - 22*s} ${tx + dx} ${ty + dy} Q${tx + dx/2} ${ty + dy - 6*s} ${tx} ${ty}Z" fill="${leaf}"/>`; }).join("");
  return `<path d="M${x} 222 Q${x + 4*s*dir} ${ty + 60*s} ${tx} ${ty}" stroke="${trunk}" stroke-width="${7*s}" fill="none" stroke-linecap="round"/>${lv}`;
};
const steps = (cx, baseY, baseW, topW, n, h, fill, edge) => Array.from({ length: n }, (_, i) => {
  const w = baseW - (baseW - topW) * i / (n - 1), y = baseY - (i + 1) * h;
  return `<rect x="${cx - w/2}" y="${y}" width="${w}" height="${h}" fill="${fill}"/><rect x="${cx - w/2}" y="${y}" width="${w}" height="2" fill="${edge}"/>`;
}).join("");
const canopy = (y, cols, seed = 1) => Array.from({ length: 60 }, (_, i) => {
  const x = i * 25 - 310 + ((i * 37 * seed) % 13), r = 22 + ((i * 53 * seed) % 14);
  return `<circle cx="${x}" cy="${y + ((i * 29 * seed) % 12)}" r="${r}" fill="${cols[i % cols.length]}"/>`;
}).join("");
const karst = (x, w, h, base, fill) => `<path d="M${x} ${base} C${x + w*0.05} ${base - h*0.7} ${x + w*0.2} ${base - h} ${x + w*0.45} ${base - h} C${x + w*0.75} ${base - h} ${x + w*0.9} ${base - h*0.6} ${x + w} ${base}Z" fill="${fill}"/>`;
const lantern = (x, y, c) => `<line x1="${x}" y1="${y - 14}" x2="${x}" y2="${y - 9}" stroke="#2A2340" stroke-width="1.5"/><ellipse cx="${x}" cy="${y}" rx="8" ry="10" fill="${c}"/><rect x="${x - 4}" y="${y + 9}" width="8" height="3" fill="#2A2340"/>`;
const pine = (x, base, s = 1) => `<path d="M${x} ${base} Q${x + 4*s} ${base - 40*s} ${x} ${base - 64*s}" stroke="#5B3A24" stroke-width="${5*s}" fill="none"/><ellipse cx="${x}" cy="${base - 70*s}" rx="${50*s}" ry="${15*s}" fill="#3F6B3A"/><ellipse cx="${x + 12*s}" cy="${base - 80*s}" rx="${32*s}" ry="${11*s}" fill="#4F7F48"/>`;
const arches = (x0, x1, y, h, fill) => Array.from({ length: Math.floor((x1 - x0) / 30) }, (_, i) => { const x = x0 + 6 + i * 30; return `<path d="M${x} ${y + h} V${y + 8} Q${x + 9} ${y - 2} ${x + 18} ${y + 8} V${y + h}Z" fill="${fill}"/>`; }).join("");
const SCENES = {
  "Florence": sky("fi-s", "#F6C48E", "#FDEBD3") +
    `<path d="M0 150 Q150 110 300 140 T600 128 T800 140 V220 H0Z" fill="#9BAF7A"/>
    <g fill="#3E5E3A"><path d="M90 150 q4 -42 8 0Z"/><path d="M110 152 q4 -50 8 0Z"/><path d="M690 146 q4 -46 8 0Z"/><path d="M712 148 q4 -38 8 0Z"/></g>
    <rect x="0" y="168" width="800" height="52" fill="#E3D2AE"/>
    <g fill="#C8673E"><path d="M-10 174 L60 158 L130 174Z"/><path d="M100 176 L170 160 L240 176Z"/><path d="M520 174 L600 158 L680 174Z"/><path d="M660 176 L730 162 L810 176Z"/></g>
    <rect x="240" y="70" width="22" height="104" fill="#C9B48C"/><rect x="235" y="62" width="32" height="12" fill="#B79E74"/><rect x="244" y="44" width="14" height="18" fill="#C9B48C"/><path d="M242 44 L251 30 L260 44Z" fill="#8E7A58"/>
    <rect x="326" y="120" width="148" height="56" fill="#EDE3CF"/><path d="M326 120 L400 104 L474 120Z" fill="#EDE3CF"/>
    <rect x="358" y="90" width="84" height="22" fill="#EDE3CF"/>
    <path d="M350 96 Q350 30 400 22 Q450 30 450 96Z" fill="#C8582E"/>
    <path d="M368 96 Q370 46 400 24 M432 96 Q430 46 400 24 M400 24 V96" stroke="#F1E6D2" stroke-width="2.5" fill="none"/>
    <rect x="392" y="8" width="16" height="16" fill="#EDE3CF"/><path d="M392 8 L400 0 L408 8Z" fill="#C8A040"/>
    <g fill="#6E9A78"><rect x="340" y="134" width="6" height="34"/><rect x="454" y="134" width="6" height="34"/><rect x="374" y="134" width="5" height="34"/><rect x="421" y="134" width="5" height="34"/></g>
    <rect x="490" y="56" width="26" height="120" fill="#EDE3CF"/><rect x="490" y="56" width="26" height="4" fill="#6E9A78"/><rect x="490" y="92" width="26" height="3" fill="#D39A93"/><rect x="490" y="128" width="26" height="3" fill="#6E9A78"/>
    <rect x="0" y="200" width="800" height="20" fill="#7FA7B5"/>`,
  "Rome": sky("rm-s", "#F3B27E", "#FDE7CC") +
    `<rect x="600" y="148" width="170" height="44" fill="#CFC6B6"/><path d="M612 150 Q614 92 685 84 Q756 92 758 150Z" fill="#B8AFA0"/><rect x="670" y="66" width="30" height="20" fill="#B8AFA0"/><path d="M676 66 Q685 50 694 66Z" fill="#A69C8C"/><rect x="684" y="40" width="2" height="12" fill="#A69C8C"/>
    <path d="M232 196 V96 Q400 68 568 96 V196Z" fill="#D9BC90"/>
    <path d="M232 96 Q400 68 568 96 V108 Q400 80 232 108Z" fill="#C4A57A"/>` +
    arches(236, 564, 112, 22, "#7A5E40") + arches(236, 564, 142, 22, "#7A5E40") + arches(236, 564, 172, 24, "#7A5E40") +
    `<path d="M520 90 L568 96 L568 130 Q548 120 530 104Z" fill="#F7D8B4"/>
    <rect y="194" width="800" height="26" fill="#B79C74"/>` + pine(110, 200, 1.2) + pine(170, 204, 0.8) + pine(800, 204, 1),
  "Sorrento": sky("so-s", "#8CC8EA", "#F1F8F6") +
    `<path d="M470 130 L560 72 L590 68 L620 84 L650 64 L684 72 L790 130Z" fill="#8B93A8"/><path d="M640 66 q8 -16 22 -20 q-4 12 -12 24Z" fill="#E6E9F0" opacity=".7"/>
    <path d="M0 132 Q40 92 90 104 Q130 70 180 108 Q212 120 250 132Z" fill="#7A9A8C"/>
    <rect y="128" width="800" height="92" fill="#2D88B5"/><rect y="146" width="800" height="2" fill="#B4DDF0" opacity=".6"/><rect y="168" width="800" height="2" fill="#B4DDF0" opacity=".5"/>
    <path d="M300 220 V172 Q340 152 420 156 L560 158 Q620 152 660 170 V220Z" fill="#C9A46C"/>
    <g><rect x="350" y="134" width="30" height="24" fill="#F2D6A2"/><rect x="384" y="128" width="26" height="30" fill="#EFB9A0"/><rect x="414" y="136" width="34" height="22" fill="#F4E6C8"/><rect x="452" y="126" width="24" height="32" fill="#F2D6A2"/><rect x="480" y="134" width="30" height="24" fill="#E9C48E"/><rect x="514" y="130" width="28" height="28" fill="#F4E6C8"/><rect x="546" y="138" width="24" height="20" fill="#EFB9A0"/></g>
    <g fill="#4F6E86"><rect x="358" y="140" width="5" height="7"/><rect x="392" y="136" width="5" height="7"/><rect x="424" y="142" width="5" height="7"/><rect x="460" y="134" width="5" height="7"/><rect x="490" y="140" width="5" height="7"/><rect x="522" y="136" width="5" height="7"/></g>
    <path d="M160 176 L224 176 L216 184 L168 184Z" fill="#FFFFFF"/><path d="M186 176 L190 160 L202 176Z" fill="#E9EEF2"/>
    <circle cx="730" cy="168" r="44" fill="#4F7F48"/><circle cx="770" cy="182" r="30" fill="#3F6B3A"/><rect x="726" y="196" width="8" height="24" fill="#5B3A24"/>
    <g fill="#F6D646"><circle cx="712" cy="160" r="5"/><circle cx="740" cy="150" r="5"/><circle cx="752" cy="174" r="5"/><circle cx="722" cy="182" r="5"/><circle cx="772" cy="176" r="4.5"/></g>`,
};

// Stretch full-width bands so the drawing fills wide screens
const widen = s => s.replace(/<rect y="(\d+)" width="800"/g, '<rect x="-300" y="$1" width="1400"').replace(/M0 (\d+)/g, "M-300 $1 L0 $1").replace(/800 (\d+) V(\d+) H0Z/g, "800 $1 L1100 $1 V$2 H-300Z");

function render(){
  document.querySelectorAll(".opt-card").forEach(b => b.setAttribute("aria-checked", b.dataset.opt === OPT ? "true" : "false"));
  root.innerHTML = PLACES.filter(p => !p.only || p.only === OPT).map((p, i) => {
    const pi = PLACES.indexOf(p), allDays = visDays(p);
    const selDay = allDays.includes(DAYSEL[p.name]) ? DAYSEL[p.name] : allDays[0];
    const dayIdx = MOBILE ? [selDay] : allDays;
    const tabs = MOBILE ? `<div class="day-tabs" role="tablist" aria-label="Days">${allDays.map(di => `<button type="button" role="tab" data-daytab="${di}" aria-selected="${di === selDay}"><b>${esc(p.days[di][0])}</b><span>${esc(p.days[di][1])}</span></button>`).join("")}</div>` : "";
    const hours = p.to - p.from, hp = hourFor(p);
    const head = `<div class="dh"></div>` + dayIdx.map(di => p.days[di]).map(d =>
      `<div class="dh"><b>${esc(d[0])}</b><span>${esc(d[1])}</span>${d[2] ? `<em>${esc(d[2])}</em>` : ""}</div>`).join("");
    let axis = `<div class="axis">`;
    for (let h = p.from; h <= p.to; h++) axis += `<span style="top:${(h-p.from)*hp}px">${h===p.from ? "" : hourLabel(h)}</span>`;
    axis += `</div>`;
    const all = evList(p);
    const cols = dayIdx.map(di => {
      const evs = all.filter(e => e[0] === di);
      lanes(evs);
      const chill = chillGaps(p, di, evs).map(([a, b]) => {
        const top = (a - p.from*60) / 60 * hp, h = (b - a) / 60 * hp - 2;
        return `<button type="button" class="ev chill" data-chill="${di}" data-from="${a}" data-to="${b}" style="top:${top+1}px;height:${h}px;left:3px;width:calc(100% - 6px)" aria-label="Free time ${toHM(a)} to ${toHM(b)}, add an activity">
          <b>Free</b><span class="tm">${toHM(a)}–${toHM(b)}</span><span class="add">+ Add</span></button>`;
      }).join("");
      return `<div class="col" data-day="${di}">${chill}${evs.map(e => block(p, e, hp)).join("")}</div>`;
    }).join("");
    const legs = all.filter(e => TRANSPORT.has(e[4])).map(e => `<tr class="k-${e[4]}">
        <td class="mono">${esc(p.days[e[0]][1])}<br>${e[1]}</td>
        <td><i></i><b>${esc(e[3])}</b>${e[5] ? `<small>${esc(e[5])}</small>` : ""}</td>
        <td class="mono">${esc(durOf(e))}</td>
        <td>${esc(e[7] || "")}</td>
        <td>${e.stKey ? stPill(e.stKey) : ""}</td></tr>`).join("");
    const row = a => {
      const s = slotOf(p, a), on = s && dayIdx.includes(s[0]);
      if (a.meal) {
        const fid = `mp-${pi}-${a.id}`;
        return `<li class="on meal-row">
        <div class="a-main"><b>${esc(a.name)} · ${esc(p.days[s[0]][1].replace(/ \w+$/, ""))} ${s[1]}</b>${a.note ? `<small>${esc(a.note)}</small>` : ""}</div>
        <div class="a-side">${stPill(`act:${p.name}:${a.id}`)}<label class="mp" for="${fid}">£<input id="${fid}" type="number" min="0" step="1" inputmode="numeric" value="${mealCost(p, a)}" data-meal="${a.id}" aria-label="${esc(a.name)} price for 3"></label><span class="a-when">for 3</span></div></li>`;
      }
      const cost = (a.pp || 0) * PAX + (a.tr || 0);
      return `<li class="${on ? "on" : ""}">
        <div class="a-main"><b>${esc(a.name)}${a.meal ? ` · ${esc(p.days[a.def[0]][1].replace(/ \w+$/, ""))}` : ""}</b><small>${fmtDur(a.dur)} · ${esc(a.price)}</small>${a.note ? `<small>${esc(a.note)}</small>` : ""}</div>
        <div class="a-side">${stPill(`act:${p.name}:${a.id}`)}<span class="mono">${cost ? gbp(cost) + " for 3" : "Free"}</span>
          ${on ? `<span class="a-when">${esc(p.days[s[0]][1].replace(/ \w+$/, ""))} ${s[1]}</span><button type="button" class="a-btn rm" data-remove="${a.id}" aria-label="Remove ${esc(a.name)}">Remove</button>`
               : `<button type="button" class="a-btn" data-add="${a.id}" aria-label="Add ${esc(a.name)}">+ Add</button>`}</div></li>`;
    };
    const mine = p.acts.filter(a => !a.opt || a.opt === OPT);
    const mealsOn = placed(p).filter(x => x.a.meal).reduce((t, x) => t + mealCost(p, x.a), 0);
    const acts = mine.filter(a => !a.meal).map(row).join("") +
      `<li class="meals-head"><span>Meals</span><span class="mono">${gbp(mealsOn)} for 3 = Food box</span></li>` +
      mine.filter(a => a.meal).sort((x, y) => x.def[0] - y.def[0] || toMin(x.def[1]) - toMin(y.def[1])).map(row).join("");
    return `<section class="place" id="p${i}" data-pi="${pi}" data-hp="${hp}">
      <div class="place-head"><span class="num">${String(i+1).padStart(2,"0")}</span><h2>${esc(p.title || p.name)}</h2><span class="country place-meta">${flagFor(p)}<span>${esc(nightsText(p))}${p.tz ? ` (${esc(p.tz)})` : ""}</span></span><span class="facts-row"><span class="pill"><b>Arrive</b> ${esc(pick(p.arrive))}</span><span class="pill stay">${esc(pick(p.stay))}</span></span></div>
      ${SCENES[p.name] ? `<div class="scene" aria-hidden="true"><svg viewBox="-300 0 1400 220" preserveAspectRatio="xMidYMid slice">${widen(SCENES[p.name])}</svg></div>` : ""}
      ${costStrip(p)}
      ${tabs}
      <div class="sched-wrap"><div class="sched" style="--cols:${dayIdx.length};--hours:${hours};--hour:${hp}px">${head}${axis}${cols}</div></div>
    </section>`;
  }).join("");
}
function refresh(){ const y = scrollY; closePicker(); render(); renderSummary(); fillOptionCosts(); scrollTo(0, y); }

// First free slot that fits an activity
function firstFree(p, a){
  const all = evList(p);
  // prefer daytime starts (08:00–16:00), then any slot long enough, then the first free slot
  for (const di of visDays(p)) for (const [x, y] of chillGaps(p, di, all.filter(e => e[0] === di))) { const st = Math.max(x, 8 * 60); if (st <= 16 * 60 && y - st >= a.dur) return [di, toHM(st)]; }
  for (const di of visDays(p)) for (const [x, y] of chillGaps(p, di, all.filter(e => e[0] === di))) if (y - x >= a.dur) return [di, toHM(x)];
  for (const di of visDays(p)) for (const [x] of chillGaps(p, di, all.filter(e => e[0] === di))) return [di, toHM(x)];
  return [visDays(p)[0], toHM(Math.max(p.from * 60, 9 * 60))];
}

// Picker for a Free slot
const picker = document.createElement("div");
picker.className = "picker"; picker.hidden = true; picker.setAttribute("role", "dialog"); picker.setAttribute("aria-label", "Add an activity");
document.body.appendChild(picker);
function closePicker(){ picker.hidden = true; }
function openPicker(p, di, start, x, y){
  const items = p.acts.filter(a => !a.meal).map(a => {
    const s = slotOf(p, a), on = s && visDays(p).includes(s[0]);
    const cost = (a.pp || 0) * PAX + (a.tr || 0);
    return `<button type="button" data-place="${PLACES.indexOf(p)}" data-put="${a.id}" data-day="${di}" data-at="${toHM(start)}">
      <b>${esc(a.name)}</b><small>${fmtDur(a.dur)} · ${cost ? gbp(cost) + " for 3" : "Free"}${on ? " · move from " + esc(p.days[s[0]][1].replace(/ \w+$/, "")) + " " + s[1] : ""}</small></button>`;
  }).join("");
  picker.innerHTML = `<div class="pk-head">Add at ${toHM(start)} · ${esc(p.days[di][1])}<button type="button" class="pk-x" aria-label="Close">×</button></div><div class="pk-list">${items}</div>`;
  picker.hidden = false;
  const w = picker.offsetWidth, h = picker.offsetHeight;
  picker.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + "px";
  picker.style.top = Math.max(8, Math.min(y, innerHeight - h - 8)) + "px";
  picker.querySelector("button[data-put]")?.focus();
}
function openMoveSheet(p, a, x, y){
  const s = slotOf(p, a), days = visDays(p), key = `act:${p.name}:${a.id}`, pi = PLACES.indexOf(p);
  const times = []; for (let m = p.from * 60; m <= p.to * 60 - Math.min(a.dur, (p.to - p.from) * 60); m += 15) times.push(toHM(m));
  if (s && !times.includes(s[1])) times.push(s[1]), times.sort();
  picker.innerHTML = `<div class="pk-head">${esc(a.name)}<button type="button" class="pk-x" aria-label="Close">×</button></div>
    <div class="mv">
      <div class="mv-row"><label for="mv-day">Day</label><select id="mv-day">${days.map(di => `<option value="${di}"${s && s[0] === di ? " selected" : ""}>${esc(p.days[di][0])} · ${esc(p.days[di][1])}</option>`).join("")}</select></div>
      <div class="mv-row"><label for="mv-time">Start</label><select id="mv-time">${times.map(t => `<option${s && s[1] === t ? " selected" : ""}>${t}</option>`).join("")}</select></div>
      ${a.meal ? `<div class="mv-row"><label for="mv-price">Price for 3 (£)</label><input id="mv-price" type="number" min="0" step="1" inputmode="numeric" value="${mealCost(p, a)}"></div>` : ""}
      <div class="mv-row"><span>Status</span>${stPill(key)}</div>
      <div class="mv-btns">${a.meal ? "" : `<button type="button" class="a-btn rm" data-mv-remove="${pi}:${a.id}">Remove</button>`}<button type="button" class="a-btn" data-mv-save="${pi}:${a.id}">Save</button></div>
    </div>`;
  picker.hidden = false;
  const w = picker.offsetWidth, h = picker.offsetHeight;
  picker.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + "px";
  picker.style.top = Math.max(8, Math.min(y, innerHeight - h - 8)) + "px";
}
picker.addEventListener("click", ev => {
  if (ev.target.closest(".pk-x")) return closePicker();
  const sv = ev.target.closest("[data-mv-save]");
  if (sv) {
    const [pi, id] = sv.dataset.mvSave.split(":"), p = PLACES[+pi], a = p.acts.find(x => x.id === id);
    const pr = picker.querySelector("#mv-price");
    if (pr) { const v = Math.max(0, Math.round(parseFloat(pr.value) || 0)); MEALP[p.name] = MEALP[p.name] || {}; MEALP[p.name][a.id] = v; store.set("mealPrices", MEALP); }
    setSlot(p, a, [+picker.querySelector("#mv-day").value, picker.querySelector("#mv-time").value]);
    return refresh();
  }
  const rv = ev.target.closest("[data-mv-remove]");
  if (rv) { const [pi, id] = rv.dataset.mvRemove.split(":"), p = PLACES[+pi]; setSlot(p, p.acts.find(x => x.id === id), null); return refresh(); }
  const b = ev.target.closest("[data-put]"); if (!b) return;
  const p = PLACES[+b.dataset.place], a = p.acts.find(x => x.id === b.dataset.put);
  setSlot(p, a, [+b.dataset.day, b.dataset.at]); refresh();
});
addEventListener("keydown", e => { if (e.key === "Escape") closePicker(); });
document.addEventListener("pointerdown", e => { if (!picker.hidden && !picker.contains(e.target) && !e.target.closest(".chill")) closePicker(); });

const placeOf = el => PLACES[+el.closest(".place").dataset.pi];
root.addEventListener("click", ev => {
  const t = ev.target;
  const tab = t.closest("[data-daytab]");
  if (tab) { DAYSEL[placeOf(tab).name] = +tab.dataset.daytab; return refresh(); }
  const mv = t.closest(".ev.movable");
  if (mv && lastPointerType !== "mouse" && !t.closest("button, a")) {
    const p = placeOf(mv), a = p.acts.find(x => x.id === mv.dataset.act);
    if (a) return openMoveSheet(p, a, ev.clientX, ev.clientY);
  }
  const h = t.closest("[data-tier]");
  if (h) { HOTEL[h.dataset.hotel] = h.dataset.tier; store.set("hotels", HOTEL); return refresh(); }
  const rm = t.closest("[data-remove]");
  if (rm) { const p = placeOf(rm); setSlot(p, p.acts.find(a => a.id === rm.dataset.remove), null); return refresh(); }
  const add = t.closest("[data-add]");
  if (add) { const p = placeOf(add), a = p.acts.find(x => x.id === add.dataset.add); setSlot(p, a, firstFree(p, a)); return refresh(); }
  const sg = t.closest("[data-suggest]");
  if (sg) { delete PLAN[PLACES[+sg.dataset.suggest].name]; store.set("plan_v2", PLAN); return refresh(); }
  const cl = t.closest("[data-clear]");
  if (cl) { const p = PLACES[+cl.dataset.clear]; PLAN[p.name] = {}; p.acts.filter(a => !a.meal).forEach(a => PLAN[p.name][a.id] = null); store.set("plan_v2", PLAN); return refresh(); }
  const ch = t.closest(".chill");
  if (ch) {
    const p = placeOf(ch), hp = +ch.closest(".place").dataset.hp, r = ch.getBoundingClientRect();
    const from = +ch.dataset.from, to = +ch.dataset.to;
    let at = from + Math.round(((ev.clientY - r.top) / hp * 60) / 15) * 15;
    at = Math.max(from, Math.min(at, to - 15));
    openPicker(p, +ch.dataset.chill, at, ev.clientX + 8, ev.clientY + 8);
  }
});

root.addEventListener("change", ev => {
  const inp = ev.target.closest("input[data-meal]"); if (!inp) return;
  const p = placeOf(inp), v = Math.max(0, Math.round(parseFloat(inp.value) || 0));
  MEALP[p.name] = MEALP[p.name] || {}; MEALP[p.name][inp.dataset.meal] = v; store.set("mealPrices", MEALP);
  const id = inp.id; refresh(); document.getElementById(id)?.focus();
});
root.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target.matches("input[data-meal]")) ev.target.blur(); });

// Drag an activity to a new time or day (snaps to 15 min)
let drag = null, lastDragAt = 0;
root.addEventListener("pointerdown", ev => {
  if (ev.pointerType && ev.pointerType !== "mouse") return;
  const el = ev.target.closest(".ev.movable"); if (!el || ev.target.closest("button")) return;
  const sec = el.closest(".place"), p = PLACES[+sec.dataset.pi], a = p.acts.find(x => x.id === el.dataset.act);
  drag = { el, p, a, sec, x0: ev.clientX, y0: ev.clientY, moved: false, hp: +sec.dataset.hp, s: slotOf(p, a) };
  el.setPointerCapture(ev.pointerId);
});
root.addEventListener("pointermove", ev => {
  if (!drag) return;
  const dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
  if (!drag.moved && Math.hypot(dx, dy) < 5) return;
  drag.moved = true; drag.el.classList.add("dragging");
  drag.el.style.transform = `translate(${dx}px, ${dy}px)`;
});
const endDrag = ev => {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.moved) return;
  lastDragAt = Date.now();
  const col = [...d.sec.querySelectorAll(".col")].find(c => { const r = c.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right; });
  const day = col ? +col.dataset.day : d.s[0];
  let st = toMin(d.s[1]) + Math.round(((ev.clientY - d.y0) / d.hp * 60) / 15) * 15;
  st = Math.max(d.p.from * 60, Math.min(st, d.p.to * 60 - Math.min(d.a.dur, (d.p.to - d.p.from) * 60)));
  setSlot(d.p, d.a, [day, toHM(st)]); refresh();
};
root.addEventListener("pointerup", endDrag);
root.addEventListener("pointercancel", () => { if (drag) { drag = null; refresh(); } });

const HIGHLIGHTS = [["The Duomo","Florence",235],["Colosseum","Rome",235],["St Peter's","Rome",520],["Capri","Sorrento",-40],["Vesuvius","Sorrento",455]];
const ITIN = [
  ["Sat 22 May", "London → Florence", "Florence"],
  ["Sun 23 May", "Florence", "Florence"],
  ["Mon 24 May", "Pisa day trip", "Florence"],
  ["Tue 25 May", "Florence → Rome", "Rome"],
  ["Wed 26 May", "Rome", "Rome"],
  ["Thu 27 May", "Rome · Vatican", "Rome"],
  ["Fri 28 May", "Rome → Sorrento", "Sorrento"],
  ["Sat 29 May", "Capri", "Sorrento"],
  ["Sun 30 May", "Pompeii + beach", "Sorrento"],
  ["Mon 31 May", "Sorrento → London", "home"],
];
function fillItinerary(){
  const el = document.getElementById("itin"); if (!el) return;
  const vis = PLACES.filter(p => !p.only || p.only === OPT).map(p => p.name);
  el.innerHTML = ITIN.map(([date, what, where], i) => {
    const w = pick(what), to = pick(where), go = to === "home" ? "home-leg" : "p" + vis.indexOf(to);
    const label = esc(w).replace(/ → /g, "<i>→</i>");
    return `<li><button type="button" data-go="${go}" title="${esc(date)}"><span class="dt">${esc(date.replace(/^\w+ /, ""))}</span><b>${label}</b></button></li>`;
  }).join("");
  fitItin();
}
// Every day stays on one line in its half: shrink all the labels together until the longest fits
function fitItin(){
  const el = document.getElementById("itin"); if (!el) return;
  el.style.removeProperty("--itin-fs");
  const bs = [...el.querySelectorAll("b")]; if (!bs.length || !bs[0].clientWidth) return;
  const base = parseFloat(getComputedStyle(bs[0]).fontSize);
  let r = 1; bs.forEach(b => { if (b.scrollWidth > b.clientWidth) r = Math.min(r, b.clientWidth / b.scrollWidth); });
  if (r < 1) el.style.setProperty("--itin-fs", Math.max(9, Math.floor(base * r * 10) / 10) + "px");
}
document.fonts?.ready.then(fitItin);
document.getElementById("itin")?.addEventListener("click", ev => {
  const b = ev.target.closest("[data-go]"); if (b) document.getElementById(b.dataset.go)?.scrollIntoView({ behavior: "smooth" });
});
function fillHighlights(){
  const el = document.getElementById("hl-strip"); if (!el) return;
  el.innerHTML = HIGHLIGHTS.map(([name, place, x]) => `<figure class="hl"><svg viewBox="${x} 0 330 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${widen(SCENES[place])}</svg><figcaption>${esc(name)}</figcaption></figure>`).join("");
}
fillHighlights(); render(); renderSummary(); fillOptionCosts(); fillStatic();
document.querySelectorAll(".opt-card").forEach(b => b.addEventListener("click", () => {
  OPT = b.dataset.opt; store.set("firstNight", OPT);
  render(); fit(); renderSummary(); fillOptionCosts();
}));
function fit(){
  let changed = false;
  root.querySelectorAll(".place").forEach(sec => {
    const p = PLACES[+sec.dataset.pi], wrap = sec.querySelector(".sched-wrap"), dh = sec.querySelector(".dh");
    if (!wrap || !dh) return;
    // space above the hour grid + day header + wrapper borders + snap offset + breathing room below
    const over = Math.ceil(wrap.getBoundingClientRect().top - sec.getBoundingClientRect().top + dh.offsetHeight + 2 + 12 + 24);
    if (Math.abs(over - (OVERS[p.name] ?? -99)) > 2) { OVERS[p.name] = over; changed = true; }
  });
  if (changed) { const y = scrollY; render(); scrollTo(0, y); }
}
fit();
addEventListener("keydown", e => {
  if (e.target.closest && e.target.closest("input, textarea, select, .picker")) return;
  const down = ["ArrowDown","PageDown"].includes(e.key), up = ["ArrowUp","PageUp"].includes(e.key);
  if (!down && !up) return;
  const slides = [...document.querySelectorAll(".slide, .place")];
  const tops = slides.map(el => el.getBoundingClientRect().top);
  let target;
  if (down) target = slides.find((el, i) => tops[i] > 20);
  else { const prev = slides.filter((el, i) => tops[i] < -20); target = prev[prev.length - 1]; }
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
});
// Save choices (removed/moved activities, statuses, hotel levels, meal prices, Option A/B) with the page,
// so they survive on every device. Browser storage stays as a quick local copy.
(function syncChoices(){
  const KEYS = { plan_v2: "plan", status: "status", hotels: "hotels", mealPrices: "mealPrices", firstNight: "firstNight" };
  const localSet = store.set;
  let ref = null, timer = null, writing = Promise.resolve(), lastSeen = "", seeded = false;
  const state = () => ({ plan: PLAN, status: STATUS, hotels: HOTEL, mealPrices: MEALP, firstNight: OPT });
  const hasLocal = () => Object.keys(KEYS).some(k => { try { return localStorage.getItem(STORE_NS + k) != null; } catch (e) { return false; } });
  const save = () => {
    if (!ref) return;
    const body = JSON.parse(JSON.stringify(state()));
    lastSeen = JSON.stringify(body);
    writing = writing.then(() => ref.set(body)).catch(() => {});
  };
  store.set = (k, v) => { localSet(k, v); if (k in KEYS) { clearTimeout(timer); timer = setTimeout(() => { timer = null; save(); }, 500); } };
  const apply = d => {
    const s = JSON.stringify(d); if (s === lastSeen) return; lastSeen = s;
    PLAN = d.plan && typeof d.plan === "object" ? JSON.parse(JSON.stringify(d.plan)) : {};
    STATUS = d.status && typeof d.status === "object" ? { ...d.status } : {};
    HOTEL = d.hotels && typeof d.hotels === "object" ? { ...d.hotels } : {};
    MEALP = d.mealPrices && typeof d.mealPrices === "object" ? JSON.parse(JSON.stringify(d.mealPrices)) : {};
    if (d.firstNight === "A" || d.firstNight === "B") OPT = d.firstNight;
    localSet("plan_v2", PLAN); localSet("status", STATUS); localSet("hotels", HOTEL); localSet("mealPrices", MEALP); localSet("firstNight", OPT);
    if (!drag) { refresh(); fillStatic(); }
  };
  (async () => {
    const db = await window.claude?.use?.("db"); if (!db) return;
    const r = db.doc("trip/choices");
    r.onSnapshot(snap => {
      if (snap.metadata.hasPendingWrites || timer) { ref = r; return; }
      if (!snap.exists) {
        ref = r;
        if (!seeded && !snap.metadata.fromCache) { seeded = true; if (hasLocal()) save(); }
        return;
      }
      ref = r; apply(snap.data() || {});
    }, () => { ref = null; });
  })();
})();

let sw = null;
root.addEventListener("touchstart", e => { const w = e.target.closest(".sched-wrap"); if (!MOBILE || !w || e.touches.length !== 1) { sw = null; return; } sw = { x: e.touches[0].clientX, y: e.touches[0].clientY, p: placeOf(w) }; }, { passive: true });
root.addEventListener("touchend", e => {
  if (!sw) return;
  const t = e.changedTouches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y, p = sw.p; sw = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  const days = visDays(p), cur = days.includes(DAYSEL[p.name]) ? DAYSEL[p.name] : days[0], i = days.indexOf(cur) + (dx < 0 ? 1 : -1);
  if (i < 0 || i >= days.length) return;
  DAYSEL[p.name] = days[i]; refresh();
}, { passive: true });
MQ.addEventListener?.("change", e => { MOBILE = e.matches; closePicker(); render(); fit(); });
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { closePicker(); render(); fit(); fitItin(); }, 120); });
