// Shown inside the planning page's phone frame: hide the "get one made" button there
try { if (window.top !== window) document.documentElement.classList.add("framed"); } catch (e) { document.documentElement.classList.add("framed"); }

const STORE_NS = "trip:plan/samples/central-america:";
// Fixed timetable items: [day, start, end, title, kind, note, option-only ("a"/"b"), price, duration override]
// Activities (acts) are optional: add, move or remove them on the calendar. pp = £ per person, tr = £ extra transport for 2.
// def = suggested slot [day, start] or null. Free time inside win (arrive → leave) shows as Free.
const PLACES = [
  { name:"Cancún", only:"A", country:"Mexico · Option A", arrive:"Sat 27 Feb, 16:55", stay:"1 evening", from:6, to:22,
    cost:{hotel:[27,54,"1 night",36],transport:[15,15],act:[0,0],food:[0,0]},
    win:[[0,"18:45"],[1,"09:00"]],
    meals:[["d0", "Dinner · Parque de las Palapas", 0, "19:00", 90, 10, "Street food, 10 min walk"], ["b1", "Breakfast", 1, "07:45", 45, 5, ""]],
    blurb:"Your first night with Option A.",
    days:[["Day 1","Sat 27 Feb"],["Day 2","Sun 28 Feb"]],
    ev:[
      [0,"06:00","16:55","Flight from Gatwick","flight","Leaves 10:55 UK time, lands 16:55","","£190 for 2 + 33,000 Avios","11h"],
      [0,"17:00","18:00","Immigration + bags","other","Have your digital FMM form ready","","Free"],
      [0,"18:15","18:45","ADO bus to downtown","bus","Airport → ADO Centro","","£15 for 2"],
      [1,"09:00","10:45","ADO bus to Valladolid","bus","","","£27 for 2","2h45"],
    ],
    acts:[
      {id:"mercado28", name:"Mercado 28", dur:60, pp:0, tr:6, price:"Free to browse + taxi MXN 75 (£3) each way per taxi", note:"Market stalls and cheap eats", def:null, segs:[["Taxi there", 10, "bus", "£3 per taxi"], ["Mercado 28", 40, "act", "Free"], ["Taxi back", 10, "bus", "£3 per taxi"]]},
    ]
  },
  { name:"Valladolid", country:"Mexico", tz:"1 hour behind Cancún", arrive:{A:"Sun 28 Feb, 10:45",B:"Sat 27 Feb, 20:55"}, stay:{A:"2 days",B:"2.5 days"}, from:6, to:21,
    cost:{A:{hotel:[60,120,"2 nights",80],transport:[27,27],act:[0,0],food:[0,0]},B:{hotel:[90,180,"3 nights",120],transport:[36,36],act:[0,0],food:[0,0]}},
    win:{A:[[1,"11:00"],[3,"10:30"]],B:[[0,"21:00"],[3,"10:30"]]},
    meals:[["b1", "Breakfast", 1, "08:00", 45, 5, "", "B"], ["l1", "Lunch", 1, "11:30", 60, 5, "Try cochinita pibil"], ["d1", "Dinner", 1, "19:30", 90, 5, ""], ["b2", "Breakfast", 2, "06:30", 45, 5, "Early, before Chichén"], ["l2", "Lunch", 2, "12:15", 60, 5, ""], ["d2", "Dinner", 2, "19:00", 90, 5, ""], ["b3", "Breakfast", 3, "08:00", 45, 5, ""], ["l3", "Lunch to take on the bus", 3, "09:45", 30, 5, "Tortas from the market for the ride"]],
    blurb:"Colonial town between two great Maya sites.",
    days:[["Arrive","Sat 27 Feb","","B"],["Day 1","Sun 28 Feb"],["Day 2","Mon 1 Mar"],["Day 3","Tue 2 Mar"]],
    ev:[
      [0,"06:00","16:55","Flight from Gatwick","flight","10:55 UK time – 16:55 Cancún time","","£190 for 2 + 33,000 Avios","11h"],
      [0,"17:00","19:15","Free time at the airport","food","","","£20 for 2","2h 15"],
      [0,"19:30","20:55","ADO bus direct from the airport","bus","Backups at 20:30 and 21:30","","MXN 900 (£36) for 2","2h25"],
      [1,"09:00","10:45","Bus from Cancún","bus","","a","£27 for 2","2h45"],
      [3,"10:30","16:10","ADO bus to Bacalar","bus","On 12Go","","£56 for 2","4h40"],
    ],
    acts:[
      {id:"chichen", name:"Chichén Itzá", dur:300, pp:31, tr:20, note:"Opens 08:00", def:[2,"07:15"], segs:[["Bus there",45,"bus","£10"],["Chichén Itzá",210,"act","£62"],["Bus back",45,"bus","£10"]]},
      {id:"ekbalam", name:"Ek Balam", dur:210, pp:28, tr:24, price:"MXN 691 (£28) + taxi MXN 300 (£12) each way per taxi", note:"Climb the Acropolis · last entry 16:00, cash only", def:[1,"14:00"], segs:[["Taxi there", 30, "bus", "£12 per taxi"], ["Ek Balam", 150, "act", "£28 each"], ["Taxi back", 30, "bus", "£12 per taxi"]]},
      {id:"suytun", name:"Cenote Suytun", dur:150, pp:11, tr:10, price:"MXN 275 (£11) + taxi MXN 125 (£5) each way per taxi", note:"Cave cenote with the stone walkway", def:null, segs:[["Taxi there", 15, "bus", "£5 per taxi"], ["Cenote Suytun", 120, "act", "£11 each"], ["Taxi back", 15, "bus", "£5 per taxi"]]},
      {id:"zaci", name:"Cenote Zací", dur:75, pp:4, price:"MXN 100 (£4)", note:"Open-air cenote in town · 5 min walk", def:[2,"15:00"]},
      {id:"frailes", name:"Calzada de los Frailes", dur:90, pp:0, price:"Free", note:"Pretty street to the San Bernardino convent", def:[1,"18:00"]},
    ],
    flagOpt:"B", flag:"Rome2Rio lists direct buses from Cancún airport to Valladolid at <b>19:30 (ADO, about £36 for 2)</b>, 20:30 and 21:30 (about £24 for 2), in Cancún time. Book the 19:30 on ado.com.mx once it goes on sale, about 30 days before."
  },
  { name:"Bacalar", country:"Mexico", tz:"back on Cancún time", arrive:"Tue 2 Mar, 16:10", stay:"~16 hours", from:7, to:22,
    cost:{hotel:[60,120,"1 night",80],transport:[56,56],act:[0,0],food:[0,0]},
    win:[[0,"16:30"],[1,"08:00"]],
    meals:[["d0", "Dinner", 0, "19:00", 90, 5, ""], ["b1", "Breakfast", 1, "07:00", 45, 9, ""]],
    blurb:"The Lagoon of Seven Colours.",
    days:[["Day 1","Tue 2 Mar"],["Day 2","Wed 3 Mar"]],
    ev:[
      [0,"10:30","16:10","ADO bus from Valladolid","bus","On 12Go","","£56 for 2","4h40"],
      [1,"08:00","08:55","Colectivo + taxi to pier","bus","45 min colectivo to Chetumal, then 10 min taxi","","MXN 150 (£6) colectivos + MXN 80 (£3) taxi = £9 for 2","55m"],
      [1,"09:00","10:00","Mexican exit at the pier","other","Otherwise MXN 1,966 (£78) exit tax for 2","","Free with airline receipt"],
      [1,"10:00","12:15","Ferry to Caye Caulker","boat","Water Jets International · Mon, Wed, Fri, Sat","","£130 for 2","3h15"],
    ],
    acts:[
      {id:"fort", name:"Sunset · Fuerte de San Felipe", dur:75, pp:4, price:"MXN 100 (£4)", note:"18th-century fort over the lagoon · 5 min walk", def:[0,"17:30"]},
      {id:"lagoon", name:"Lagoon boat tour", dur:180, pp:20, price:"MXN 500 (£20)", note:"Isla de los Pájaros, Cenote Negro, Pirates' Channel", def:null},
      {id:"rapidos", name:"Los Rápidos", dur:150, pp:5, tr:20, price:"MXN 125 (£5) + taxi MXN 250 (£10) each way per taxi", note:"Float down the natural current", def:null, segs:[["Taxi there", 30, "bus", "£10 per taxi"], ["Los Rápidos", 90, "act", "£5 each"], ["Taxi back", 30, "bus", "£10 per taxi"]]},
      {id:"kayak", name:"Kayak or paddleboard", dur:60, pp:10, price:"MXN 250 (£10) an hour", note:"From the lagoon docks", def:null},
    ],
    flag:"<b>Check:</b> the 10:30 looks like the only direct bus each day. Backup: bus to Tulum, then one of the frequent buses to Bacalar. <b>Keep your airline receipt</b> as proof you paid the Mexican exit tax (DNR), or you may be charged MXN 1,966 (£78) for 2."
  },
  { name:"Caye Caulker", country:"Belize", tz:"1 hour behind Bacalar", arrive:"Wed 3 Mar, 12:15", stay:"~2 days", from:6, to:22,
    cost:{hotel:[146,291,"2 nights",194],transport:[139,139],act:[0,0],food:[0,0]},
    win:[[0,"12:15"],[2,"10:30"]],
    meals:[["l0", "Lunch", 0, "13:00", 60, 9, ""], ["d0", "Seafood dinner", 0, "19:00", 90, 9.5, "Lobster season closes 14 Feb, so try conch or snapper"], ["b1", "Breakfast", 1, "08:00", 45, 9, ""], ["l1", "Lunch", 1, "13:00", 60, 9, ""], ["d1", "Dinner", 1, "19:00", 90, 9.5, ""], ["b2", "Breakfast", 2, "08:30", 45, 6, ""]],
    blurb:"\"Go slow\" island. Sand streets, no cars.",
    days:[["Day 1","Wed 3 Mar"],["Day 2","Thu 4 Mar"],["Day 3","Fri 5 Mar"]],
    ev:[
      [0,"08:00","08:55","Colectivo + taxi to pier","bus","Bacalar → Chetumal, then taxi to the ferry pier","","MXN 150 (£6) colectivos + MXN 80 (£3) taxi = £9 for 2","55m"],
      [0,"09:00","10:00","Mexican exit at the pier","other","Show your airline receipt for the exit tax","","Free with airline receipt"],
      [0,"10:00","12:15","Ferry from Chetumal","boat","Water Jets International · immigration at San Pedro","","£130 for 2","3h15"],
      [2,"10:30","11:15","Water taxi to Belize City","boat","San Pedro Belize Express or Ocean Ferry","","£30 for 2"],
      [2,"12:05","17:30","Bus to Flores","shuttle","From Belize City · crosses the border · Belize exit fee US$40 (£30) for 2 in cash","","£40 + £30 exit fee = £70 for 2","5h25"],
    ],
    acts:[
      {id:"sharkray", name:"Shark Ray Alley + Hol Chan", dur:240, pp:65, price:"", note:"Half-day snorkel · boat and gear included · nurse sharks, rays, turtles", def:[1,"09:00"]},
      {id:"split", name:"The Split · swim + hammock", dur:180, pp:0, price:"Free", note:"Drinks at the Lazy Lizard · 10 min walk", def:[1,"14:00"]},
      {id:"splitsunset", name:"Sunset at the Split", dur:90, pp:0, price:"Free", note:"", def:[1,"17:00"]},
      {id:"kokoking", name:"Koko King beach club", dur:180, pp:0, tr:8, price:"Free entry + water taxi US$5 (£4) return each", note:"", def:null, segs:[["Water taxi", 5, "boat", "£2 each"], ["Koko King", 170, "act", "Free entry"], ["Water taxi back", 5, "boat", "£2 each"]]},
      {id:"manatees", name:"Swallow Caye manatees", dur:240, pp:52, price:"US$70 (£52)", note:"Half-day boat trip to the manatee sanctuary", def:null},
    ]
  },
  { name:"Flores", country:"Guatemala", arrive:"Fri 5 Mar, 17:30", stay:"~1.5 days", from:5, to:22,
    cost:{hotel:[30,60,"2 nights",40],transport:[100,100],act:[0,0],food:[0,0]},
    win:[[0,"17:30"],[2,"06:30"]],
    meals:[["d0", "Dinner · early night", 0, "19:00", 90, 6.5, "Early night for Tikal"], ["b1", "Breakfast", 1, "05:15", 45, 4, "Before the Tikal shuttle"], ["l1", "Lunch", 1, "14:00", 60, 4, ""], ["d1", "Dinner", 1, "19:00", 90, 4.5, ""]],
    blurb:"A small island in Lake Petén Itzá, joined to the mainland by a causeway. 20 minutes to walk around.",
    days:[["Day 1","Fri 5 Mar"],["Day 2","Sat 6 Mar"],["Day 3","Sun 7 Mar"]],
    ev:[
      [0,"10:30","11:15","Water taxi to Belize City","boat","Caye Caulker → Belize City · San Pedro Belize Express or Ocean Ferry","","£30 for 2"],
      [0,"12:05","17:30","Bus to Flores","shuttle","From Belize City · crosses the border · Belize exit fee US$40 (£30) for 2 in cash","","£40 + £30 exit fee = £70 for 2","5h25"],
      [2,"06:30","06:45","Tuk-tuk to airport","walk","","","Q25 (£2.50) for 2","10m"],
      [2,"07:40","08:30","Flight to Guatemala City","flight","Avianca · checked bag included","","£145.20 for 2"],
    ],
    acts:[
      {id:"mirador", name:"Mirador del Rey Canek", dur:90, pp:2.5, tr:3, price:"Q25 (£2.50) + boat Q8 (£0.75) each way", note:"15 min walk up from the boat", def:null, segs:[["Boat to San Miguel", 10, "boat", "£0.75 each"], ["Mirador del Rey Canek", 70, "act", "£2.50 each"], ["Boat back", 10, "boat", "£0.75 each"]]},
      {id:"islandwalk", name:"Island walk at sunset", dur:60, pp:0, price:"Free", note:"20 min loop · lakeside bars", def:[0,"17:45"]},
      {id:"tikal_guided", name:"Tikal tour (GetYourGuide)", dur:465, pp:38.14, tr:0, note:"GetYourGuide tour £18.64 each incl. transport · 06:00 pickup · entrance Q150 (£14.50) each paid at the gate · tip about Q50 (£5) each for the guide, in cash", def:[1,"06:00"], segs:[["Shuttle to Tikal",75,"shuttle","in tour"],["Guided tour",255,"act","£37.28 tour + £29 entry + £10 tip"],["Explore on your own",60,"act","Free"],["Shuttle back",75,"shuttle","in tour"]]},
      {id:"jetty", name:"Jetty swim + rope swing", dur:120, pp:0, price:"Free", note:"Off the island's jetties", def:null},
      {id:"yaxha", name:"Yaxhá sunset trip", dur:330, pp:15, tr:52, price:"Q150 (£15) + tour transport US$35 (£26) each", note:"Ruins by a lagoon, few crowds", def:null, segs:[["Transport there", 90, "shuttle", "£26 return each"], ["Yaxhá ruins + sunset", 150, "act", "£15 each"], ["Transport back", 90, "shuttle", "in return"]]},
    ],
    flag:"<b>Check:</b> I couldn't find a published shuttle timetable, so book through a Caye Caulker agency. The 07:45 flight time is from a March 2026 listing."
  },
  { name:"Antigua + Acatenango", country:"Guatemala", arrive:"Sun 7 Mar, ~10:30", stay:"Sun + volcano + Tue evening", from:4, to:21,
    cost:{hotel:[31,62,"2 nights + volcano night in tour",41],transport:[180.2,180.2],act:[163.38,163.38],food:[0,0]},
    win:[[0,"10:30"],[3,"12:30"]],
    meals:[["l0", "Lunch", 0, "13:00", 60, 5, ""], ["d0", "Dinner · early night", 0, "19:00", 90, 5, ""], ["b1", "Breakfast", 1, "06:45", 40, 2.5, ""], ["l2", "Lunch", 2, "13:00", 60, 5, ""], ["d2", "Dinner", 2, "19:00", 90, 5, ""], ["b3", "Breakfast", 3, "07:30", 45, 4, ""], ["l3", "Lunch", 3, "11:30", 60, 5, ""]],
    blurb:"Colonial capital ringed by volcanoes. You sleep on Acatenango (3,976m) facing Fuego as it erupts. The tour is fixed; everything else is up to you.",
    days:[["Day 1","Sun 7 Mar"],["Day 2","Mon 8 Mar"],["Day 3","Tue 9 Mar"],["Day 4","Wed 10 Mar"]],
    ev:[
      [0,"07:40","08:30","Flight from Flores","flight","Avianca · checked bag included","","£145.20 for 2"],
      [0,"09:00","10:30","Shuttle to Antigua","shuttle","","","£32 for 2","1–1.5h"],
      [0,"15:00","16:00","Rent gear + buy water","other","Not in the tour: warm jacket, hat, gloves, poles · 3–4 litres of water each","","About Q100 (£10) for 2"],
      [1,"07:30","09:00","Meet + drive to trailhead","shuttle","","","In the tour price"],
      [1,"09:00","15:00","Hike to basecamp (3,600m)","hike","Tour incl. transport, 3 meals, tent, sleeping bag, mattress, pillow, sunrise hike · steep, 5–6h","","£134.18 tour + Q200 (£19.20) entry = £153.38 for 2","","https://www.getyourguide.com/en-gb/antigua-guatemala-l1619/antigua-overnight-volcano-acatenango-hiking-adventure-t137984/"],
      [1,"15:00","17:00","Rest at basecamp","other","","","Included in tour"],
      [1,"17:00","21:00","Watch Fuego erupt","hike","From camp","","Included in tour"],
      [2,"04:00","05:30","Summit at sunrise","hike","3,976m · 1–1.5h climb in the dark","","Included in tour"],
      [2,"05:30","07:00","Breakfast at camp","food","","","Included in tour"],
      [2,"07:00","11:00","Descent","hike","About 3–4h, hard on the knees","","Included in tour"],
      [2,"11:00","12:30","Drive back","shuttle","","","In the tour price"],
      [3,"12:30","15:00","Shuttle to the lake","shuttle","To Panajachel","","£24 for 2","2h30"],
    ],
    acts:[
      {id:"oldtown", name:"Old town · Santa Catalina Arch", dur:120, pp:0, price:"Free", note:"Parque Central, the cathedral, the market", def:[0,"11:00"]},
      {id:"cerro", name:"Cerro de la Cruz sunset", dur:90, pp:0, price:"Free", note:"View to Volcán de Agua · 15 min walk", def:[0,"16:30"]},
      {id:"fuego", name:"Fuego ridge hike", dur:240, pp:30, price:"US$40 (£30)", note:"Optional extra from basecamp, 3–4h", def:null},
      {id:"coffee", name:"Coffee farm tour", dur:150, pp:19, price:"US$25 (£19)", note:"15 min away · tasting included", def:null},
      {id:"choco", name:"Chocolate workshop", dur:120, pp:22, price:"US$30 (£22)", note:"Make your own bars from the bean", def:null},
    ]
  },
  { name:"San Juan La Laguna", title:"Lake Atitlán", country:"Lake Atitlán · Guatemala", arrive:"Wed 10 Mar, ~15:45", stay:"~2.5 days", from:4, to:23,
    cost:{hotel:[171,196,"3 nights (2 Airbnb + 1 Panajachel)",181],transport:[100,100],act:[0,0],food:[0,0]},
    win:[[0,"15:45"],[3,"05:00"]],
    meals:[["d0", "Dinner", 0, "19:00", 90, 4.5, ""], ["b1", "Breakfast", 1, "06:15", 45, 6, "Before the Chichi shuttle"], ["l1", "Lunch at the market", 1, "12:00", 60, 6, "Comedores in the covered food hall by the church"], ["d1", "Dinner", 1, "19:00", 90, 6.5, ""], ["b2", "Breakfast", 2, "07:15", 45, 6, ""], ["l2", "Lunch", 2, "14:15", 60, 6, ""], ["d2", "Dinner in Panajachel · early night", 2, "19:00", 90, 5.5, ""], ["b3", "Breakfast near the airport", 3, "09:00", 45, 6, ""]],
    blurb:"The quiet, cultural village: Maya weaving co-ops and murals, with the Indian Nose trail just behind it.",
    days:[["Day 1","Wed 10 Mar"],["Day 2","Thu 11 Mar"],["Day 3","Fri 12 Mar"],["Day 4","Sat 13 Mar"]],
    ev:[
      [0,"12:30","15:00","Shuttle from Antigua","shuttle","To Panajachel","","£24 for 2","2h30"],
      [0,"15:15","15:45","Boat to San Juan La Laguna","boat","Public lancha from the Panajachel dock","","Q50 (£5) for 2","30m"],
      [2,"16:00","16:30","Boat to Panajachel","boat","Public lancha · 1 night in Panajachel","","Q50 (£5) for 2","30m"],
      [3,"05:00","09:00","Shuttle to the airport","shuttle","From Panajachel","","US$90 (£66) for 2","4h"],
      [3,"12:15","15:20","Airport check-in + security","other","KLM desk opens about 3h before","","Free"],
      [3,"15:20","19:50","KL7597 to Atlanta","flight","Lands 19:50 Atlanta time · clear US immigration, re-check bags","","£990 for 2","3h30"],
      [3,"19:50","22:25","Connection in Atlanta","other","2h35 · you need an ESTA","","Free"],
      [3,"22:25","23:00","KL6195 to London Heathrow","flight","Overnight · lands Sun 14 Mar 11:40","","In the same booking","8h15"],
    ],
    acts:[
      {id:"museum", name:"National Museum of Archaeology + Ethnology", dur:120, pp:0, note:"Zona 13, about 15 min walk from the airport · Maya jade, stelae and textiles · free, open Tue–Sun 09:00–18:00", def:[3,"10:00"]},
      {id:"coops", name:"Weaving, coffee + chocolate co-ops", dur:180, pp:3, price:"Free – Q50 (£5)", note:"Natural-dye weaving demos, coffee tasting · walking distance", def:null},
      {id:"dock", name:"Sunset on the dock", dur:60, pp:0, price:"Free", note:"", def:[0,"17:30"]},
      {id:"chichi", name:"Chichicastenango market", dur:480, pp:0, tr:37, price:"Free to browse + shuttle US$25 (£19) return each", note:"Thursday market", def:[1,"07:00"], segs:[["Shuttle to Chichi", 120, "shuttle", "£19 return each"], ["Chichicastenango market", 180, "act", "Free to browse"], ["", 60, "gap", ""], ["Shuttle back", 120, "shuttle", "in return ticket"]]},
      {id:"nose", name:"Indian Nose sunrise hike", kind:"hike", dur:180, pp:13, price:"Q100–150 (£10–15)", note:"Guide picks you up at 04:00 · 30–45 min climb", def:[2,"04:00"]},
      {id:"sanmarcos", name:"San Marcos swim + cliff jump", dur:270, pp:2, tr:5, price:"Q20 (£2) + boat Q12 (£1.25) each way", note:"Cerro Tzankujil reserve · go before the afternoon wind", def:[2,"09:30"], segs:[["Boat to San Marcos", 15, "boat", "£1.25 each"], ["Swim + cliff jump + lunch", 240, "act", "£2 each + lunch"], ["Boat back", 15, "boat", "£1.25 each"]]},
      {id:"kayak", name:"Kayak or paddleboard", dur:90, pp:6, price:"Q60 (£6)", note:"From the San Juan docks", def:null},
      {id:"santacruz", name:"Santa Cruz views + lunch", dur:240, pp:0, tr:10, price:"Boat Q25 (£2.50) each way", note:"Cliffside cafés", def:null, segs:[["Boat to Santa Cruz", 40, "boat", "£2.50 each"], ["Views + lunch", 160, "act", "Free + lunch"], ["Boat back", 40, "boat", "£2.50 each"]]},
    ],
    flag:"No need to go via Panajachel: its first boat isn't until 06:00."
  },
];

