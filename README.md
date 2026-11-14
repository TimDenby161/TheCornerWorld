# The Corner World

An interactive world map with destination guides and a trip planner. A static site in `docs/`, built the same way as The Corner FC: no outside requests, ready for GitHub Pages. The usual build step is `npm run build:pages` after editing a guide.

## Run it

```bash
npm run serve        # then open http://localhost:8000
```

## Adding and editing guides

All the travel content lives in `docs/data/guides.json`. Each entry is keyed by the country's three-letter code (`JOR`, `ITA`; the codes are in `docs/data/countries.json`). A state has a longer code, such as `AU-NSW` for New South Wales. Every field is optional:

| Field | What it does |
|---|---|
| `status` | `"draft"` shows a Draft badge. Remove it when the guide is final. |
| `summary` | The paragraph at the top of the guide and on its card. |
| `bestMonths` | Month numbers, e.g. `[3, 4, 5]`. Drives the month strip, the "When" filter and the off-season warning in the planner. |
| `bestTimeNote` | A sentence or two under the month strip. |
| `budgetPerDay` | Per person, in the currency set in `site.json`. Drives the budget filter and the trip's rough cost. |
| `nights` | Suggested stay as `[min, max]`. |
| `tags` | Interests. Any new tag appears as a filter automatically. |
| `places` | The cities, landmarks and places to go: `id`, `name`, `lat`, `lng`, `blurb`, and `nights` (the suggested stay). Optionally `type` (`"city"`, `"landmark"` or `"place"`), `rank` (see The trip builder) and `airport` (see Airports and flights). A place can also have `links` (see Earning from the site). |
| `links` | Booking links for the whole country, shown under "Book it": a list of `{ "label": "Car hire", "url": "https://..." }`. |
| `itineraries` | Ready-made routes: a `name` and `stops`, each a place `id` and `nights`. |
| `tips` | The "Good to know" list. |

Countries without a guide still open on the map with their basic facts, and can still be added to a trip.

After changing a guide, run `npm run build:pages` (see Guide pages). After adding or moving places, run `npm run build:distances` and `npm run build:airports` first.

## The trip builder

On the My trip tab, a visitor picks one or more destinations and a number of nights, and the site builds the trip: it chooses the places, shares out the nights and puts the stops in the shortest order to travel. They can then change anything.

It works from the `places` in `guides.json`, so a destination is only offered once it has places named. An entry can be just a list of places, with no other guide fields. A country also offers the places named under its states and islands.

Two fields on a place steer it:

- `rank`: `1` for the places nobody should miss, `2` for worth the time (the default), `3` for if there is time. Rank 1 places go in first, so they are what a short trip keeps.
- `nights`: how long the place deserves. A long trip gives a place up to twice this before nights are left over.

`type` is shown beside the place's name, and a built trip starts in a city where the route allows.

## Getting from place to place

`docs/data/legs.json` says how to travel between two places. Each line is one journey, and works in both directions:

```json
{ "from": "GB-ENG/london", "to": "GB-ENG/seven-sisters", "by": "train", "hours": 2, "note": "via Seaford or Eastbourne, plus a short bus" }
```

- `from` and `to`: the destination's code, a slash, and the place's `id`.
- `by`: `train`, `car`, `bus`, `plane`, `ferry` or `boat`.
- `hours`: the journey time. Quarters are fine: `0.75` shows as "45 minutes", `2.25` as "2¼ hours".
- `note` (optional): a few words shown after the time. Word it so it reads the same in either direction.

A trip shows the journey between each stop and the next, with the distance, and the trip builder uses the times to choose the order.

`docs/data/distances.json` holds the distance between every two places within 500 km of each other: the straight line, and the road distance and driving time where there is a road. `npm run build:distances` rebuilds it; run it after adding or moving places. The road figures come from a free routing server built on OpenStreetMap, asked region by region, which takes a minute or two. The script lists any place the server could not match to a road (a trekking camp, an island with no roads), and the driving times assume clear roads.

Where no journey is written, the site uses the driving time from that file. Failing that it estimates from the straight-line distance (by road under 500 km, by plane beyond) and labels it an estimate. Each journey also links to Rome2Rio for the full options; nothing is taken from Rome2Rio.

## Airports and flights

