// Shown inside the planning page's phone frame: hide the "get one made" button there
try { if (window.top !== window) document.documentElement.classList.add("framed"); } catch (e) { document.documentElement.classList.add("framed"); }

const STORE_NS = "trip:plan/samples/vietnam:";
const PAX = 2; // travellers: every price on the page is the total for this many people
// Fixed timetable items: [day, start, end, title, kind, note, option-only ("a"/"b"), price, duration override]
// Activities (acts) are optional: add, move or remove them on the calendar. pp = £ per person, tr = £ extra transport for 2.
// def = suggested slot [day, start] or null. Free time inside win (arrive → leave) shows as Free.
const PLACES = [
  { name:"Hanoi", country:"Vietnam", tz:"7 hours ahead of the UK", arrive:"Thu 4 Mar, 12:50", stay:"2 nights", from:6, to:23,
    cost:{hotel:[83,165,"2 nights",110],transport:[19,19],act:[0,0],food:[0,0]},
    win:[[0,"14:30"],[2,"08:00"]],
    meals:[["d0", "Dinner · bún chả", 0, "19:00", 60, 4, "Hanoi's grilled pork with noodles"], ["b1", "Breakfast · phở", 1, "08:00", 45, 3, "At a street stall"], ["l1", "Lunch", 1, "12:30", 60, 4, "Bánh mì or bún"], ["d1", "Street food tour", 1, "18:00", 180, 22.5, "Small group with a guide · 8–10 tastings and a beer · US$30 (£22.50) each, book ahead"], ["b2", "Breakfast", 2, "07:15", 45, 3, ""]],
    blurb:"A thousand years old and still all motorbikes, lakes and street food. You arrive in the early afternoon, so the first day is gentle.",
    days:[["Day 1","Thu 4 Mar"],["Day 2","Fri 5 Mar"],["Day 3","Sat 6 Mar"]],
    ev:[
      [0,"06:00","12:50","Flight from Heathrow","flight","VN56 · leaves Wed 18:55 UK time, lands 12:50 Hanoi time","","£1,400 for 2","11h55"],
      [0,"13:00","13:45","Immigration + bags","other","No visa needed on a UK passport, for up to 45 days","","Free"],
      [0,"13:45","14:30","Grab to the Old Quarter","walk","About 30 km","","VND 300,000 (£9) for 2","45m"],
      [2,"08:00","10:30","Transfer to Lan Ha Bay","shuttle","Limousine van from your hotel","","Included in cruise","2h30"],
    ],
    acts:[
      {id:"oldquarter", name:"Old Quarter + Hoan Kiem Lake", dur:120, pp:0, note:"Red bridge to Ngoc Son Temple, VND 50,000 (£1.45) each", def:[0,"15:00"]},
      {id:"puppets", name:"Water puppet show", dur:50, pp:2.9, note:"Thang Long theatre · VND 100,000 (£2.90) standard seat · book ahead", def:[0,"17:30"]},
      {id:"literature", name:"Temple of Literature", dur:90, pp:2, note:"Vietnam's first university, from 1070 · about VND 70,000 (£2)", def:[1,"09:00"]},
      {id:"hoalo", name:"Hoa Lo Prison", dur:90, pp:1.5, note:"The 'Hanoi Hilton' · VND 50,000 (£1.45)", def:[1,"14:00"]},
      {id:"mausoleum", name:"Ho Chi Minh Mausoleum", dur:120, pp:0, note:"Free · mornings only · closed Mondays and Fridays, so not on this trip unless you move things", def:null},
      {id:"trainstreet", name:"Train Street coffee", dur:60, pp:2, note:"Police sometimes close the street to visitors", def:null},
    ],
    flag:"<b>Check:</b> Vietnam Airlines' London flights run only on some days. The Wednesday departure (VN56, 18:55) is from the published timetable: confirm it for March 2027 before booking anything else."
  },
  { name:"Lan Ha Bay", country:"Vietnam · on the boat", arrive:"Sat 6 Mar, ~10:30", stay:"1 night on a cruise", from:6, to:23,
    cost:{hotel:[195,390,"1 night on the cruise",255],transport:[0,0],act:[0,0],food:[0,0]},
    win:[[0,"10:30"],[1,"11:30"]],
    meals:[],
    blurb:"Ha Long Bay's quieter neighbour: limestone islands, hidden lagoons and floating villages. Cabin, meals, kayaks and the transfer from Hanoi are in the cruise price (about US$170, £128, each).",
    days:[["Day 1","Sat 6 Mar"],["Day 2","Sun 7 Mar"]],
    ev:[
      [0,"08:00","10:30","Transfer to Lan Ha Bay","shuttle","Limousine van from your Hanoi hotel","","Included in cruise","2h30"],
      [0,"10:30","11:30","Board + welcome drink","other","","","Included in cruise"],
      [0,"12:00","13:30","Lunch on board","food","Seafood set menu","","Included in cruise"],
      [0,"14:30","16:30","Kayaking + swim stop","boat","Through the lagoons · the sea is about 21°C in March","","Included in cruise"],
      [0,"17:00","18:00","Sunset on the sundeck","other","Spring-roll cooking demo","","Included in cruise"],
      [0,"19:00","20:30","Dinner on board","food","","","Included in cruise"],
      [1,"06:15","07:00","Tai chi on deck","other","","","Included in cruise"],
      [1,"07:00","07:45","Light breakfast","food","","","Included in cruise"],
      [1,"08:00","09:30","Cave or fishing village","boat","Usually by bamboo boat","","Included in cruise"],
      [1,"10:00","11:00","Brunch + check out","food","","","Included in cruise"],
      [1,"11:30","14:30","Limousine to Ninh Binh","shuttle","Drops at hotels in Tam Coc","","VND 600,000 (£17) for 2","3h"],
    ],
    acts:[
      {id:"squid", name:"Night squid fishing", dur:60, pp:0, note:"Off the back of the boat", def:[0,"21:00"]},
      {id:"massage", name:"Massage on board", dur:60, pp:15, note:"About US$20 (£15) each", def:null},
      {id:"drinks", name:"Drinks on the sundeck", dur:90, pp:6, note:"Drinks aren't in the cruise price", def:null},
    ],
    flag:"<b>Check:</b> every boat's timings differ. Pick a cruise that sells the drop-off in Ninh Binh (most do); otherwise book the limousine separately."
  },
  { name:"Ninh Binh", country:"Vietnam", arrive:"Sun 7 Mar, 14:30", stay:"2 nights + night train", from:6, to:23,
    cost:{hotel:[60,120,"2 nights + night train",80],transport:[27,27],act:[0,0],food:[0,0]},
    win:[[0,"14:30"],[2,"21:15"]],
    meals:[["d0", "Dinner", 0, "19:00", 90, 5, "Try goat (dê), the local dish"], ["b1", "Breakfast", 1, "07:00", 45, 3, ""], ["l1", "Lunch", 1, "12:00", 60, 4, ""], ["d1", "Dinner", 1, "19:00", 90, 5, ""], ["b2", "Breakfast", 2, "07:30", 45, 3, ""], ["l2", "Lunch", 2, "12:30", 60, 4, ""], ["d2", "Dinner before the train", 2, "19:00", 90, 5, ""]],
    blurb:"Ha Long Bay on land: limestone peaks rising out of rice fields, rowed through by boat and best seen by bike. Stay in Tam Coc.",
    days:[["Day 1","Sun 7 Mar"],["Day 2","Mon 8 Mar"],["Day 3","Tue 9 Mar"]],
    ev:[
      [0,"11:30","14:30","Limousine to Ninh Binh","shuttle","From the cruise harbour to Tam Coc","","VND 600,000 (£17) for 2","3h"],
      [2,"21:15","21:35","Taxi to Ninh Binh station","walk","","","VND 150,000 (£4) for 2","20m"],
      [2,"21:35","23:00","Night train to Hue","shuttle","SE3 · private sleeper cabin · arrives about 08:00","","US$140 (£105) for 2","10h25"],
    ],
    acts:[
      {id:"hangmua", name:"Hang Mua viewpoint", kind:"hike", dur:120, pp:2.9, note:"About 500 steps to the dragon on the peak · VND 100,000 (£2.90)", def:[0,"16:00"]},
      {id:"trangan", name:"Trang An boat trip", dur:180, pp:8.7, note:"Rowed through caves and past temples · VND 300,000 (£8.70)", def:[1,"08:00"]},
      {id:"bike", name:"Cycle the Tam Coc rice fields", dur:150, pp:1.75, note:"Bikes from most hotels, about VND 60,000 (£1.75) · flat lanes to Bich Dong pagoda", def:[1,"14:00"]},
      {id:"hoalu", name:"Hoa Lu ancient capital", dur:120, pp:1, tr:6, note:"Temples of the 10th-century kings · 15 min by taxi", def:[2,"09:00"]},
      {id:"bichdong", name:"Bich Dong pagoda", dur:90, pp:0, note:"Three pagodas built into the rock", def:null},
      {id:"bailong", name:"Bai Dinh pagoda", dur:180, pp:0, tr:12, note:"Vast temple complex · free, small charge for the buggy", def:null},
    ],
    flag:"<b>Check:</b> SE3 times are from 2026 timetables (leaves about 21:35, arrives about 08:00). Book a private-cabin carriage about a month ahead, and ask your hotel to keep your bags after check-out on Tuesday."
  },
  { name:"Hue", country:"Vietnam", arrive:"Wed 10 Mar, ~08:00", stay:"2 nights", from:6, to:23,
    cost:{hotel:[68,135,"2 nights",90],transport:[114,114],act:[0,0],food:[0,0]},
    win:[[0,"08:30"],[2,"09:00"]],
    meals:[["b0", "Breakfast", 0, "08:45", 45, 3, "Bánh bèo, little steamed rice cakes"], ["l0", "Lunch · bún bò Huế", 0, "13:15", 60, 4, "The city's spicy beef noodle soup"], ["d0", "Dinner", 0, "19:00", 90, 6, "Try a royal-style set menu"], ["b1", "Breakfast", 1, "07:30", 45, 3, ""], ["l1", "Lunch", 1, "13:45", 60, 4, ""], ["d1", "Dinner", 1, "19:00", 90, 5, ""], ["b2", "Breakfast", 2, "08:00", 45, 3, ""]],
    blurb:"Vietnam's imperial capital on the Perfume River: the emperors' walled palace in town, their tombs in the hills.",
    days:[["Day 1","Wed 10 Mar"],["Day 2","Thu 11 Mar"],["Day 3","Fri 12 Mar"]],
    ev:[
      [0,"06:00","08:00","Night train to Hue","shuttle","From Ninh Binh · private sleeper cabin","","US$140 (£105) for 2","10h25"],
      [0,"08:00","08:30","Taxi to the hotel","walk","Drop your bags: rooms are usually ready at 14:00","","VND 100,000 (£3) for 2","30m"],
      [2,"09:00","13:30","Hai Van Pass by private car","shuttle","Stops at Lap An lagoon, Lang Co, the pass and Marble Mountains","","VND 1,500,000 (£43) for 2","4h30"],
    ],
    acts:[
      {id:"citadel", name:"Imperial City", dur:210, pp:5.8, note:"The Nguyen emperors' palace · VND 200,000 (£5.80) · open 07:00–17:00", def:[0,"09:30"]},
      {id:"tombs", name:"Royal tombs by car", dur:300, pp:12.2, tr:26, note:"Khai Dinh, Tu Duc and Minh Mang · combo ticket VND 420,000 (£12.20) each · half-day car VND 900,000 (£26)", def:[1,"08:30"], segs:[["Car to the tombs", 30, "bus", "£26 per car"], ["Three royal tombs", 240, "act", "£12.20 each"], ["Car back", 30, "bus", "in car hire"]]},
      {id:"thienmu", name:"Thien Mu Pagoda", dur:120, pp:0, tr:6, note:"Seven-storey pagoda over the river · Grab there and back", def:[1,"15:30"]},
      {id:"bike", name:"Countryside bike tour", dur:180, pp:15, note:"Thanh Toan covered bridge and rice paddies", def:null},
      {id:"dmz", name:"DMZ day tour", dur:720, pp:40, note:"Vinh Moc tunnels and the war sites · a full day, instead of the tombs", def:null},
    ]
  },
  { name:"Hoi An", country:"Vietnam", arrive:"Fri 12 Mar, 13:30", stay:"3 nights", from:5, to:23,
    cost:{hotel:[113,225,"3 nights",150],transport:[51,51],act:[0,0],food:[0,0]},
    win:[[0,"13:30"],[3,"09:30"]],
    meals:[["l0", "Lunch · cao lầu", 0, "13:45", 60, 4, "Hoi An's own noodles"], ["d0", "Dinner", 0, "19:00", 90, 6, ""], ["b1", "Breakfast", 1, "07:30", 45, 3, "Bánh mì Phượng"], ["l1", "Lunch · what you cooked", 1, "13:30", 30, 0, "Included in the class"], ["d1", "Dinner", 1, "19:00", 90, 6, ""], ["b2", "Early breakfast", 2, "05:00", 30, 2, "Bánh mì to take with you"], ["l2", "Lunch", 2, "12:30", 60, 5, ""], ["d2", "Last dinner in Hoi An", 2, "19:30", 90, 8, "Somewhere by the river"], ["b3", "Breakfast", 3, "08:00", 45, 3, ""]],
    blurb:"A lantern-lit trading port with tailors and the best food in the country, rice paddies all round and a beach 15 minutes away by bike.",
    days:[["Day 1","Fri 12 Mar"],["Day 2","Sat 13 Mar"],["Day 3","Sun 14 Mar"],["Day 4","Mon 15 Mar"]],
    ev:[
      [0,"09:00","13:30","Hai Van Pass by private car","shuttle","From Hue, with stops on the way","","VND 1,500,000 (£43) for 2","4h30"],
      [3,"09:30","10:15","Grab to Da Nang airport","walk","","","VND 350,000 (£10) for 2","45m"],
      [3,"11:30","12:55","Flight to Ho Chi Minh City","flight","Vietnam Airlines or VietJet · many flights a day","","VND 3,000,000 (£87) for 2","1h25"],
    ],
    acts:[
      {id:"oldtown", name:"Ancient town + Japanese Bridge", dur:150, pp:3.5, note:"VND 120,000 (£3.50) ticket gets you into 5 old houses, temples or museums", def:[0,"15:00"]},
      {id:"lanterns", name:"Lantern boat on the river", dur:45, pp:0, tr:5, note:"About VND 175,000 (£5) a boat · price not confirmed, agree it first", def:[0,"18:00"]},
      {id:"cooking", name:"Cooking class + market + basket boat", dur:300, pp:28.5, note:"US$38 (£28.50) each · hotel pickup · you eat what you cook", def:[1,"08:30"]},
      {id:"traque", name:"Bike to Tra Que herb village", dur:150, pp:0, note:"Flat ride through the paddies", def:[1,"15:00"]},
      {id:"myson", name:"My Son sanctuary at opening", dur:300, pp:4.35, tr:26, note:"Cham temple ruins in the jungle · VND 150,000 (£4.35) · go early, before the heat and the crowds", def:[2,"05:30"], segs:[["Car there", 60, "bus", "£26 per car"], ["My Son", 180, "act", "£4.35 each"], ["Car back", 60, "bus", "in car hire"]]},
      {id:"anbang", name:"An Bang beach", dur:210, pp:0, tr:4, note:"Sun loungers free if you buy a drink · 15 min by bike, or Grab", def:[2,"14:00"]},
      {id:"tailor", name:"Tailor fitting", dur:60, pp:0, note:"Order on day 1 and collect on day 3", def:null},
    ]
  },
  { name:"Ho Chi Minh City", country:"Vietnam", arrive:"Mon 15 Mar, 12:55", stay:"3 nights", from:5, to:23,
    cost:{hotel:[135,270,"3 nights",180],transport:[119,119],act:[0,0],food:[0,0]},
    win:[[0,"14:00"],[3,"06:30"]],
    meals:[["d0", "Dinner · Ben Thanh street food", 0, "19:00", 90, 6, ""], ["b1", "Breakfast", 1, "06:15", 30, 2, "Quick, before the tour pickup"], ["l1", "Lunch on the tour", 1, "13:00", 60, 0, "Included in the tour"], ["d1", "Dinner", 1, "19:45", 75, 6, ""], ["b2", "Breakfast", 2, "08:00", 45, 3, ""], ["l2", "Lunch · cơm tấm", 2, "12:00", 60, 4, "Broken rice with grilled pork"], ["d2", "Last dinner", 2, "19:30", 90, 12, "Somewhere special"], ["b3", "Breakfast", 3, "05:45", 30, 2, "Before the airport"]],
    blurb:"Saigon: scooters, rooftop bars and the history of the war, with the tunnels and the Mekong Delta a day trip away.",
    days:[["Day 1","Mon 15 Mar"],["Day 2","Tue 16 Mar"],["Day 3","Wed 17 Mar"],["Day 4","Thu 18 Mar"]],
    ev:[
      [0,"11:30","12:55","Flight to Ho Chi Minh City","flight","From Da Nang","","VND 3,000,000 (£87) for 2","1h25"],
      [0,"13:00","14:00","Grab to District 1","walk","","","VND 200,000 (£6) for 2","45m"],
      [3,"06:30","07:15","Grab to the airport","walk","Be there 3 hours before","","VND 200,000 (£6) for 2","45m"],
      [3,"07:15","09:35","Check-in + security","other","","","Free"],
      [3,"09:35","23:00","VN51 to London Heathrow","flight","Direct · lands 16:55 UK time","","In the same booking","14h20"],
    ],
    acts:[
      {id:"walk", name:"Ben Thanh market + District 1", dur:150, pp:0, note:"The market, the old Post Office and the Opera House", def:[0,"15:30"]},
      {id:"cuchi", name:"Cu Chi tunnels + Mekong Delta", dur:720, pp:37, note:"Small-group day tour, about US$49 (£37) each with lunch", def:[1,"07:00"], segs:[["Bus to Cu Chi", 90, "bus", "in tour"], ["Cu Chi tunnels", 150, "act", "£37 each"], ["Drive to the Mekong", 120, "bus", "in tour"], ["", 60, "gap", ""], ["Boats, coconut workshop + orchards", 180, "boat", "in tour"], ["Back to the city", 120, "bus", "in tour"]]},
      {id:"warmuseum", name:"War Remnants Museum", dur:120, pp:1.75, note:"VND 60,000 (£1.75) from Oct 2026 · open daily 07:30–17:30 · harrowing", def:[2,"09:00"]},
      {id:"palace", name:"Independence Palace", dur:90, pp:1.9, note:"Where the war ended in 1975 · about VND 65,000 (£1.90)", def:[2,"14:00"]},
      {id:"rooftop", name:"Rooftop drinks at sunset", dur:90, pp:8, note:"The skyline from a sky bar", def:[2,"17:30"]},
      {id:"cholon", name:"Cholon temples", dur:150, pp:0, tr:6, note:"Chinatown's pagodas and Binh Tay market", def:null},
    ],
    flag:"<b>Check:</b> VN51 leaves at 09:35 on Thursdays in the 2026–27 timetable. If the time or day changes, so does your last day."
  },
];

