# The Corner World

An interactive globe that scores every country out of 10, at https://thecornerworld.com/. A static site in `docs/`, served by GitHub Pages from the `main` branch: no outside requests. The domain is registered with GoDaddy, whose DNS points it at GitHub (four A records for `@` to 185.199.108–111.153, and `www` as a CNAME to `timdenby161.github.io`); `docs/CNAME` names it, and the repository's Pages settings enforce HTTPS. The site's address is `url` in `docs/data/site.json`. The usual build step is `npm run build:pages` after editing a guide.

## Run it

```bash
npm run serve        # then open http://localhost:8000
```

`npm run serve` can only be reached from this computer. To try the site on a phone on the same Wi-Fi, use `npm run serve:phone` and open `http://<this computer's address>:8000` on the phone. While that runs, anyone on the network can read everything in `docs/`, so use it at home and stop it afterwards.

## Before you publish

```bash
npm run build:version   # after changing anything in docs/assets/ or a trip page's files
npm run check           # looks for mistakes; changes nothing
```

`build:version` puts a version on every script and stylesheet address in every page (`app.js?v=3f9c2a1b`). The version is a fingerprint of the file, so a visitor's browser fetches a file again exactly when it has changed, and a page never runs with an old copy of its own code. `npm run build:pages` does this too.

`check` fails, and says why, if a page is missing the security policy or has script written into it, if anything loads from another site or a page may talk to anywhere it shouldn't, if an email address has got into `docs/`, if the copies of D3 and topojson differ from the ones npm installed, if a data file or script doesn't parse, or if a page's versions are out of date. It then tests the globe without a browser (`scripts/test-globe.mjs`): that a flick or a zoom redraws the map once per screen refresh, and that countries are drawn where D3 puts them.

## The map page

`docs/index.html` is a globe that fills the window, with the countries and their scores in a panel over it. On a phone the panel is a sheet that pulls up from the bottom.

- `docs/assets/globe.js` draws the map and handles dragging, zooming and flying from place to place. It knows nothing about scores or trips.
- `docs/assets/app.js` is the country list, the filters and the country panels. It tells the globe what to colour and hears what was clicked.
- `docs/assets/home.css` is the page's look. The map's colours are the `--g-*` values at the top, one set for light and one for dark. The dark set is written out twice, as in `styles.css`.

On the map a visitor can drag to spin, scroll or pinch to zoom, click a country, and switch between the globe and a flat map. "Surprise me" spins to a country at random (one that matches the filters, if any are on). Pointing at a country in the list turns the globe to it.

The map is drawn at four levels of detail so that it moves smoothly: full detail close in, and three thinned copies of the shapes from further out (the coarsest is what a phone shows of the whole globe). The copies are made in the browser from `world.json` as the page loads, so nothing needs rebuilding when the map data changes.

The whole map is redrawn on every frame while it moves, so how long one redraw takes decides how smooth it is. D3 can draw any shape in any view but is too slow for that, so `globe.js` does its own drawing for the globe and for the flat map (`trace` and the functions after it) and leaves D3 the second in which one turns into the other. `npm run check` compares the two.

## Scores, filters and the country list

The map colours every country by its score out of 10, red for the lowest to green for the highest. Each country is scored 1 to 10 for Food, Activities, Budget friendly, Family friendly and Safety, and for eight interests, Beaches, History, Wildlife, Hiking, Relax, Skiing, Culture and Nightlife. Its overall score is the average of six numbers: the five categories and its best interest, so a country is judged by what it does best rather than marked down for having no coast. The scores are in `docs/data/ratings.json`, one country to a line: its five category scores, then its five interest scores. A state or island with none of its own takes its country's. To change them, run `npm run rate`: a page on your computer only (not published) where you pick a country, click a number for each, and it saves straight into the file. The first scores were drafts written by Claude; the page lists which ones you have checked. Where the colours change is `SCORE_STOPS` in `docs/assets/globe.js` and `--g-s1` to `--g-s4` in `docs/assets/home.css`.

