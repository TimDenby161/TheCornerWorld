// Shown inside the planning page's phone frame: hide the "get one made" button there
try { if (window.top !== window) document.documentElement.classList.add("framed"); } catch (e) { document.documentElement.classList.add("framed"); }

const STORE_NS = "trip:plan/samples/japan:";
const PAX = 1; // travellers: every price on the page is the total for this many people
// Fixed timetable items: [day, start, end, title, kind, note, option-only ("a"/"b"), price, duration override]
// Activities (acts) are optional: add, move or remove them on the calendar. pp = £ per person, tr = £ extra transport for 1.
// def = suggested slot [day, start] or null. Free time inside win (arrive → leave) shows as Free.
const PLACES = [
  { name:"Tokyo", country:"Japan", tz:"8 hours ahead of the UK", arrive:"Sun 16 May, 10:55", stay:"4 nights", from:6, to:23,
    cost:{hotel:[165,330,"4 nights · business hotel",220],transport:[28,28],act:[0,0],food:[0,0]},
    win:[[0,"12:30"],[4,"09:30"]],
    meals:[["l0", "Lunch · ramen", 0, "13:00", 60, 5, "Ticket-machine ramen shop, about ¥1,100 (£5)"], ["d0", "Dinner · izakaya", 0, "18:30", 90, 10, "Small plates and a beer, then an early night"], ["b1", "Breakfast", 1, "08:00", 45, 4, "Konbini or café"], ["l1", "Lunch in Harajuku", 1, "12:00", 60, 6, ""], ["d1", "Dinner · sushi", 1, "20:15", 90, 12, "Conveyor-belt sushi near Shibuya"], ["b2", "Breakfast", 2, "07:45", 40, 4, ""], ["l2", "Lunch", 2, "11:45", 60, 7, ""], ["d2", "Dinner · Omoide Yokocho", 2, "18:45", 90, 11, "Yakitori in the alleys by Shinjuku station"], ["b3", "Breakfast", 3, "07:00", 40, 4, ""], ["l3", "Lunch · yuba in Nikko", 3, "13:00", 60, 6, "Nikko's tofu-skin speciality"], ["d3", "Dinner", 3, "19:00", 90, 10, ""], ["b4", "Breakfast", 4, "07:45", 45, 4, ""]],
    blurb:"Neon, shrines and the May Grand Sumo Tournament, which runs 9–23 May 2027. Day 4 is a day trip to Nikko's gold-leafed shrines in the forest.",
    days:[["Day 1","Sun 16 May"],["Day 2","Mon 17 May"],["Day 3","Tue 18 May"],["Day 4","Wed 19 May"],["Day 5","Thu 20 May"]],
    ev:[
      [0,"06:00","10:55","Flight from Heathrow","flight","Finnair via Helsinki · leaves Sat 07:20 UK time, lands 10:55 Tokyo time","","£720 for 1","19h35"],
      [0,"11:00","11:45","Immigration + bags","other","No visa needed on a UK passport, for up to 90 days","","Free"],
      [0,"11:45","12:30","Keikyu train to the hotel","shuttle","Haneda → Shinagawa or Asakusa · tap in with a Suica card","","¥600 (£3) for 1","45m"],
      [4,"09:30","11:00","Romancecar to Hakone","shuttle","Shinjuku → Hakone-Yumoto · reserved seat","","¥2,470 (£12) for 1","1h30"],
    ],
    acts:[
      {id:"asakusa", name:"Asakusa · Senso-ji", dur:120, pp:0, note:"Tokyo's oldest temple and Nakamise shopping street · free", def:[0,"14:30"]},
      {id:"meiji", name:"Meiji Shrine + Harajuku", dur:150, pp:0, note:"Forest shrine, then Takeshita Street · free", def:[1,"09:00"]},
      {id:"teamlab", name:"teamLab Planets", dur:120, pp:19, note:"Walk-through digital art, barefoot in water · about ¥4,000 (£19) · timed tickets", def:[1,"14:00"]},
      {id:"shibuya", name:"Shibuya Crossing + Shibuya Sky", dur:150, pp:12, note:"Rooftop deck at sunset · ¥2,500 (£12) online · book the sunset slot early", def:[1,"17:30"]},
      {id:"tsukiji", name:"Tsukiji Outer Market + Ginza", dur:150, pp:0, note:"Tamagoyaki and tuna for a second breakfast · closed Sundays and most Wednesdays", def:[2,"08:30"]},
      {id:"sumo", name:"Sumo · May Grand Tournament", dur:270, pp:24, note:"Ryogoku Kokugikan · top division from about 15:45 · chair seat about ¥5,000 (£24) · on sale 10 Apr 2027", def:[2,"13:30"]},
      {id:"goldengai", name:"Golden Gai bars", dur:90, pp:5, note:"Tiny bars, some with a ¥500–1,000 (£2.40–4.80) cover charge", def:[2,"20:30"]},
      {id:"nikko", name:"Nikko day trip", dur:570, pp:9, tr:28, note:"Toshogu shrine ¥1,600 (£7.60), Shinkyo bridge ¥300 (£1.40) · Tobu limited express from Asakusa about ¥2,900 (£14) each way", def:[3,"08:00"], segs:[["Train to Nikko", 120, "shuttle", "£14"], ["Toshogu shrine", 180, "act", "£7.60"], ["", 60, "gap", ""], ["Shinkyo bridge + Kanmangafuchi", 90, "act", "£1.40"], ["Train back", 120, "shuttle", "£14"]]},
      {id:"akihabara", name:"Akihabara", dur:120, pp:0, note:"Electronics, anime and retro games · free", def:null},
      {id:"tower", name:"Tokyo Tower main deck", dur:75, pp:6, note:"¥1,200 (£5.70)", def:null},
    ],
    flag:"<b>Check:</b> the flight times are guesses from the 2026 timetable; a direct flight with BA or JAL costs about £300 more. Sumo tickets go on sale 10 April 2027 and the good seats sell out on the first day."
  },
  { name:"Hakone", country:"Japan", arrive:"Thu 20 May, 11:00", stay:"1 night", from:6, to:23,
    cost:{hotel:[90,180,"1 night · ryokan with dinner",120],transport:[41,41],act:[0,0],food:[0,0]},
    win:[[0,"11:00"],[1,"10:00"]],
    meals:[["l0", "Lunch · soba", 0, "11:30", 60, 7, "Near Hakone-Yumoto station"], ["d0", "Kaiseki dinner at the ryokan", 0, "18:30", 120, 0, "In the room price"], ["b1", "Japanese breakfast at the ryokan", 1, "08:00", 60, 0, "In the room price"]],
    blurb:"Hot springs, a steaming volcanic valley and, on a clear day, Mt Fuji over Lake Ashi. One night in a ryokan: tatami room, onsen bath, dinner in a robe. The Hakone Freepass, ¥6,000 (£29), covers the trains, ropeway and boat.",
    days:[["Day 1","Thu 20 May"],["Day 2","Fri 21 May"]],
    ev:[
      [0,"09:30","11:00","Romancecar to Hakone","shuttle","Shinjuku → Hakone-Yumoto · reserved seat","","¥2,470 (£12) for 1","1h30"],
      [1,"10:00","10:20","Train down to Odawara","shuttle","Hakone Tozan line","","In the Freepass"],
      [1,"10:45","12:50","Shinkansen to Kyoto","shuttle","Hikari from Odawara · reserved seat","","¥11,500 (£55) for 1","2h05"],
    ],
    acts:[
      {id:"loop", name:"Hakone loop", dur:280, pp:0, note:"Cable car, the ropeway over Owakudani's steam vents, a boat across Lake Ashi and the lakeside shrine · all in the Freepass", def:[0,"12:30"], segs:[["Train + cable car up", 60, "shuttle", "Freepass"], ["Owakudani by ropeway", 75, "act", "Freepass"], ["Ropeway down to the lake", 30, "shuttle", "Freepass"], ["Lake Ashi boat", 30, "boat", "Freepass"], ["Hakone Shrine", 45, "act", "Free"], ["Bus back", 40, "shuttle", "Freepass"]]},
      {id:"onsen", name:"Onsen soak", dur:60, pp:0, note:"At the ryokan", def:[0,"17:20"]},
      {id:"openair", name:"Hakone Open-Air Museum", dur:150, pp:9.5, note:"Sculpture park with a foot bath · ¥2,000 (£9.50)", def:null},
      {id:"yunessun", name:"Yunessun spa park", dur:180, pp:12, note:"Hot springs in a swimsuit · about ¥2,500 (£12)", def:null},
    ],
    flag:"<b>Check:</b> the Owakudani ropeway closes when volcanic gas is high, and buses run instead. Fuji hides in cloud on many May days."
  },
  { name:"Kyoto", country:"Japan", arrive:"Fri 21 May, 12:50", stay:"4 nights", from:6, to:23,
    cost:{hotel:[165,330,"4 nights · business hotel",220],transport:[70,70],act:[0,0],food:[0,0]},
    win:[[0,"13:00"],[4,"10:00"]],
    meals:[["l0", "Lunch at the station", 0, "13:00", 60, 6, "Kyoto Station's ramen street"], ["d0", "Dinner in Pontocho", 0, "18:00", 90, 11, "Lantern-lit alley by the river"], ["b1", "Breakfast", 1, "06:00", 30, 3, "Konbini onigiri before Fushimi Inari"], ["l1", "Lunch", 1, "12:30", 60, 6, ""], ["d1", "Dinner", 1, "19:00", 90, 10, ""], ["b2", "Breakfast", 2, "06:45", 40, 4, ""], ["l2", "Lunch · Nishiki Market", 2, "12:30", 60, 6, "Grazing on skewers and pickles"], ["d2", "Dinner · kaiseki set", 2, "19:00", 90, 20, "The treat: a seasonal set menu at lunch-style prices"], ["b3", "Breakfast", 3, "07:45", 40, 4, ""], ["l3", "Lunch in Nara", 3, "12:15", 60, 6, "Kakinoha-zushi, sushi wrapped in persimmon leaves"], ["d3", "Dinner", 3, "19:00", 90, 10, ""], ["b4", "Breakfast", 4, "08:00", 45, 4, ""]],
    blurb:"Two thousand temples, geisha districts and gardens. Start early: the big sights are calm before 08:00 and packed by 10:00. Day 4 is a day trip to Nara's deer and Great Buddha.",
    days:[["Day 1","Fri 21 May"],["Day 2","Sat 22 May"],["Day 3","Sun 23 May"],["Day 4","Mon 24 May"],["Day 5","Tue 25 May"]],
    ev:[
      [0,"10:45","12:50","Shinkansen to Kyoto","shuttle","Hikari from Odawara · reserved seat","","¥11,500 (£55) for 1","2h05"],
      [4,"10:00","11:45","Shinkansen to Hiroshima","shuttle","Nozomi from Kyoto · reserved seat","","¥11,740 (£56) for 1","1h45"],
    ],
    acts:[
      {id:"kiyomizu", name:"Kiyomizu-dera + Higashiyama", dur:180, pp:2.4, note:"¥500 (£2.40) · down through Sannenzaka and Ninenzaka lanes", def:[0,"14:30"]},
      {id:"gion", name:"Gion at dusk", dur:90, pp:0, note:"Hanamikoji and the Shirakawa canal · free", def:[0,"19:30"]},
      {id:"fushimi", name:"Fushimi Inari at dawn", dur:180, pp:0, note:"Thousands of torii up Mt Inari · free, open all night", def:[1,"06:30"]},
      {id:"kinkakuji", name:"Kinkaku-ji, the Golden Pavilion", dur:90, pp:2.4, note:"¥500 (£2.40)", def:[1,"14:00"]},
      {id:"arashiyama", name:"Arashiyama bamboo + Tenryu-ji", dur:240, pp:3.8, tr:2.3, note:"Garden ¥500 + halls ¥300 (£3.80) · JR train ¥240 (£1.15) each way", def:[2,"07:30"], segs:[["Train to Saga-Arashiyama", 20, "shuttle", "£1.15"], ["Bamboo grove + Tenryu-ji", 200, "act", "£3.80"], ["Train back", 20, "shuttle", "£1.15"]]},
      {id:"tea", name:"Tea ceremony", dur:60, pp:19, note:"Small group with a host · about ¥4,000 (£19)", def:[2,"14:30"]},
      {id:"nara", name:"Nara day trip", dur:390, pp:7.2, tr:7.2, note:"Todai-ji's Great Buddha ¥800 (£3.80), Kasuga-taisha ¥700 (£3.30), the deer are free · Kintetsu train ¥760 (£3.60) each way", def:[3,"08:30"], segs:[["Train to Nara", 45, "shuttle", "£3.60"], ["Todai-ji + deer park", 180, "act", "£3.80"], ["", 60, "gap", ""], ["Kasuga-taisha", 60, "act", "£3.30"], ["Train back", 45, "shuttle", "£3.60"]]},
      {id:"philosopher", name:"Philosopher's Path + Ginkaku-ji", dur:150, pp:2.4, note:"¥500 (£2.40)", def:null},
      {id:"nijo", name:"Nijo Castle", dur:90, pp:6.2, note:"¥1,300 (£6.20) · the 'nightingale' floors squeak", def:null},
    ],
    flag:"<b>Check:</b> temple prices are from 2025–26 listings. Book Kyoto hotels early: May is busy."
  },
  { name:"Hiroshima", country:"Japan", arrive:"Tue 25 May, 11:45", stay:"2 nights", from:6, to:23,
    cost:{hotel:[75,150,"2 nights · business hotel",100],transport:[66,66],act:[0,0],food:[0,0]},
    win:[[0,"12:00"],[2,"10:00"]],
    meals:[["l0", "Lunch", 0, "12:00", 60, 6, ""], ["d0", "Dinner · okonomiyaki", 0, "18:30", 75, 9, "Hiroshima-style, layered with noodles, at Okonomimura"], ["b1", "Breakfast", 1, "07:15", 40, 4, ""], ["l1", "Lunch on Miyajima", 1, "12:30", 60, 9, "Grilled oysters or anago-meshi (eel on rice)"], ["d1", "Dinner", 1, "19:00", 90, 10, ""], ["b2", "Breakfast", 2, "08:30", 45, 4, ""]],
    blurb:"A moving afternoon at the Peace Park, then a day on Miyajima: the 'floating' torii, a ropeway up Mt Misen and wild deer.",
    days:[["Day 1","Tue 25 May"],["Day 2","Wed 26 May"],["Day 3","Thu 27 May"]],
    ev:[
      [0,"10:00","11:45","Shinkansen to Hiroshima","shuttle","Nozomi from Kyoto · reserved seat","","¥11,740 (£56) for 1","1h45"],
      [2,"10:00","11:30","Shinkansen to Osaka","shuttle","Nozomi to Shin-Osaka · reserved seat","","¥10,600 (£50) for 1","1h30"],
    ],
    acts:[
      {id:"peace", name:"Peace Memorial Park + Museum", dur:180, pp:1, note:"Museum ¥200 (£1) · the A-Bomb Dome and the Children's Peace Monument", def:[0,"13:00"]},
      {id:"miyajima", name:"Miyajima", dur:435, pp:11.4, tr:6, note:"Visitor tax ¥100, Itsukushima shrine ¥300, Misen ropeway ¥2,000 (£9.50) return · JR train ¥420 + ferry ¥200 (£3) each way", def:[1,"08:00"], segs:[["Train + ferry", 45, "boat", "£3"], ["Itsukushima shrine + floating torii", 75, "act", "£1.90"], ["Mt Misen by ropeway", 150, "act", "£9.50"], ["", 60, "gap", ""], ["Omotesando street", 60, "act", "Free"], ["Ferry + train back", 45, "boat", "£3"]]},
      {id:"shukkeien", name:"Shukkei-en garden", dur:60, pp:1.4, note:"¥300 (£1.40)", def:[1,"16:00"]},
      {id:"castle", name:"Hiroshima Castle", dur:60, pp:1.8, note:"¥370 (£1.80) · rebuilt keep with a museum", def:null},
    ],
    flag:"The torii looks like it floats at high tide: check the tide table for Wed 26 May and move the visit if you need to."
  },
  { name:"Osaka", country:"Japan", arrive:"Thu 27 May, 11:30", stay:"2 nights", from:6, to:23,
    cost:{hotel:[75,150,"2 nights · business hotel",100],transport:[67,67],act:[0,0],food:[0,0]},
    win:[[0,"12:00"],[2,"07:30"]],
    meals:[["l0", "Lunch · Kuromon Market", 0, "12:15", 60, 9, "Wagyu skewers, sea urchin, fruit"], ["d0", "Dinner · Dotonbori street food", 0, "18:30", 120, 11, "Takoyaki, kushikatsu and okonomiyaki under the neon"], ["b1", "Breakfast", 1, "07:45", 40, 4, ""], ["l1", "Lunch in Himeji", 1, "12:00", 60, 6, ""], ["d1", "Dinner", 1, "19:45", 90, 10, ""], ["b2", "Breakfast", 2, "06:45", 40, 4, ""]],
    blurb:"Japan's kitchen: loud, friendly and built around eating. Day 2 is a day trip to Himeji, the finest original castle in the country.",
    days:[["Day 1","Thu 27 May"],["Day 2","Fri 28 May"],["Day 3","Sat 29 May"]],
    ev:[
      [0,"10:00","11:30","Shinkansen to Osaka","shuttle","Nozomi to Shin-Osaka · reserved seat","","¥10,600 (£50) for 1","1h30"],
      [2,"07:30","08:45","Haruka to Kansai airport","shuttle","From Shin-Osaka or Tennoji · ICOCA & Haruka ticket","","¥1,800 (£8.50) for 1","1h15"],
      [2,"08:45","11:00","Check-in + security","other","","","Free"],
      [2,"11:00","11:30","Flight to London","flight","Finnair via Helsinki · lands about 20:05 UK time","","In the same booking as the flight out","17h05"],
    ],
    acts:[
      {id:"castle", name:"Osaka Castle", dur:120, pp:2.9, note:"¥600 (£2.90) · museum in the keep, park around it", def:[0,"14:00"]},
      {id:"himeji", name:"Himeji Castle day trip", dur:390, pp:12.4, tr:14.5, note:"Castle + Koko-en garden ¥2,600 (£12.40) · JR special rapid ¥1,520 (£7.20) each way", def:[1,"08:30"], segs:[["Train to Himeji", 60, "shuttle", "£7.20"], ["Himeji Castle", 150, "act", "£12.40 with the garden"], ["", 60, "gap", ""], ["Koko-en garden", 60, "act", "In the castle ticket"], ["Train back", 60, "shuttle", "£7.20"]]},
      {id:"umeda", name:"Umeda Sky Building at sunset", dur:90, pp:9.5, note:"Open-air deck · ¥2,000 (£9.50)", def:[1,"18:00"]},
      {id:"shinsekai", name:"Shinsekai + Tsutenkaku", dur:120, pp:5.7, note:"Retro neighbourhood · tower ¥1,200 (£5.70)", def:null},
      {id:"usj", name:"Universal Studios Japan", dur:600, pp:45, note:"About ¥9,500 (£45), more for Express passes", def:null},
    ],
    flag:"<b>Check:</b> the flight home is a guess. Book it with the flight out as one open-jaw ticket, and compare Finnair with JAL via Tokyo."
  },
];