// Show the midpoint of any money range, e.g. "VND 250,000–350,000" → "VND 300,000"
const midP = str => !str ? str : str.replace(/(£|US\$|VND )(\d[\d,]*(?:\.\d+)?)–(\d[\d,]*(?:\.\d+)?)/g, (m, cur, a, b) => {
  const x = (parseFloat(a.replace(/,/g,"")) + parseFloat(b.replace(/,/g,""))) / 2;
  const v = (x < 10 && x % 1) ? x.toFixed(2) : Math.round(x).toLocaleString("en-GB");
  return cur + v;
});
const HAS_MONEY = /£|US\$|VND/;
const LOCAL_EACH = /(VND |US\$)([\d,.]+) each/g;
const twice = n => { const v = n * PAX; return v % 1 ? v.toFixed(2) : String(v); };
PLACES.forEach(p => {
  (p.meals || []).forEach(([id, name, day, at, dur, pp, note, opt]) => p.acts.push({ id: "meal_" + id, name, dur, pp, opt, kind: "food", meal: true, def: [day, at],
    note: note.replace(LOCAL_EACH, (m, c, n) => c + twice(parseFloat(n.replace(/,/g, ""))) + " for 2"), price: `£${twice(pp)} for 2` }));
  p.acts.forEach(a => {
    if (a.meal) return;
    const entry = (a.pp || 0) * PAX, tr = a.tr || 0, tot = entry + tr;
    a.price = !tot ? "Free" : (entry && tr ? `£${twice(a.pp)} entry + £${tr} transport = £${twice(a.pp + tr / PAX)} for 2` : `£${twice(tot / PAX)} for 2`);
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
  const eq = p.match(/= £([\d.,]+) for 2/); if (eq) return "£" + eq[1];
  const just = p.match(/^£([\d.,]+) for 2$/); if (just) return "£" + just[1];
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
const SHARED = { "Flight from Heathrow":"flight1", "VN51 to London Heathrow":"flight1", "Limousine to Ninh Binh":"limo",
  "Night train to Hue":"train", "Hai Van Pass by private car":"haivan", "Flight to Ho Chi Minh City":"dad-sgn" };
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
// Meals can't be added or removed, only moved or re-priced. MEALP[place][mealId] = £ for 2
let MEALP = store.get("mealPrices", {});
const mealCost = (p, a) => { const v = MEALP[p.name] && MEALP[p.name][a.id]; return typeof v === "number" && v >= 0 ? v : a.pp * PAX; };
const setSlot = (p, a, v) => { PLAN[p.name] = PLAN[p.name] || {}; PLAN[p.name][a.id] = v; store.set("plan_v2", PLAN); };
const placed = (p, opt = OPT) => p.acts.filter(a => !a.opt || a.opt === opt).map(a => ({ a, s: slotOf(p, a) })).filter(x => x.s && visDays(p, opt).includes(x.s[0]));
const actEvent = (p, a, s) => { const st = toMin(s[1]); const e = [s[0], s[1], toHM(Math.min(st + a.dur, 24*60)), a.name, a.kind || "act", a.note, "", a.meal ? `£${mealCost(p, a)} for 2` : a.price]; e.act = a.id; e.segs = a.segs; e.meal = a.meal; e.stKey = `act:${p.name}:${a.id}`; return e; };
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
  return `<div class="cost-strip" aria-label="Rough cost here for 2 people">
    ${hotelCell(p, c)}
    ${cell("Transport", c.transport, p.name === "Ho Chi Minh City" ? "Getting here, around, and to the airport home" : "Getting here and getting around")}
    ${cell("Activities", c.act, `${placed(p).filter(x => !x.a.meal).length} planned${p.name === "Lan Ha Bay" ? " · cruise covers the rest" : ""}`)}
    ${cell("Food", c.food, `${placed(p).filter(x => x.a.meal).length} meals, from the calendar`)}
    <div class="cs cs-total"><span class="cs-l">Total for 2</span><span class="cs-v mono">${gbp(placeSum(p))}</span></div>
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
const FLIGHTS = 1400, EXTRAS = 16, BUDGET = 4000;
// How much is already paid: items marked "Booked + paid"
const priceNum = str => { if (!str) return 0; const m = str.match(/= £([\d.,]+) for 2/) || str.match(/\(£([\d.,]+)\) for 2/) || str.match(/£([\d.,]+)/); return m ? parseFloat(m[1].replace(/,/g, "")) : 0; };
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
  document.getElementById("sum-pp").textContent = `About ${gbp(Math.round(total / PAX))} each.`;
  const diff = total - BUDGET, bel = document.getElementById("sum-budget");
  bel.className = "budget " + (diff > 0 ? "over" : "under");
  bel.innerHTML = `Budget <b class="mono">${gbp(BUDGET)}</b> · <b class="mono">${gbp(Math.abs(diff))}</b> ${diff > 0 ? "over" : "under"}`;
  document.getElementById("sum-rows").innerHTML =
    `<tr><th>Flights<small>Vietnam Airlines, direct, one booking</small><small>LHR → HAN Wed 3 Mar · SGN → LHR Thu 18 Mar · about £700 each</small></th><td class="mono">${gbp(FLIGHTS)}</td></tr>` +
    rows.map(r => `<tr class="place-row" data-go="p${r.i}"><th><span class="num">${String(r.i + 1).padStart(2, "0")}</span><b>${esc(r.name)}</b><small>${esc(r.sub)}</small></th><td class="mono">${gbp(r.v)}</td></tr>`).join("") +
    `<tr><th>Fees and extras<small><span title="Data eSIM for Vietnam, 15 days, about £8 each" style="text-decoration:underline dotted;cursor:help">eSIMs x2 - £16</span></small><small><span title="UK passports: no visa for stays up to 45 days (GOV.UK). The passport must be valid for 6 months after arrival." style="text-decoration:underline dotted;cursor:help">Visa - none needed</span></small></th><td class="mono">${gbp(EXTRAS)}</td></tr>` +
    `<tr class="tot"><th>Total for 2</th><td class="mono">${gbp(total)}</td></tr>`;
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
  vn: '<rect width="60" height="40" fill="#DA251D"/><polygon points="30,9 32.6,17 41,17 34.2,22 36.8,30 30,25 23.2,30 25.8,22 19,17 27.4,17" fill="#FFFF00"/>',
};
const countryOf = p => ["vn","Vietnam"];
const flagFor = p => { const [cc, name] = countryOf(p); return `<svg class="mini-flag" viewBox="0 0 60 40" role="img" aria-label="${name}">${FLAG_SVG[cc]}</svg>`; };
const nightsText = p => {
  const h = costOf(p).hotel[2], n = parseInt((h.match(/(\d+) night/) || [0, 0])[1], 10) + (/train/.test(h) ? 1 : 0);
  return `${n} night${n === 1 ? "" : "s"}${/train/.test(h) ? " · 1 on the train" : /cruise/.test(h) ? " · on the boat" : ""}`;
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
const SCENES = {
  "Hanoi": sky("hn-s", "#F4A97F", "#FCE3C4") +
    `<g fill="#D58E70" opacity=".75"><rect x="0" y="92" width="34" height="62"/><rect x="38" y="78" width="26" height="76"/><rect x="68" y="98" width="30" height="56"/><rect x="102" y="84" width="22" height="70"/><rect x="128" y="104" width="36" height="50"/><rect x="600" y="88" width="28" height="66"/><rect x="632" y="100" width="34" height="54"/><rect x="700" y="80" width="24" height="74"/><rect x="728" y="96" width="32" height="58"/><rect x="764" y="86" width="36" height="68"/></g>
    <rect y="150" width="800" height="70" fill="#5F8F86"/><rect y="168" width="800" height="2" fill="#A9CFC5" opacity=".6"/><rect y="186" width="800" height="2" fill="#A9CFC5" opacity=".5"/>
    <path d="M170 150 Q160 140 190 138 L260 140 L260 156 L170 156Z" fill="#3F6B4B"/>
    <path d="M250 152 Q400 96 550 152" stroke="#C8312B" stroke-width="8" fill="none"/>` +
    [290,340,400,460,510].map(x => `<rect x="${x - 2}" y="${x < 400 ? 124 + (400 - x) * 0.12 : 124 + (x - 400) * 0.12}" width="4" height="30" fill="#A7261F"/>`).join("") +
    `<path d="M550 152 Q570 146 600 150 L600 158 L550 158Z" fill="#3F6B4B"/>
    <ellipse cx="660" cy="172" rx="34" ry="7" fill="#3F6B4B"/><rect x="646" y="134" width="28" height="38" fill="#E2CFA5"/><rect x="650" y="118" width="20" height="16" fill="#D5C095"/><path d="M640 134 h40 l-6 -6 h-28z M646 118 h28 l-5 -6 h-18z" fill="#8A4E33"/><rect x="655" y="146" width="10" height="14" fill="#6B5A40"/>`,
  "Lan Ha Bay": sky("lh-s", "#B5D8E6", "#EEF6F1") +
    karst(-20, 150, 110, 172, "#8DB4A2") + karst(560, 200, 120, 172, "#8DB4A2") + karst(300, 120, 90, 172, "#A7C6B6") +
    karst(60, 120, 130, 176, "#4F7F66") + karst(620, 140, 100, 176, "#4F7F66") + karst(180, 70, 80, 176, "#5E8E73") +
    `<rect y="170" width="800" height="50" fill="#3D9A96"/><rect y="182" width="800" height="2" fill="#9ED8D2" opacity=".6"/><rect y="200" width="800" height="2" fill="#9ED8D2" opacity=".5"/>
    <path d="M370 186 L480 186 L466 202 L384 202Z" fill="#6B3E26"/><rect x="384" y="180" width="80" height="7" fill="#8C5A3A"/>
    <path d="M396 182 L402 120 L434 128 L428 182Z" fill="#B5542F"/><path d="M436 182 L442 134 L468 140 L462 182Z" fill="#C8693B"/>
    <path d="M402 120 v62 M442 134 v48" stroke="#4A2A18" stroke-width="2"/>
    <path d="M540 198 l26 0 l-4 5 l-18 0z" fill="#E6A33C"/><path d="M552 198 l0 -12" stroke="#2A2340" stroke-width="1.5"/>`,
  "Ninh Binh": sky("nb-s", "#D8E8D2", "#F7F1D8") +
    karst(-30, 160, 120, 160, "#7EA58A") + karst(150, 110, 140, 160, "#5F8C6C") + karst(520, 150, 150, 160, "#5F8C6C") + karst(660, 170, 110, 160, "#7EA58A") + karst(330, 90, 90, 160, "#86AD8F") +
    [["#A9CF79",156],["#8CBB5D",170],["#B3D484",182],["#7FAE52",196],["#9CC56B",208]].map(([c, y]) => `<path d="M0 ${y} Q200 ${y - 5} 400 ${y} T800 ${y} V220 H0Z" fill="${c}"/>`).join("") +
    `<path d="M0 184 Q200 174 400 186 T800 182 V196 Q600 194 400 200 T0 198Z" fill="#6FA7B4"/>
    <path d="M320 191 L384 191 L376 198 L328 198Z" fill="#5A3B22"/><path d="M344 191 L352 180 L360 191Z" fill="#EADBA8"/><rect x="350" y="185" width="4" height="7" fill="#3A5E8C"/>
    <path d="M360 188 L392 172" stroke="#5A3B22" stroke-width="2"/>`,
  "Hue": sky("hu-s", "#F1C489", "#FBEBD0") +
    `<rect x="118" y="56" width="4" height="134" fill="#6B4A33"/><rect x="122" y="58" width="32" height="21" fill="#DA251D"/>
    <rect x="200" y="146" width="400" height="44" fill="#9B4A2E"/><rect x="200" y="144" width="400" height="4" fill="#C9785A"/>
    <path d="M300 190 V170 Q320 154 340 170 V190Z M380 190 V166 Q400 146 420 166 V190Z M460 190 V170 Q480 154 500 170 V190Z" fill="#3A1F15"/>
    <rect x="290" y="116" width="220" height="30" fill="#E3B94F"/>
    <path d="M270 118 L530 118 L506 98 L294 98Z" fill="#C2552F"/><rect x="320" y="84" width="160" height="16" fill="#E3B94F"/><path d="M304 86 L496 86 L478 70 L322 70Z" fill="#D06A3A"/>
    <path d="M270 118 l-8 -6 M530 118 l8 -6 M304 86 l-8 -6 M496 86 l8 -6" stroke="#C2552F" stroke-width="3"/>
    <rect y="190" width="800" height="30" fill="#5E9AA8"/><rect y="200" width="800" height="2" fill="#B5DCE4" opacity=".6"/>
    <path d="M620 202 L700 202 L692 210 L628 210Z" fill="#B23A2A"/><path d="M640 202 v-10 h40 v10" fill="#E3B94F"/><path d="M612 200 q8 -8 16 2" stroke="#B23A2A" stroke-width="3" fill="none"/>`,
  "Hoi An": sky("ha-s", "#3A3A6E", "#E88E5C") +
    `<circle cx="660" cy="70" r="22" fill="#FFE9B8" opacity=".9"/>
    <rect x="110" y="112" width="140" height="74" fill="#E9B949"/><path d="M100 114 L260 114 L242 92 L118 92Z" fill="#8E3B2A"/><rect x="130" y="134" width="22" height="30" fill="#5B3A24"/><rect x="170" y="128" width="30" height="20" fill="#7E5A2C"/><rect x="214" y="134" width="22" height="30" fill="#5B3A24"/>
    <rect x="260" y="104" width="150" height="82" fill="#F2C75A"/><path d="M250 106 L420 106 L400 84 L270 84Z" fill="#9A4330"/><rect x="284" y="128" width="26" height="34" fill="#5B3A24"/><rect x="324" y="122" width="34" height="22" fill="#7E5A2C"/><rect x="370" y="128" width="26" height="34" fill="#5B3A24"/>
    <rect x="420" y="116" width="130" height="70" fill="#E3AE3E"/><path d="M410 118 L560 118 L542 98 L428 98Z" fill="#8E3B2A"/><rect x="440" y="138" width="22" height="28" fill="#5B3A24"/><rect x="500" y="138" width="22" height="28" fill="#5B3A24"/>
    <path d="M100 100 Q330 124 560 100" stroke="#2A2340" stroke-width="1.2" fill="none"/>` +
    [[130,"#E8433A"],[175,"#F2A33A"],[220,"#E8433A"],[265,"#F06EA0"],[310,"#F2A33A"],[355,"#E8433A"],[400,"#F2C94C"],[445,"#F06EA0"],[490,"#E8433A"],[535,"#F2A33A"]].map(([x, c]) => lantern(x, 120 - Math.round(Math.sin((x - 100) / 460 * Math.PI) * -10), c)).join("") +
    `<rect y="186" width="800" height="34" fill="#232D5A"/>` +
    [[180,"#E8433A"],[300,"#F2A33A"],[440,"#F06EA0"],[620,"#F2C94C"],[700,"#E8433A"]].map(([x, c]) => `<ellipse cx="${x}" cy="${200 + (x % 3) * 4}" rx="4" ry="2.5" fill="${c}"/><ellipse cx="${x}" cy="${200 + (x % 3) * 4}" rx="9" ry="4" fill="${c}" opacity=".25"/>`).join("") +
    `<path d="M600 196 L680 196 L670 206 L610 206Z" fill="#5A3B22"/><path d="M630 196 q10 -14 20 0" fill="#8E3B2A"/>`,
  "Ho Chi Minh City": sky("sg-s", "#EE8A5E", "#FFD8A8") +
    `<circle cx="250" cy="120" r="42" fill="#FFE6B6"/>
    <g fill="#5B4A78" opacity=".55"><rect x="20" y="120" width="40" height="70"/><rect x="66" y="100" width="30" height="90"/><rect x="100" y="132" width="44" height="58"/><rect x="330" y="110" width="36" height="80"/><rect x="372" y="128" width="40" height="62"/><rect x="720" y="112" width="34" height="78"/><rect x="760" y="130" width="40" height="60"/></g>
    <g fill="#3D3356"><rect x="420" y="104" width="40" height="86"/><rect x="466" y="122" width="34" height="68"/>
    <path d="M530 190 L530 74 Q538 44 556 36 L566 36 L566 190Z"/><rect x="518" y="100" width="34" height="7" rx="3.5"/>
    <rect x="590" y="116" width="44" height="74"/><path d="M660 190 V44 L672 18 L684 44 V190Z"/><rect x="694" y="132" width="24" height="58"/></g>
    <rect y="188" width="800" height="32" fill="#4C4876"/><rect y="198" width="800" height="2" fill="#F7B98B" opacity=".5"/><rect y="208" width="800" height="2" fill="#F7B98B" opacity=".35"/>
    <path d="M90 204 l60 0 l-8 8 l-44 0z" fill="#2A2340"/>`,
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
        <div class="a-side">${stPill(`act:${p.name}:${a.id}`)}<label class="mp" for="${fid}">£<input id="${fid}" type="number" min="0" step="1" inputmode="numeric" value="${mealCost(p, a)}" data-meal="${a.id}" aria-label="${esc(a.name)} price for 2"></label><span class="a-when">for 2</span></div></li>`;
      }
      const cost = (a.pp || 0) * PAX + (a.tr || 0);
      return `<li class="${on ? "on" : ""}">
        <div class="a-main"><b>${esc(a.name)}${a.meal ? ` · ${esc(p.days[a.def[0]][1].replace(/ \w+$/, ""))}` : ""}</b><small>${fmtDur(a.dur)} · ${esc(a.price)}</small>${a.note ? `<small>${esc(a.note)}</small>` : ""}</div>
        <div class="a-side">${stPill(`act:${p.name}:${a.id}`)}<span class="mono">${cost ? gbp(cost) + " for 2" : "Free"}</span>
          ${on ? `<span class="a-when">${esc(p.days[s[0]][1].replace(/ \w+$/, ""))} ${s[1]}</span><button type="button" class="a-btn rm" data-remove="${a.id}" aria-label="Remove ${esc(a.name)}">Remove</button>`
               : `<button type="button" class="a-btn" data-add="${a.id}" aria-label="Add ${esc(a.name)}">+ Add</button>`}</div></li>`;
    };
    const mine = p.acts.filter(a => !a.opt || a.opt === OPT);
    const mealsOn = placed(p).filter(x => x.a.meal).reduce((t, x) => t + mealCost(p, x.a), 0);
    const acts = mine.filter(a => !a.meal).map(row).join("") +
      `<li class="meals-head"><span>Meals</span><span class="mono">${gbp(mealsOn)} for 2 = Food box</span></li>` +
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
      <b>${esc(a.name)}</b><small>${fmtDur(a.dur)} · ${cost ? gbp(cost) + " for 2" : "Free"}${on ? " · move from " + esc(p.days[s[0]][1].replace(/ \w+$/, "")) + " " + s[1] : ""}</small></button>`;
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
      ${a.meal ? `<div class="mv-row"><label for="mv-price">Price for 2 (£)</label><input id="mv-price" type="number" min="0" step="1" inputmode="numeric" value="${mealCost(p, a)}"></div>` : ""}
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

const HIGHLIGHTS = [["Street food","Hanoi",280],["Lan Ha Bay","Lan Ha Bay",250],["Trang An","Ninh Binh",190],["Imperial City","Hue",235],["Hoi An lanterns","Hoi An",150]];
const ITIN = [
  ["Wed 3 Mar", "London → Hanoi", "Hanoi"],
  ["Thu 4 Mar", "Arrive Hanoi", "Hanoi"],
  ["Fri 5 Mar", "Hanoi", "Hanoi"],
  ["Sat 6 Mar", "Hanoi → Lan Ha Bay", "Lan Ha Bay"],
  ["Sun 7 Mar", "Lan Ha → Ninh Binh", "Ninh Binh"],
  ["Mon 8 Mar", "Ninh Binh", "Ninh Binh"],
  ["Tue 9 Mar", "Night train to Hue", "Ninh Binh"],
  ["Wed 10 Mar", "Arrive Hue", "Hue"],
  ["Thu 11 Mar", "Hue", "Hue"],
  ["Fri 12 Mar", "Hue → Hoi An", "Hoi An"],
  ["Sat 13 Mar", "Hoi An", "Hoi An"],
  ["Sun 14 Mar", "Hoi An", "Hoi An"],
  ["Mon 15 Mar", "Hoi An → Saigon", "Ho Chi Minh City"],
  ["Tue 16 Mar", "Cu Chi + Mekong", "Ho Chi Minh City"],
  ["Wed 17 Mar", "Saigon", "Ho Chi Minh City"],
  ["Thu 18 Mar", "Saigon → London", "home"],
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