**A good month is more than the weather.** The When filter counts a month as good for a place if its weather is Great, or if it is that place's season for something: the northern lights or the midnight sun (`also` in `scripts/weather-points.json`, e.g. Lofoten), or snow for a place with a Skiing score of 8 or more (December to March in the north, June to September in the south; with Skiing and a month both picked, the month must be in the ski season). Cards and the Weather tab say why. "Hot weather" keeps places with average highs of 27 °C or more in the month picked, or for at least four months of the year with none picked (`HOT` in `app.js`). The interests include Skiing, Culture and Nightlife.

**Regions are judged on their own.** Every state, island and travel region has its own scores, weather and card, and the When filter and the map judge each on its own months. Countries whose parts are good to visit at different times are split into travel regions (Lofoten and Oslo, Goa and Ladakh, Hokkaido and Okinawa); countries that are the same all over stay whole. The regions, and how the split was decided, are at the top of `scripts/fetch-regions.mjs`: run it, then `npm run build:data`, `npm run build:weather` and score the new regions with `npm run rate`. A region shows its main town rather than a capital.

**Budget includes the flights.** The Budget score in `ratings.json` is the cost once you're there. The Budget score shown is the average of that and a flight score worked out from the distance between the visitor's home and the place (`FLIGHT_STEPS` in `app.js`: 10 for a short hop, 2 for the other side of the world), so it changes the overall score, the map colours and the Budget filter too. Home is guessed from the browser's time zone (`ZONES`), because looking up an IP address would mean contacting another site, and the site makes no outside requests. Visitors change it with "Flying from" at the top of Discover, and the browser remembers their choice. Big countries are measured from their main airport city (`HUBS`), not their middle. A country's panel shows the breakdown under its scores.

Below the heading on Discover are the filters, then every scored country (not states and islands) as a card with its score, sorted Top rated or A to Z. The filters: Where (continent), When (months the weather data rates Great), Great for and Interests (a score of 8 or more in that category or interest, `GREAT` in `app.js`; choosing several keeps countries that have them all) and a box that narrows the list by country name. With a filter on, countries that don't match go grey on the map. A country's panel shows all ten scores as bars.

Every country, state and island that opens on the map shows a "Top 3 things to do" list near the top of its panel, and the first three show on its card. The lists are in `docs/data/activities.json`, keyed by the country codes in `countries.json`: three short lines each, written by hand. A code with no entry shows no list.

A country's panel has three tabs: Things to do, Weather and Travel advice. The Weather tab rates every month Great, Okay or Bad, with the average high and low and the rain. The figures are in `docs/data/weather.json`, built by `npm run build:weather` from NASA POWER's daily readings for 2015–2024, corrected for height. The rules for each rating are at the top of `scripts/build-weather.mjs`.

There used to be destination guides and a trip planner (removed in November 2026; they are in the git history). The weather for 109 countries is taken at a place they named, with their best months: those are kept in `scripts/weather-points.json` for `npm run build:weather`.

## Place pages and the share card

`npm run build:pages` also writes a page for every place with its own scores, at `docs/places/<slug>/` (and an index at `docs/places/`): the best time to visit with the weather month by month, the top three things to do, the scores (before flights, which only the map can add), facts, areas and the UK travel advice, with a link that opens the place on the globe (`#c=JPN`). They are in the sitemap, so search engines find them. A region's address carries its country's name (`spain-andalusia`). The trader's address stays on the privacy and terms pages only.

Every page shares as `docs/assets/share.png`: the real globe coloured by score. Redraw it after big score changes with `npm run build:card` (needs Google Chrome).

## Settings

`docs/data/site.json`:

| Setting | What it does |
|---|---|
| `contactEmail` | Where the planning page's brief form sends to, and the contact address in the privacy notice. |
| `url` | The site's full address, e.g. `https://example.com/`. Needed for the sitemap. |
| `partners` | Booking links added to every country automatically (see Earning from the site). |

## Earning from the site

**Booking links.** Join an affiliate programme (places to stay, tours, car hire, insurance), then add its link:

As a partner in `site.json`. The address is a search link from the programme with gaps the site fills in with the country's name: `{place}` or `{country}`. For example `{ "label": "Places to stay", "url": "https://partner.example/search?q={country}&ref=YOUR-ID" }`. Take the real address format from the programme: each has its own.

The links appear under "Book it" on a country's Travel advice tab. Only `https://` links are shown. Wherever one appears, the page adds a line saying that some links earn a commission.

