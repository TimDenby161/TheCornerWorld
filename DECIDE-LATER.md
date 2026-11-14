# Decide later: flights, prices and the paywall

What was left out when airports were added in October 2026, what is recommended for each piece, and what has to be settled before it can be built. Nothing here blocks the site as it is today: free, with no login.

Prices and terms below were looked up on 6 October 2026. Read them again before acting; they change. Anything marked "not confirmed" could not be checked from the provider's own pages.

## The plan in short

| What | Use | Cost | Status |
|---|---|---|---|
| Routes and schedules | AirLabs (Aviationstack if AirLabs' terms don't allow commercial use) | $49 a month | Waiting for a free AirLabs key to test the data |
| Indicative "from" prices | Travelpayouts | Free | Waiting for a Travelpayouts account and token |
| Affiliate flight links | Travelpayouts | Free, earns commission | Same account |
| Live prices for a visitor's dates | Duffel | Pay per use | Wait until the paywall server exists |

The order:

1. Get a free AirLabs key and put it in `.env` as `AIRLABS_KEY=...`. Pull sample routes for places you know and judge the quality.
2. If the data is good and the terms allow it, pay for a month and build the full flights file into the site.
3. Open a Travelpayouts account and add its token to `.env`. Add "from" prices and swap the Google Flights link for an affiliate one.
4. Add live prices when the paywall server exists.

Steps 1 and 3 are free and do not depend on each other.

## What is already in and safe

- Every airport with scheduled flights (about 4,000) on the map, and the airports for each place, from OurAirports (public domain). No restriction, paywall or not.
- Flight times worked out from the distance between two airports. This is the site's own arithmetic.
- Links out to Google Flights and Rome2Rio. A link sends a visitor away; no data is taken from either.
- Journeys written by hand in `docs/data/legs.json`. They are yours.

## 1. Routes and schedules

**The gap.** The site knows the airports at each end but not whether an airline flies between them, on which days or at what times. Every unwritten flight is labelled an estimate, and the time shown is what a direct flight would take even where none exists.

**No free source does the whole job.** Nothing found is free, licensed for commercial use, current, and covers both routes and schedules worldwide. Routes can be had free with trade-offs; schedules cannot, because timetables are what the data companies sell.

**Paid providers.**

| Provider | Price | What it gives | Notes |
|---|---|---|---|
| **AirLabs** (recommended) | $49 a month. Number of queries included: to check | For each flight between two airports: airline, flight number, departure and arrival times, duration, days of the week, aircraft type | A free key includes routes, capped at 50 rows a request, so the data can be tested before paying. Commercial use and storing the results: not confirmed |
| **Aviationstack** (fallback) | $49.99 a month for 10,000 requests | Airline routes and future schedules | Paid plans state that commercial use is included. The free plan leaves routes out and is for personal use only, so it cannot be tested free |
| **AeroDataBox** | From about $5 a month | Airport departure boards and route statistics | Built around single airports and days, so awkward for a world route map |
| **OAG** | Priced after sign-up or through sales; 14-day trial of 100 requests | The industry's reference timetable | The most accurate, and likely far more than is worth spending at this stage |

Ruled out: Amadeus' self-service API, once the usual free starting point, was shut down on 17 July 2026. Flightradar24 sells tracking of individual flights, not a route map. Google Flights has no API, and Skyscanner's is only for approved, established partners.

**Free sources of routes only (no schedules).**

| Source | Commercial use | Catch |
|---|---|---|
| Travelpayouts | Yes on a free site earning commission; needs their written yes before it feeds anything paid (see 4) | Tied to their affiliate programme |
| Wikipedia airport pages | Yes, with credit, and the routes file built from it must be shared under the same licence (CC BY-SA). Not confirmed | Kept by volunteers, so uneven; needs a script to extract |
| Government statistics (US BTS, Eurostat) | Yes. Not confirmed | Only flights touching the US or Europe, and months out of date |
| OpenFlights | Yes, with credit | Routes believed not updated since about 2014 |
| Hand-written entries in `legs.json` | Yours | By hand, and they go out of date |

**How it would be built.** A build script, like the airports one, fetches the data and writes a flights file the site reads. The key stays in `.env`, which is kept out of git. A trip leg would then say "direct, 2h 15m, daily, three airlines" in place of an estimate, and the planner would know where no direct flight exists.

**Two limits.**

- It is a snapshot. Timetables change every week, so the data is as old as the last rebuild. A monthly rebuild is reasonable; the "Search flights" link stays for the exact day.
- The cheaper services collect schedules from many sources and have gaps and stale entries. Only OAG-grade data is authoritative.

**To decide or check.**