`docs/data/airports.json` holds two things: every airport in the world with scheduled flights and a three-letter code (about 4,000), and the airports for each place, which are the nearest with scheduled flights and the nearest large one if that is another. `npm run build:airports` rebuilds it from [OurAirports](https://ourairports.com/data/); run it after adding or moving places, and now and then to pick up new and closed airports. Distances to an airport are straight lines.

Every airport is on the map as a small diamond. They come into view as the map is zoomed in: large airports first, then medium ones, then airstrips. Pointing at one, or tapping it, gives its name and code.

A place's airports are shown under it in a guide and on the guide pages. In a trip:

- An estimated flight is timed between the two places' airports and names them: "Amman (AMM) to Hanoi (HAN)". It is still an estimate. The site does not know which airlines fly where, so it cannot say whether the flight is direct or exists at all.
- Every journey by plane, written or estimated, gets a "Search flights" link, which opens a Google Flights search between the two airports on the day of travel.
- Two places that share an airport are never offered a flight between them.

The nearest airport is not always the right one. To choose it yourself, add `"airport": "AMM"` to the place in `guides.json` with the airport's three-letter code, and rebuild. That airport then goes first, and is the one flights are timed and searched from. The script also lists any place whose nearest airport is in another country, which are the ones most worth checking.

`DECIDE-LATER.md` lists what has been left out for now: real flight routes, prices, and what changes if part of the site is put behind a paywall.

## Settings

`docs/data/site.json`:

| Setting | What it does |
|---|---|
| `currency` | The currency for budgets. |
| `contactEmail` | Adds an "Ask for help with this trip" button to the planner, which opens an email containing the visitor's trip, and the same offer to each guide page. |
| `url` | The site's full address, e.g. `https://example.com/`. Needed for the sitemap. |
| `partners` | Booking links added to every place automatically (see Earning from the site). |
| `planning` | The paid planning offer: `label` renames the button, `text` is a line shown with it, `page` sends the button to a page on this site (`"plan/"`), and `url` sends it to an outside booking or payment page instead (`https://` only). With neither, it opens an email to `contactEmail`. |

## Earning from the site

**Booking links.** Join an affiliate programme (places to stay, tours, car hire, insurance), then add its link in one of two ways:

- For every place at once, as a partner in `site.json`. The address is a search link from the programme with gaps the site fills in: `{place}` ("Petra, Jordan"), `{country}`, and, inside a trip, `{checkin}`, `{checkout}` (as `2027-03-10`) and `{travellers}`. For example `{ "label": "Places to stay", "url": "https://partner.example/search?q={place}&checkin={checkin}&checkout={checkout}&ref=YOUR-ID" }`. Take the real address format from the programme: each has its own.
- For one place or one country, as `links` in its guide: a specific tour, a hotel you'd recommend.

The links appear under each place in a guide, under each stop in a trip (with the trip's dates) and on the guide pages. Only `https://` links are shown. Wherever one appears, the page adds a line saying that some links earn a commission.

**Paid planning.** `docs/plan/` is the page that sells it: what's on a trip page, a live sample in a phone frame, prices, and a brief form. The planning button in the trip builder and on each guide goes there (`planning.page`). The form emails the brief to `contactEmail`; until that's set, it copies the answers and says bookings open soon. Prices are in `docs/plan/index.html` and `PRICES` in `docs/assets/plan.js`.

Trip pages are made with the `/travel-plan-client` skill, which writes each client's page to `docs/c/<slug>/` (not listed by search engines, and found only through its link). Samples are in `docs/plan/samples/`. Client briefs and the log are in `business/clients/`, which git ignores: keep it that way, since it holds names and email addresses. Marketplace copy is in `business/listings.md`.

## Guide pages

`npm run build:pages` writes a plain page for each guide into `docs/guides/` (`docs/guides/jordan/`), plus a list of them all. These are what search engines read and what you link to from elsewhere; the map can't be read that way. Run it after changing `guides.json` or `site.json`, and after `npm run build:airports`. The folder is rebuilt from scratch each time, so don't edit it by hand.

A guide marked `"status": "draft"` gets a page that asks search engines to leave it out. Remove the status to publish it. With `url` set in `site.json`, the script also writes `docs/sitemap.xml` listing the finished guides.

## Map and country data

`npm install && npm run build:data` regenerates `docs/data/world.json`, `docs/data/countries.json` and the two libraries in `docs/assets/lib/`. You only need this to update the underlying data.

Some shapes are changed from the source map, all at the top of `scripts/build-data.mjs`:

- Gaza (`XGZ`) and the West Bank (`XWB`) are listed separately in place of Palestine. Their facts are written there too.
- Territories the source draws as part of another country get a shape of their own: French Guiana, Guadeloupe, Martinique, Réunion, Mayotte, Caribbean Netherlands, Svalbard and Jan Mayen, Tokelau, Christmas Island and the Cocos (Keeling) Islands.
- Western Sahara is drawn as the whole territory up to 27°40'N rather than only the strip east of the Moroccan wall.

Road distances and driving times are from [OSRM](https://project-osrm.org) using © OpenStreetMap contributors data (ODbL). Airports are from [OurAirports](https://ourairports.com/data/) (public domain). Map shapes are from Natural Earth via [world-atlas](https://github.com/topojson/world-atlas). Country facts are from [mledoze/countries](https://github.com/mledoze/countries) (ODbL). The libraries are [D3](https://d3js.org) and topojson-client (both ISC).

## Countries split into states

Australia, Canada, the United Kingdom and the United States are drawn state by state (for the UK: England, Scotland, Wales and Northern Ireland). Each state has its own entry and can have its own guide. The country keeps its entry and its guide too: it comes up in search and lists its states, and a state without a guide links to the country's.

Two countries are split more loosely. Indonesia is drawn as Java, Sumatra, Bali, Nusa Tenggara, Sulawesi and Indonesian Borneo (`ID-JW`, `ID-SM`, `ID-BA`, `ID-NU`, `ID-SL`, `ID-KA`), each made of several provinces joined together; Maluku and Papua stay as Indonesia. Malaysia has Malaysian Borneo (`MY-EM`) split off, and the peninsula stays as Malaysia.

Some islands are split off their country the same way, and are listed on the country's page: Mallorca (`ES-MLL`), Ibiza (`ES-IBZ`), each of the seven Canary Islands (such as `ES-TEN` for Tenerife), the Azores (`PT-20`), Madeira (`PT-30`), Sardinia (`IT-88`), Sicily (`IT-82`) and Corsica (`FR-20R`). These are set up in `extras` and `splits` in `scripts/build-data.mjs`.

To split up another country:

1. `node scripts/fetch-states.mjs BRA` saves its state outlines to `scripts/states/`. Natural Earth has states at the map's level of detail for Australia, Brazil, Canada, China, India, Indonesia, Russia, South Africa and the USA, and larger parts for a few others, such as the UK.
2. Add the country to `states` in `scripts/build-data.mjs`, with each state's code and capital. States can also be joined into larger areas there, as Indonesia's are.
3. `npm run build:data`.