**Paid planning.** `docs/plan/` is the page that sells it: what's on a trip page, a live sample in a phone frame, prices, and a brief form. The form emails the brief to `contactEmail`; until that's set, it copies the answers and says bookings open soon. Prices are in `docs/plan/index.html` and `PRICES` in `docs/assets/plan.js`.

Trip pages are made with the `/travel-plan-client` skill, and the rest (questions, payment, delivery, changes) is done by email. A client's page is published **locked with a password**: `npm run lock -- <slug>` turns `business/clients/<slug>/trip.html` into `docs/c/<slug>/`, which holds only a password box (`index.html`) and the trip scrambled (`trip.lock`, AES-256-GCM with a key made from the password by PBKDF2-SHA256, 600,000 rounds). It prints the link and the password to email to the client; the password is kept in `business/clients/<slug>/password.txt`, so rebuilding after changes keeps it (delete that file for a new one). The client types it once and their browser remembers it. The repository is public, so this is what keeps a client's trip private: without the password, `trip.lock` is noise. `npm run check` fails if anything readable is in `docs/c/`. Samples are in `docs/plan/samples/`. Client briefs and the log are in `business/clients/`, which git ignores: keep it that way, since it holds names and email addresses. Marketplace copy is in `business/listings.md`.

## Privacy, terms and sitemap

`npm run build:pages` writes the privacy notice and terms (`docs/privacy/`, `docs/terms/`), the footers of the planning and sample pages, and, with `url` set in `site.json`, `docs/sitemap.xml`. Run it after changing `site.json`.

## Map and country data

`npm install && npm run build:data` regenerates `docs/data/world.json`, `docs/data/countries.json` and the two libraries in `docs/assets/lib/`. You only need this to update the underlying data.

Some shapes are changed from the source map, all at the top of `scripts/build-data.mjs`:

- Gaza (`XGZ`) and the West Bank (`XWB`) are listed separately in place of Palestine. Their facts are written there too.
- Territories the source draws as part of another country get a shape of their own: French Guiana, Guadeloupe, Martinique, Réunion, Mayotte, Caribbean Netherlands, Svalbard and Jan Mayen, Tokelau, Christmas Island and the Cocos (Keeling) Islands.
- Western Sahara is drawn as the whole territory up to 27°40'N rather than only the strip east of the Moroccan wall.

Weather figures are from [NASA POWER](https://power.larc.nasa.gov). Map shapes are from Natural Earth via [world-atlas](https://github.com/topojson/world-atlas). Country facts are from [mledoze/countries](https://github.com/mledoze/countries) (ODbL). The libraries are [D3](https://d3js.org) and topojson-client (both ISC).

## Countries split into states

Australia, Canada, the United Kingdom and the United States are drawn state by state (for the UK: England, Scotland, Wales and Northern Ireland). Each state has its own entry and can have its own scores; one without takes its country's. The country keeps its entry and lists its states under "Explore by area".

Two countries are split more loosely. Indonesia is drawn as Java, Sumatra, Bali, Nusa Tenggara, Sulawesi and Indonesian Borneo (`ID-JW`, `ID-SM`, `ID-BA`, `ID-NU`, `ID-SL`, `ID-KA`), each made of several provinces joined together; Maluku and Papua stay as Indonesia. Malaysia has Malaysian Borneo (`MY-EM`) split off, and the peninsula stays as Malaysia.

Some islands are split off their country the same way, and are listed on the country's page: Mallorca (`ES-MLL`), Ibiza (`ES-IBZ`), each of the seven Canary Islands (such as `ES-TEN` for Tenerife), the Azores (`PT-20`), Madeira (`PT-30`), Sardinia (`IT-88`), Sicily (`IT-82`) and Corsica (`FR-20R`). These are set up in `extras` and `splits` in `scripts/build-data.mjs`.

To split up another country:

1. `node scripts/fetch-states.mjs BRA` saves its state outlines to `scripts/states/`. Natural Earth has states at the map's level of detail for Australia, Brazil, Canada, China, India, Indonesia, Russia, South Africa and the USA, and larger parts for a few others, such as the UK.
2. Add the country to `states` in `scripts/build-data.mjs`, with each state's code and capital. States can also be joined into larger areas there, as Indonesia's are.
3. `npm run build:data`.