- AirLabs' terms: is commercial use allowed, and may the results be stored and shown on the site, including to paying customers? If not, or if vague, use Aviationstack.
- How many queries the $49 AirLabs plan includes. That settles whether one month covers all 4,008 airports or only the 371 near the site's places. A full pull is one or more requests per airport.
- Whether the sample data is good enough on routes you know.

## 2. Prices

**The gap.** No prices are shown anywhere. Neither AirLabs nor Aviationstack has fares: schedules and prices are separate purchases, because fares are sold through booking systems.

**Recommended now: indicative "from" prices from Travelpayouts.** Free with an account. A build script fetches them from Travelpayouts' cache, so they fit the static site. They are as old as the last build and need labelling as a guide ("from £X").

**Recommended later: live prices from Duffel.** Live prices for a visitor's exact dates need a small server between the site and the provider (a Cloudflare Worker would do), which ends the "static site, no outside requests" setup. Duffel charges per use; Skyscanner is the alternative, by application and for established sites. Neither provider's current terms were checked. Add this when the paywall brings a server anyway.

**To decide.** Whether indicative prices are enough to start with. The paywall question for Travelpayouts data (see 4).

## 3. Earning from flight links

**The gap.** The "Search flights" link goes to Google Flights, which pays nothing.

**Recommended: Travelpayouts affiliate links**, from the same account as the prices. It covers several flight brands. The airport codes a link needs are already in place, so this is a small change. Skyscanner's own affiliate programme is the alternative.

**To decide.** Which brand to send visitors to, once the site has enough content to be accepted. Check the programme's rules on where links may appear, including behind a login.

## 4. The paywall

The plan is to keep flight data free and charge for detailed place content and route planning. Three things follow.

**The route planner uses journey data.** It needs flight and driving times to put stops in order, so that data ends up inside the paid feature even if it is also shown for free.

- Airports, computed flight times and `legs.json`: no issue.
- AirLabs or Aviationstack data: covered if the plan allows commercial use and showing stored results to paying customers (see 1).
- Travelpayouts data: ask their support before charging. Describe it as "shown free on public pages, and also used by a paid trip planner".
- Road distances: see below.

**Road distances come from the public OSRM demo server.** `scripts/build-distances.mjs` asks `router.project-osrm.org`. Its policy says: "Access to the demo server shall not be behind a paywall: If the Demo Server is used in a commercial product, it needs to be publicly accessible and featuring proper attribution." Before charging for the planner, rebuild the distances from OSRM running on your own machine. The software is free and OpenStreetMap data allows commercial use with the credit the site already shows. It means downloading map extracts for each region, so the build gets heavier.

**A static site cannot enforce a paywall.** Everything in `docs/data/` can be read by anyone, including `guides.json`. Paid content needs a login and a server in front of it, which means moving off plain GitHub Pages for those parts. The same server is what live prices need (see 2).

**To decide.** Exactly what is paid; where the paid parts are hosted; and the Travelpayouts answer, if their data is used.

## 5. Airport matches worth checking

The matching is automatic and will sometimes pick the wrong airport. Fix any with `"airport": "CODE"` on the place in `guides.json` (see the README).

- Six were set by hand already: Amman (AMM), Ninh Binh and Sa Pa (HAN), and Kyoto, Osaka and Nara (KIX).
- `npm run build:airports` lists the places whose nearest airport is in another country. Most are right (Monaco uses Nice). Chernobyl is matched to Gomel in Belarus and Bethlehem to Tel Aviv; both want a second look.
- Places far from any airport, where the match is over 150 km away, include Ksamil, Serengeti, Kande Beach, the Gates of Hell, Iringa and Ha Giang.

## 6. Airports on the map

Clicking an airport on the map only names it. Left out for now, each a separate piece of work:

- A list of airports in each country's panel and guide page.
- Finding an airport by name or code in the search.
- A "flying from" airport on the trip planner, so a trip shows the flight out and the flight home.

## Sources

- [AirLabs Routes API documentation](https://airlabs.co/docs/routes)
- [Aviationstack pricing](https://aviationstack.com/pricing)
- [Amadeus to shut down self-service APIs portal (PhocusWire)](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers)
- [OAG Flight Info API: how charging works](https://www.oag.com/knowledge/how-am-i-charged-for-using-flight-info-api)
- [AeroDataBox overview (API Evangelist)](https://providers.apievangelist.com/providers/aerodatabox/)
- [Requirements for Aviasales data API access (Travelpayouts)](https://support.travelpayouts.com/hc/en-us/articles/203956083-Requirements-for-Aviasales-data-API-access)
- [OSRM API usage policy](https://github.com/Project-OSRM/osrm-backend/wiki/API%20Usage%20Policy)
- [OurAirports data](https://ourairports.com/data/)