// Show the midpoint of any money range, e.g. "£10–14" → "£12"
const midP = str => !str ? str : str.replace(/(£|¥|US\$)(\d[\d,]*(?:\.\d+)?)–(\d[\d,]*(?:\.\d+)?)/g, (m, cur, a, b) => {
  const x = (parseFloat(a.replace(/,/g,"")) + parseFloat(b.replace(/,/g,""))) / 2;
  const v = (x < 10 && x % 1) ? x.toFixed(2) : Math.round(x).toLocaleString("en-GB");
  return cur + v;
});
const HAS_MONEY = /£|¥|US\$/;
const LOCAL_EACH = /(¥|US\$)([\d,.]+) each/g;
const twice = n => { const v = n * PAX; return v % 1 ? v.toFixed(2) : String(v); };
PLACES.forEach(p => {
  (p.meals || []).forEach(([id, name, day, at, dur, pp, note, opt]) => p.acts.push({ id: "meal_" + id, name, dur, pp, opt, kind: "food", meal: true, def: [day, at],
    note: note.replace(LOCAL_EACH, (m, c, n) => c + twice(parseFloat(n.replace(/,/g, ""))) + " for 1"), price: `£${twice(pp)} for 1` }));
  p.acts.forEach(a => {
    if (a.meal) return;
    const entry = (a.pp || 0) * PAX, tr = a.tr || 0, tot = entry + tr;
    a.price = !tot ? "Free" : (entry && tr ? `£${twice(a.pp)} entry + £${tr} transport = £${twice(a.pp + tr / PAX)} for 1` : `£${twice(tot / PAX)} for 1`);
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
  const eq = p.match(/= £([\d.,]+) for 1/); if (eq) return "£" + eq[1];
  const just = p.match(/^£([\d.,]+) for 1$/); if (just) return "£" + just[1];
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
const SHARED = { "Flight from Heathrow":"flight1", "Flight to London":"flight1", "Romancecar to Hakone":"romance",
  "Shinkansen to Kyoto":"sk-kyoto", "Shinkansen to Hiroshima":"sk-hiro", "Shinkansen to Osaka":"sk-osaka", "Haruka to Kansai airport":"haruka" };
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
// Meals can't be added or removed, only moved or re-priced. MEALP[place][mealId] = £ for 1
let MEALP = store.get("mealPrices", {});
const mealCost = (p, a) => { const v = MEALP[p.name] && MEALP[p.name][a.id]; return typeof v === "number" && v >= 0 ? v : a.pp * PAX; };
const setSlot = (p, a, v) => { PLAN[p.name] = PLAN[p.name] || {}; PLAN[p.name][a.id] = v; store.set("plan_v2", PLAN); };
const placed = (p, opt = OPT) => p.acts.filter(a => !a.opt || a.opt === opt).map(a => ({ a, s: slotOf(p, a) })).filter(x => x.s && visDays(p, opt).includes(x.s[0]));
const actEvent = (p, a, s) => { const st = toMin(s[1]); const e = [s[0], s[1], toHM(Math.min(st + a.dur, 24*60)), a.name, a.kind || "act", a.note, "", a.meal ? `£${mealCost(p, a)} for 1` : a.price]; e.act = a.id; e.segs = a.segs; e.meal = a.meal; e.stKey = `act:${p.name}:${a.id}`; return e; };
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
  return `<div class="cost-strip" aria-label="Rough cost here for 1 people">
    ${hotelCell(p, c)}
    ${cell("Transport", c.transport, p.name === "Osaka" ? "Getting here, around, and to the airport home" : "Getting here and getting around")}
    ${cell("Activities", c.act, `${placed(p).filter(x => !x.a.meal).length} planned${p.name === "Hakone" ? " · the Freepass covers the loop" : ""}`)}
    ${cell("Food", c.food, `${placed(p).filter(x => x.a.meal).length} meals, from the calendar`)}
    <div class="cs cs-total"><span class="cs-l">Total for 1</span><span class="cs-v mono">${gbp(placeSum(p))}</span></div>
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
const FLIGHTS = 720, EXTRAS = 12, BUDGET = 2300;
// How much is already paid: items marked "Booked + paid"
const priceNum = str => { if (!str) return 0; const m = str.match(/= £([\d.,]+) for 1/) || str.match(/\(£([\d.,]+)\) for 1/) || str.match(/£([\d.,]+)/); return m ? parseFloat(m[1].replace(/,/g, "")) : 0; };
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
  const fPaid = isPaid("flight1") ? FLIGHTS : 0;
  const paidTotal = fPaid + rows.reduce((a, r) => a + r.pd, 0);
  document.getElementById("sum-paid").textContent = gbp(paidTotal);
  fillItinerary();
  document.getElementById("sum-total").textContent = gbp(total);
  document.getElementById("sum-pp").textContent = ``;
  const diff = total - BUDGET, bel = document.getElementById("sum-budget");
  bel.className = "budget " + (diff > 0 ? "over" : "under");
  bel.innerHTML = `Budget <b class="mono">${gbp(BUDGET)}</b> · <b class="mono">${gbp(Math.abs(diff))}</b> ${diff > 0 ? "over" : "under"}`;
  document.getElementById("sum-rows").innerHTML =
    `<tr><th>Flights<small>Finnair via Helsinki, one booking: in to Tokyo, home from Osaka</small><small>LHR → HND Sat 15 May · KIX → LHR Sat 29 May</small></th><td class="mono">${gbp(FLIGHTS)}</td></tr>` +
    rows.map(r => `<tr class="place-row" data-go="p${r.i}"><th><span class="num">${String(r.i + 1).padStart(2, "0")}</span><b>${esc(r.name)}</b><small>${esc(r.sub)}</small></th><td class="mono">${gbp(r.v)}</td></tr>`).join("") +
    `<tr><th>Fees and extras<small><span title="Data eSIM for Japan, 15 days, about £12" style="text-decoration:underline dotted;cursor:help">eSIM - £12</span></small><small><span title="UK passports: no visa for stays up to 90 days. Japan's departure tax, ¥1,000, is already in the flight price." style="text-decoration:underline dotted;cursor:help">Visa - none needed</span></small></th><td class="mono">${gbp(EXTRAS)}</td></tr>` +
    `<tr class="tot"><th>Total for 1</th><td class="mono">${gbp(total)}</td></tr>`;
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
  jp: '<rect width="60" height="40" fill="#FFFFFF"/><circle cx="30" cy="20" r="12" fill="#BC002D"/>',
};
const countryOf = p => ["jp","Japan"];
const flagFor = p => { const [cc, name] = countryOf(p); return `<svg class="mini-flag" viewBox="0 0 60 40" role="img" aria-label="${name}">${FLAG_SVG[cc]}</svg>`; };
const nightsText = p => {
  const h = costOf(p).hotel[2], n = parseInt((h.match(/(\d+) night/) || [0, 0])[1], 10);
  return `${n} night${n === 1 ? "" : "s"}${/ryokan/.test(h) ? " · in a ryokan" : ""}`;
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
const torii = (x, base, h, c = "#C8312B") => {
  const w = h * 0.9, t = h * 0.075;
  return `<rect x="${x - w*0.36}" y="${base - h*0.86}" width="${t}" height="${h*0.86}" fill="${c}"/><rect x="${x + w*0.36 - t}" y="${base - h*0.86}" width="${t}" height="${h*0.86}" fill="${c}"/>` +
    `<rect x="${x - w*0.46}" y="${base - h*0.7}" width="${w*0.92}" height="${t*0.8}" fill="${c}"/>` +
    `<path d="M${x - w*0.6} ${base - h*0.97} Q${x} ${base - h*0.9} ${x + w*0.6} ${base - h*0.97} L${x + w*0.55} ${base - h*0.86} L${x - w*0.55} ${base - h*0.86}Z" fill="#2A1A14"/>` +
    `<rect x="${x - w*0.5}" y="${base - h*0.86}" width="${w}" height="${t*0.7}" fill="${c}"/>`;
};
const pagoda = (x, base, c = "#9C3B2A") => Array.from({ length: 5 }, (_, i) => {
  const w = 96 - i * 12, y = base - 24 - i * 24;
  return `<rect x="${x - w*0.3}" y="${y}" width="${w*0.6}" height="24" fill="#EADBC0"/><path d="M${x - w/2} ${y + 4} L${x + w/2} ${y + 4} L${x + w*0.34} ${y - 6} L${x - w*0.34} ${y - 6}Z" fill="${c}"/>`;
}).join("") + `<rect x="${x - 1.5}" y="${base - 24*5 - 34}" width="3" height="36" fill="#5B3A24"/>`;
const SCENES = {
  "Tokyo": sky("tk-s", "#F29A76", "#FFE3C6") +
    `<g fill="#C9837A" opacity=".7"><rect x="0" y="118" width="40" height="80"/><rect x="44" y="96" width="30" height="102"/><rect x="78" y="128" width="46" height="70"/><rect x="128" y="104" width="26" height="94"/><rect x="160" y="132" width="40" height="66"/><rect x="520" y="110" width="34" height="88"/><rect x="560" y="126" width="44" height="72"/><rect x="700" y="100" width="30" height="98"/><rect x="734" y="120" width="40" height="78"/><rect x="778" y="108" width="30" height="90"/></g>
    <path d="M640 198 L646 40 L650 16 L654 40 L660 198Z" fill="#8F8AA8"/><rect x="634" y="70" width="32" height="8" rx="4" fill="#8F8AA8"/><rect x="637" y="98" width="26" height="6" rx="3" fill="#8F8AA8"/>
    <path d="M400 16 L370 198 L387 198 L400 122 L413 198 L430 198Z" fill="#E4472B"/>
    <rect x="382" y="98" width="36" height="10" fill="#E4472B"/><rect x="389" y="62" width="22" height="7" fill="#E4472B"/>
    <rect x="378" y="146" width="44" height="5" fill="#FFFFFF"/><rect x="390" y="80" width="20" height="4" fill="#FFFFFF"/>
    <g fill="#4A3F5E"><rect x="210" y="140" width="50" height="58"/><rect x="264" y="122" width="34" height="76"/><rect x="300" y="150" width="40" height="48"/><rect x="450" y="132" width="44" height="66"/><rect x="498" y="150" width="30" height="48"/></g>
    <g fill="#FFD27A" opacity=".85"><rect x="220" y="150" width="6" height="6"/><rect x="236" y="166" width="6" height="6"/><rect x="272" y="134" width="6" height="6"/><rect x="460" y="144" width="6" height="6"/><rect x="476" y="160" width="6" height="6"/><rect x="310" y="160" width="6" height="6"/></g>
    <rect y="196" width="800" height="24" fill="#2F2A40"/>`,
  "Hakone": sky("hk-s", "#9FCBE8", "#EAF4F2") +
    `<path d="M150 170 L360 54 Q400 40 440 54 L650 170Z" fill="#6E86A8"/>
    <path d="M360 54 Q400 40 440 54 L472 72 L454 80 L436 70 L418 82 L400 68 L382 82 L364 70 L346 80 L328 72Z" fill="#FFFFFF"/>
    <path d="M0 172 Q120 118 250 170Z" fill="#3F7A4E"/><path d="M550 170 Q690 108 800 156 V172Z" fill="#3F7A4E"/>
    <rect y="166" width="800" height="54" fill="#4B8DB0"/><rect y="182" width="800" height="2" fill="#B8DCEB" opacity=".6"/><rect y="200" width="800" height="2" fill="#B8DCEB" opacity=".5"/>
    <path d="M0 220 V178 Q60 170 120 188 Q160 202 140 220Z" fill="#2E6040"/>` + torii(660, 200, 60) +
    `<path d="M240 194 L330 194 L320 204 L250 204Z" fill="#8C3A2A"/><rect x="262" y="180" width="44" height="14" fill="#E8D7A6"/><path d="M276 180 V164 M294 180 V160" stroke="#5A3B22" stroke-width="2"/>`,
  "Kyoto": sky("ky-s", "#F7C9A0", "#FFF1DE") +
    `<path d="M0 150 Q200 112 400 140 T800 128 V220 H0Z" fill="#5C8A55"/><path d="M0 182 Q200 170 400 186 T800 178 V220 H0Z" fill="#43703F"/>` +
    pagoda(640, 186) +
    `<path d="M250 220 L310 150 L350 150 L410 220Z" fill="#C9B79A"/>` +
    [7,6,5,4,3,2,1,0].map(i => torii(330, 210 - i * 7, 160 - i * 16)).join(""),
  "Hiroshima": sky("hi-s", "#F4B183", "#FCE6CC") +
    `<path d="M0 150 Q100 72 220 110 Q300 62 420 100 Q520 52 640 104 Q720 82 800 120 V162 H0Z" fill="#4F7A5C"/>
    <path d="M0 162 Q200 142 400 158 T800 152 V172 H0Z" fill="#3D6549"/>
    <rect y="162" width="800" height="58" fill="#5C9DB4"/><rect y="178" width="800" height="2" fill="#CDE6EE" opacity=".6"/><rect y="196" width="800" height="2" fill="#CDE6EE" opacity=".5"/><rect y="212" width="800" height="2" fill="#CDE6EE" opacity=".4"/>` +
    torii(400, 200, 124) + `<rect x="344" y="200" width="112" height="8" fill="#C8312B" opacity=".25"/>`,
  "Osaka": sky("os-s", "#7FB7E0", "#E8F3F6") +
    `<path d="M0 172 Q200 152 400 168 T800 162 V220 H0Z" fill="#5E8C5A"/>
    <path d="M300 192 L322 140 L478 140 L500 192Z" fill="#8F8A80"/><path d="M300 192 L322 140 M340 192 L350 140 M380 192 L384 140 M420 192 L416 140 M460 192 L450 140" stroke="#7D786F" stroke-width="1.5"/>
    <rect x="330" y="112" width="140" height="28" fill="#F4F1E8"/><path d="M314 116 L486 116 L466 98 L334 98Z" fill="#3E8F7E"/>
    <rect x="345" y="78" width="110" height="20" fill="#F4F1E8"/><path d="M330 80 L470 80 L452 62 L348 62Z" fill="#3E8F7E"/>
    <rect x="360" y="46" width="80" height="16" fill="#F4F1E8"/><path d="M346 48 L454 48 L436 30 L364 30Z" fill="#3E8F7E"/>
    <path d="M374 30 L426 30 L412 16 L388 16Z" fill="#3E8F7E"/><circle cx="380" cy="28" r="3" fill="#E1B640"/><circle cx="420" cy="28" r="3" fill="#E1B640"/>
    <g fill="#2E3A44"><rect x="350" y="122" width="8" height="10"/><rect x="372" y="122" width="8" height="10"/><rect x="394" y="122" width="8" height="10"/><rect x="416" y="122" width="8" height="10"/><rect x="438" y="122" width="8" height="10"/><rect x="368" y="84" width="8" height="9"/><rect x="396" y="84" width="8" height="9"/><rect x="424" y="84" width="8" height="9"/></g>
    <g fill="#3F7A4E"><circle cx="120" cy="172" r="30"/><circle cx="172" cy="178" r="22"/><circle cx="632" cy="174" r="28"/><circle cx="684" cy="180" r="20"/></g>
    <rect y="192" width="800" height="28" fill="#4C7F9A"/><rect y="204" width="800" height="2" fill="#BFDDEA" opacity=".5"/>`,
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
        <div class="a-side">${stPill(`act:${p.name}:${a.id}`)}<label class="mp" for="${fid}">£<input id="${fid}" type="number" min="0" step="1" inputmode="numeric" value="${mealCost(p, a)}" data-meal="${a.id}" aria-label="${esc(a.name)} price for 1"></label><span class="a-when">for 1</span></div></li>`;
      }
      const cost = (a.pp || 0) * PAX + (a.tr || 0);
      return `<li class="${on ? "on" : ""}">
        <div class="a-main"><b>${esc(a.name)}${a.meal ? ` · ${esc(p.days[a.def[0]][1].replace(/ \w+$/, ""))}` : ""}</b><small>${fmtDur(a.dur)} · ${esc(a.price)}</small>${a.note ? `<small>${esc(a.note)}</small>` : ""}</div>
        <div class="a-side">${stPill(`act:${p.name}:${a.id}`)}<span class="mono">${cost ? gbp(cost) + " for 1" : "Free"}</span>
          ${on ? `<span class="a-when">${esc(p.days[s[0]][1].replace(/ \w+$/, ""))} ${s[1]}</span><button type="button" class="a-btn rm" data-remove="${a.id}" aria-label="Remove ${esc(a.name)}">Remove</button>`
               : `<button type="button" class="a-btn" data-add="${a.id}" aria-label="Add ${esc(a.name)}">+ Add</button>`}</div></li>`;
    };
    const mine = p.acts.filter(a => !a.opt || a.opt === OPT);
    const mealsOn = placed(p).filter(x => x.a.meal).reduce((t, x) => t + mealCost(p, x.a), 0);
    const acts = mine.filter(a => !a.meal).map(row).join("") +
      `<li class="meals-head"><span>Meals</span><span class="mono">${gbp(mealsOn)} for 1 = Food box</span></li>` +
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
      <b>${esc(a.name)}</b><small>${fmtDur(a.dur)} · ${cost ? gbp(cost) + " for 1" : "Free"}${on ? " · move from " + esc(p.days[s[0]][1].replace(/ \w+$/, "")) + " " + s[1] : ""}</small></button>`;
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
      ${a.meal ? `<div class="mv-row"><label for="mv-price">Price for 1 (£)</label><input id="mv-price" type="number" min="0" step="1" inputmode="numeric" value="${mealCost(p, a)}"></div>` : ""}
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

const HIGHLIGHTS = [["Tokyo Tower","Tokyo",235],["Mt Fuji","Hakone",235],["Fushimi Inari","Kyoto",165],["Miyajima","Hiroshima",235],["Osaka Castle","Osaka",235]];
const ITIN = [
  ["Sat 15 May", "London → Tokyo", "Tokyo"],
  ["Sun 16 May", "Arrive Tokyo", "Tokyo"],
  ["Mon 17 May", "Tokyo", "Tokyo"],
  ["Tue 18 May", "Tokyo · sumo", "Tokyo"],
  ["Wed 19 May", "Nikko day trip", "Tokyo"],
  ["Thu 20 May", "Tokyo → Hakone", "Hakone"],
  ["Fri 21 May", "Hakone → Kyoto", "Kyoto"],
  ["Sat 22 May", "Kyoto", "Kyoto"],
  ["Sun 23 May", "Kyoto", "Kyoto"],
  ["Mon 24 May", "Nara day trip", "Kyoto"],
  ["Tue 25 May", "Kyoto → Hiroshima", "Hiroshima"],
  ["Wed 26 May", "Miyajima", "Hiroshima"],
  ["Thu 27 May", "Hiroshima → Osaka", "Osaka"],
  ["Fri 28 May", "Himeji day trip", "Osaka"],
  ["Sat 29 May", "Osaka → London", "home"],
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