// Show the midpoint of any money range, e.g. "MXN 250–350 (£10–14)" → "MXN 300 (£12)"
const midP = str => !str ? str : str.replace(/(£|US\$|MXN |Q)(\d[\d,]*(?:\.\d+)?)–(\d[\d,]*(?:\.\d+)?)/g, (m, cur, a, b) => {
  const x = (parseFloat(a.replace(/,/g,"")) + parseFloat(b.replace(/,/g,""))) / 2;
  const v = (x < 10 && x % 1) ? x.toFixed(2) : Math.round(x).toLocaleString("en-GB");
  return cur + v;
});
const HAS_MONEY = /£|US\$|MXN|Q\d/;
const LOCAL_EACH = /(MXN |US\$|Q)([\d,.]+) each/g;
const twice = n => { const v = n * 2; return v % 1 ? v.toFixed(2) : String(v); };
PLACES.forEach(p => {
  (p.meals || []).forEach(([id, name, day, at, dur, pp, note, opt]) => p.acts.push({ id: "meal_" + id, name, dur, pp, opt, kind: "food", meal: true, def: [day, at],
    note: note.replace(LOCAL_EACH, (m, c, n) => c + twice(parseFloat(n.replace(/,/g, ""))) + " for 2"), price: `£${twice(pp)} for 2` }));
  p.acts.forEach(a => {
    if (a.meal) return;
    const entry = (a.pp || 0) * 2, tr = a.tr || 0, tot = entry + tr;
    a.price = !tot ? "Free" : (entry && tr ? `£${twice(a.pp)} entry + £${tr} transport = £${twice(a.pp + tr / 2)} for 2` : `£${twice(tot / 2)} for 2`);
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
  if (/Avios/.test(p)) return "£190 + Avios";
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
const ST_DEF = { flight1: "research", flight2: "research" };
const SHARED = { "Flight from Gatwick":"flight1", "Flight to Guatemala City":"flores-gua", "Flight from Flores":"flores-gua",
  "Ferry to Caye Caulker":"ferry-cc", "Ferry from Chetumal":"ferry-cc", "Water taxi to Belize City":"wtaxi",
  "ADO bus to Bacalar":"bus-bac", "ADO bus from Valladolid":"bus-bac", "Shuttle to the lake":"sh-lake", "Shuttle from Antigua":"sh-lake",
  "ADO bus to Valladolid":"bus-val", "Bus from Cancún":"bus-val", "Shuttle to the airport":"sh-air", "Colectivo + taxi to pier":"col-chet", "KL7597 to Atlanta":"flight2", "Bus to Flores":"bus-flores" };
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
const mealCost = (p, a) => { const v = MEALP[p.name] && MEALP[p.name][a.id]; return typeof v === "number" && v >= 0 ? v : a.pp * 2; };
const setSlot = (p, a, v) => { PLAN[p.name] = PLAN[p.name] || {}; PLAN[p.name][a.id] = v; store.set("plan_v2", PLAN); };
const placed = (p, opt = OPT) => p.acts.filter(a => !a.opt || a.opt === opt).map(a => ({ a, s: slotOf(p, a) })).filter(x => x.s && visDays(p, opt).includes(x.s[0]));
const actEvent = (p, a, s) => { const st = toMin(s[1]); const e = [s[0], s[1], toHM(Math.min(st + a.dur, 24*60)), a.name, a.kind || "act", a.note, "", a.meal ? `£${mealCost(p, a)} for 2` : a.price]; e.act = a.id; e.segs = a.segs; e.meal = a.meal; e.stKey = `act:${p.name}:${a.id}`; return e; };
const evList = p => p.ev.filter(inOpt).map(e => { e.stKey = evStKey(p, e); return e; }).concat(placed(p).map(x => actEvent(p, x.a, x.s)))
  .sort((a, b) => a[0] - b[0] || toMin(a[1]) - toMin(b[1]));

let HOTEL = store.get("hotels", {});
const TIERS = [["low","Low","About 25% less than your spreadsheet"],["mid","Mid","Your spreadsheet price"],["high","High","About 50% more than your spreadsheet"]];
const tierOf = p => HOTEL[p.name] || "mid";
function costOf(p, opt = OPT){
  const base = p.cost.A ? p.cost[opt] : p.cost, c = {};
  ["hotel","transport","act","food"].forEach(k => c[k] = base[k].slice());
  const t = tierOf(p), h = base.hotel;
  if (t === "mid" && h[3] != null) c.hotel = [h[3], h[3], h[2]];
  if (t === "low") c.hotel = [h[0], h[0], h[2]];
  if (t === "high") c.hotel = [h[1], h[1], h[2]];
  const add = (k, v) => { c[k][0] += v; c[k][1] += v; };
  placed(p, opt).forEach(({ a }) => { if (a.meal) add("food", mealCost(p, a)); else { add("act", (a.pp || 0) * 2); add("transport", a.tr || 0); } });
  // fixed food items with a price, e.g. dinner at the airport
  p.ev.filter(e => e[4] === "food" && (!e[6] || e[6].toUpperCase() === opt) && visDays(p, opt).includes(e[0])).forEach(e => { const m = (e[7] || "").match(/\(£([\d.]+)\)/); if (m) add("food", parseFloat(m[1]) * 2); });
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
    ${cell("Transport", c.transport, p.name === "San Juan La Laguna" ? "Getting here, around, and to the airport home" : "Getting here and getting around")}
    ${cell("Activities", c.act, `${placed(p).filter(x => !x.a.meal).length} planned${p.name.startsWith("Antigua") ? " + Acatenango" : ""}`)}
    ${cell("Food", c.food, `${placed(p).filter(x => x.a.meal).length} meals, from the calendar`)}
    <div class="cs cs-total"><span class="cs-l">Total for 2</span><span class="cs-v mono">${gbp(placeSum(p))}</span></div>
  </div>`;
}

// Cost of the first two stops (Cancún + Valladolid) under each option, for 2 people
const optionCost = opt => PLACES.filter(p => (!p.only || p.only === opt) && (p.name === "Cancún" || p.name === "Valladolid")).reduce((s, p) => s + placeSum(p, opt), 0);
function fillOptionCosts(){
  const a = optionCost("A"), b = optionCost("B"), d = Math.abs(a - b);
  const ea = document.querySelector('[data-cost="A"]'), eb = document.querySelector('[data-cost="B"]');
  if (ea) ea.innerHTML = `<b>£${a}</b> ${a > b ? "£" + d + " more" : a < b ? "£" + d + " less" : ""}`;
  if (eb) eb.innerHTML = `<b>£${b}</b> ${b < a ? "£" + d + " less" : b > a ? "£" + d + " more" : ""}`;
}
const FLIGHTS = 1180, EXTRAS = 75.5, BUDGET = 3313;
// How much is already paid: items marked "Booked + paid"
const priceNum = str => { if (!str) return 0; const m = str.match(/= £([\d.,]+) for 2/) || str.match(/\(£([\d.,]+)\) for 2/) || str.match(/£([\d.,]+)/); return m ? parseFloat(m[1].replace(/,/g, "")) : 0; };
const isPaid = k => stOf(k) === "paid";
function paidOf(p, owner, opt = OPT){
  let t = isPaid(`hotel:${p.name}`) ? mid(costOf(p, opt).hotel) : 0;
  p.ev.filter(e => (!e[6] || e[6].toUpperCase() === opt) && visDays(p, opt).includes(e[0])).forEach(e => {
    const k = evStKey(p, e); if (!k || k === "flight1" || k === "flight2" || owner[k] !== p.name) return;
    if (isPaid(k)) t += priceNum(e[7]);
  });
  placed(p, opt).forEach(({ a }) => { if (isPaid(`act:${p.name}:${a.id}`)) t += a.meal ? mealCost(p, a) : (a.pp || 0) * 2 + (a.tr || 0); });
  return t;
}
function renderSummary(){
  const vis = PLACES.filter(p => !p.only || p.only === OPT);
  const owner = {};
  vis.forEach(p => p.ev.forEach(e => { const k = evStKey(p, e); if (k) owner[k] = p.name; }));
  const rows = vis.map((p, i) => ({ i, name: p.title || p.name, sub: `${costOf(p).hotel[2]} · ${tierOf(p)} hotel · ${placed(p).filter(x => !x.a.meal).length} activities`, v: placeSum(p), pd: paidOf(p, owner) }));
  const total = FLIGHTS + EXTRAS + rows.reduce((a, r) => a + r.v, 0);
  const fPaid = (isPaid("flight1") ? 190 : 0) + (isPaid("flight2") ? 990 : 0);
  const paidTotal = fPaid + rows.reduce((a, r) => a + r.pd, 0);
  document.getElementById("sum-paid").textContent = gbp(paidTotal);
  document.getElementById("sum-opt").textContent = "Option " + OPT;
  fillItinerary();
  document.getElementById("sum-total").textContent = gbp(total);
  document.getElementById("sum-pp").textContent = `About ${gbp(Math.round(total / 2))} each.`;
  const diff = total - BUDGET, bel = document.getElementById("sum-budget");
  bel.className = "budget " + (diff > 0 ? "over" : "under");
  bel.innerHTML = `Budget <b class="mono">${gbp(BUDGET)}</b> · <b class="mono">${gbp(Math.abs(diff))}</b> ${diff > 0 ? "over" : "under"}`;
  document.getElementById("sum-rows").innerHTML =
    `<tr><th>Flights<small>Flight 1: LGW to CUN · £190 · 33,000 Avios · £779 saved</small><small>Flight 2: GUA to LHR via ATL · £990</small></th><td class="mono">${gbp(FLIGHTS)}</td></tr>` +
    rows.map(r => `<tr class="place-row" data-go="p${r.i}"><th><span class="num">${String(r.i + 1).padStart(2, "0")}</span><b>${esc(r.name)}</b><small>${esc(r.sub)}</small></th><td class="mono">${gbp(r.v)}</td></tr>`).join("") +
    `<tr><th>Fees and extras<small><span title="US travel authorisation, needed for the Atlanta connection on the way home. One traveller already had one." style="text-decoration:underline dotted;cursor:help">ESTA x1 - £30</span></small><small><span title="Quintana Roo state tourist tax, paid online per person before leaving Mexico (covers Cancún and Bacalar). About MXN 290 (£11.50) each. Pay only on visitax.gob.mx and keep the QR receipt to show at the airport or border." style="text-decoration:underline dotted;cursor:help">Visitax x2 - £23</span></small><small><span title="Belize £7 + Latin America 15 days £15.50 (covers Mexico and Guatemala)" style="text-decoration:underline dotted;cursor:help">eSIMs x1 - £22.50</span></small></th><td class="mono">${gbp(EXTRAS)}</td></tr>` +
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
  mx: '<rect width="20" height="40" fill="#006847"/><rect x="20" width="20" height="40" fill="#FFFFFF"/><rect x="40" width="20" height="40" fill="#CE1126"/><circle cx="30" cy="20" r="5" fill="#8C6239"/>',
  bz: '<rect width="60" height="40" fill="#CE1126"/><rect y="4" width="60" height="32" fill="#003F87"/><circle cx="30" cy="20" r="11" fill="#FFFFFF"/><circle cx="30" cy="20" r="9.5" fill="none" stroke="#2E7D32" stroke-width="1.6" stroke-dasharray="2 1.4"/>',
  gt: '<rect width="20" height="40" fill="#4997D0"/><rect x="20" width="20" height="40" fill="#FFFFFF"/><rect x="40" width="20" height="40" fill="#4997D0"/><circle cx="30" cy="20" r="6" fill="none" stroke="#3A7D2C" stroke-width="1.6"/>',
};
const countryOf = p => /Belize/.test(p.country) ? ["bz","Belize"] : /Guatemala/.test(p.country) ? ["gt","Guatemala"] : ["mx","Mexico"];
const flagFor = p => { const [cc, name] = countryOf(p); return `<svg class="mini-flag" viewBox="0 0 60 40" role="img" aria-label="${name}">${FLAG_SVG[cc]}</svg>`; };
const nightsText = p => {
  const h = costOf(p).hotel[2], n = parseInt((h.match(/(\d+) night/) || [0, 0])[1], 10) + (/volcano/.test(h) ? 1 : 0);
  return `${n} night${n === 1 ? "" : "s"}${/volcano/.test(h) ? " · 1 on the volcano" : ""}`;
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
const SCENES = {
  "Cancún": sky("cn-s", "#F59A72", "#FFE2AE") +
    `<circle cx="560" cy="122" r="34" fill="#FFF3D1"/>
    <g fill="#D98668"><rect x="60" y="82" width="26" height="58"/><rect x="92" y="96" width="20" height="44"/><rect x="118" y="70" width="30" height="70"/><rect x="640" y="92" width="24" height="48"/><rect x="668" y="78" width="30" height="62"/><rect x="704" y="102" width="22" height="38"/></g>
    <rect y="138" width="800" height="44" fill="#1FB2C0"/><rect y="150" width="800" height="3" fill="#7FE0E3" opacity=".6"/><rect y="164" width="800" height="2" fill="#7FE0E3" opacity=".5"/>
    <path d="M0 180 Q400 162 800 182 V220 H0Z" fill="#F3E2BF"/>` + palm(150, 112, 1.1, 1) + palm(760, 128, .8, -1),
  "Valladolid": sky("vl-s", "#8ECDE6", "#EAF5EC") +
    `<path d="M0 170 Q120 140 260 160 T540 150 T800 158 V220 H0Z" fill="#4E8A4C"/>` +
    steps(400, 204, 300, 96, 9, 13, "#C8B286", "#E3D3AE") +
    `<rect x="383" y="87" width="34" height="117" fill="#B09A6F"/><rect x="368" y="60" width="64" height="28" fill="#BCA67B"/><rect x="368" y="58" width="64" height="4" fill="#E3D3AE"/>
    <rect x="378" y="70" width="10" height="18" fill="#4B3F2C"/><rect x="395" y="70" width="10" height="18" fill="#4B3F2C"/><rect x="412" y="70" width="10" height="18" fill="#4B3F2C"/>
    <path d="M0 196 Q200 182 400 204 T800 196 V220 H0Z" fill="#2F6B3A"/>`,
  "Bacalar": sky("bc-s", "#BDE5F2", "#F4FBF8") +
    `<path d="M0 104 Q200 92 400 102 T800 100 V112 H0Z" fill="#3E7A45"/>` +
    [["#1C3D8C",112],["#2463B8",130],["#2B8ED4",148],["#3DB6D8",164],["#6ED5CF",180],["#A7EAD8",194],["#ECF2DA",206]]
      .map(([c, y]) => `<path d="M0 ${y} Q200 ${y - 6} 400 ${y} T800 ${y} V220 H0Z" fill="${c}"/>`).join("") +
    `<path d="M520 160 L1100 146 L1100 166 L520 168Z" fill="#8C6A48"/>` +
    [540,580,620,660,700,740,780,820,860,900,940,980,1020,1060].map(x => `<rect x="${x}" y="164" width="5" height="30" fill="#6B4E33"/>`).join("") +
    palm(70, 100, 1, 1),
  "Caye Caulker": sky("cc-s", "#6CC4EE", "#E0F6FA") +
    `<rect y="118" width="800" height="102" fill="#17A3C6"/><path d="M0 170 Q300 158 520 172 T800 168 V220 H0Z" fill="#58CFD6"/>
    <path d="M190 182 L222 168 L254 182 L222 194Z M222 194 L216 214" fill="#0E7C96" stroke="#0E7C96" stroke-width="2" opacity=".7"/>
    <rect x="420" y="146" width="680" height="8" fill="#9A7652"/>` +
    [430,480,530,580,630,680,730,780,830,880,930,980,1030,1080].map(x => `<rect x="${x}" y="152" width="5" height="34" fill="#6E5236"/>`).join("") +
    `<rect x="432" y="116" width="54" height="30" fill="#F2C94C"/><path d="M424 118 L459 98 L494 118Z" fill="#E0663D"/><rect x="452" y="126" width="12" height="20" fill="#7A4E2D"/>
    <path d="M660 220 Q720 196 800 200 L1100 200 V220Z" fill="#F3E4C2"/>` + palm(730, 104, .9, -1),
  "Flores": sky("fl-s", "#F2DFBC", "#D7E7D3") +
    `<g opacity=".45">` + steps(190, 176, 90, 34, 7, 12, "#9C947F", "#B9B19A") + `<rect x="176" y="70" width="28" height="22" fill="#9C947F"/></g>` +
    steps(420, 186, 140, 52, 9, 13, "#8E8471", "#B2A88F") +
    `<rect x="404" y="40" width="32" height="30" fill="#8E8471"/><rect x="408" y="22" width="24" height="18" fill="#7E7462"/><rect x="415" y="50" width="10" height="16" fill="#3D372C"/>
    <rect y="140" width="800" height="18" fill="#FFFFFF" opacity=".35"/>` +
    canopy(196, ["#2E5E34","#3C7342","#25502C","#4A8550"]) +
    `<path d="M600 70 l8 -6 l8 6 M630 58 l6 -5 l6 5" stroke="#3D372C" stroke-width="2" fill="none"/>`,
  "Antigua + Acatenango": sky("an-s", "#272B57", "#E07C5C") +
    `<circle cx="120" cy="40" r="1.5" fill="#FFFFFF"/><circle cx="260" cy="26" r="1.2" fill="#FFFFFF"/><circle cx="720" cy="34" r="1.4" fill="#FFFFFF"/>
    <path d="M120 200 L330 62 L370 60 L600 200Z" fill="#2E2A45"/>
    <path d="M430 200 L612 86 L640 86 L860 200Z" fill="#3B3352"/>
    <ellipse cx="640" cy="60" rx="34" ry="18" fill="#8A7F86" opacity=".8"/><ellipse cx="668" cy="36" rx="40" ry="20" fill="#9C9198" opacity=".6"/><ellipse cx="700" cy="16" rx="44" ry="18" fill="#ADA3A8" opacity=".4"/>
    <circle cx="626" cy="84" r="12" fill="#FF8A2B" opacity=".7"/>
    <path d="M622 88 Q600 120 586 150 M630 88 Q646 118 660 140" stroke="#FF6A1F" stroke-width="3" fill="none"/>
    <path fill-rule="evenodd" d="M300 220 V160 H500 V220 Z M370 220 V196 Q400 168 430 196 V220Z" fill="#E8B33C"/>
    <rect x="384" y="138" width="32" height="22" fill="#E8B33C"/><circle cx="400" cy="149" r="6" fill="#FFF3D1"/>
    <rect x="-300" y="200" width="1400" height="20" fill="#1D1A30"/><rect x="0" y="196" width="300" height="24" fill="#1D1A30"/><rect x="500" y="200" width="300" height="20" fill="#1D1A30"/>`,
  "San Juan La Laguna": sky("sj-s", "#A6C7E2", "#FBD9B0") +
    `<path d="M80 176 L222 72 L244 72 L390 176Z" fill="#5A7898"/>
    <path d="M420 176 L556 88 L578 88 L650 140 L688 62 L712 62 L830 176Z" fill="#4C6889"/>
    <rect y="174" width="800" height="46" fill="#3B7CA5"/>` +
    [184,194,204].map((y, i) => `<rect x="${120 + i*40}" y="${y}" width="${360 - i*60}" height="2" fill="#A9D1EA" opacity=".6"/>`).join("") +
    `<path d="M560 196 L640 196 L630 206 L568 206Z" fill="#F2F2EC"/><rect x="590" y="186" width="22" height="10" fill="#2F6E9E"/>
    <path d="M0 176 Q60 160 140 178 Q80 190 0 200Z" fill="#3F7A42"/>`,
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
      const cost = (a.pp || 0) * 2 + (a.tr || 0);
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
    const cost = (a.pp || 0) * 2 + (a.tr || 0);
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

const HIGHLIGHTS = [["Chichén Itzá","Valladolid",235],["Shark Ray Alley","Caye Caulker",250],["Tikal","Flores",255],["Acatenango","Antigua + Acatenango",440],["Lake Atitlán","San Juan La Laguna",440]];
const ITIN = [
  ["Sat 27 Feb", { A: "London → Cancún", B: "London → Valladolid" }, { A: "Cancún", B: "Valladolid" }],
  ["Sun 28 Feb", { A: "Cancún → Valladolid", B: "Valladolid" }, "Valladolid"],
  ["Mon 1 Mar", "Valladolid", "Valladolid"],
  ["Tue 2 Mar", "Valladolid → Bacalar", "Bacalar"],
  ["Wed 3 Mar", "Bacalar → Caye Caulker", "Caye Caulker"],
  ["Thu 4 Mar", "Caye Caulker", "Caye Caulker"],
  ["Fri 5 Mar", "Caye Caulker → Flores", "Flores"],
  ["Sat 6 Mar", "Flores", "Flores"],
  ["Sun 7 Mar", "Flores → Antigua", "Antigua + Acatenango"],
  ["Mon 8 Mar", "Acatenango", "Antigua + Acatenango"],
  ["Tue 9 Mar", "Acatenango → Antigua", "Antigua + Acatenango"],
  ["Wed 10 Mar", "Antigua → Lake Atitlán", "San Juan La Laguna"],
  ["Thu 11 Mar", "Lake Atitlán", "San Juan La Laguna"],
  ["Fri 12 Mar", "Lake Atitlán → Panajachel", "San Juan La Laguna"],
  ["Sat 13 Mar", "Panajachel → London", "home"],
  ["Sun 14 Mar", "Arrive London", "home"],
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
