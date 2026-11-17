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

`check` fails, and says why, if a page is missing the security policy or has script written into it, if anything loads from another site or a page may talk to anywhere it shouldn't, if an email address or a secret key has got into `docs/`, if the copies of D3, topojson and Supabase's library differ from the ones npm installed, if a data file or script doesn't parse, or if a page's versions are out of date. It then tests the globe without a browser (`scripts/test-globe.mjs`): that a flick or a zoom redraws the map once per screen refresh, and that countries are drawn where D3 puts them.

## The map page

`docs/index.html` is a globe that fills the window, with the countries and their scores in a panel over it. On a phone the panel is a sheet that pulls up from the bottom.

- `docs/assets/globe.js` draws the map and handles dragging, zooming and flying from place to place. It knows nothing about scores or trips.
- `docs/assets/app.js` is the country list, the filters, the country panels and the trip planner (switched off). It tells the globe what to colour and hears what was clicked.
- `docs/assets/home.css` is the page's look. The map's colours are the `--g-*` values at the top, one set for light and one for dark. The dark set is written out twice, as in `styles.css`.

On the map a visitor can drag to spin, scroll or pinch to zoom, click a country or place, and switch between the globe and a flat map. "Surprise me" spins to a country at random (one that matches the filters, if any are on). Pointing at a country in the list turns the globe to it. In My trip, "Play route" flies along the stops in order, and a stop can be dragged to a new position with a mouse.

The map is drawn at four levels of detail so that it moves smoothly: full detail close in, and three thinned copies of the shapes from further out (the coarsest is what a phone shows of the whole globe). The copies are made in the browser from `world.json` as the page loads, so nothing needs rebuilding when the map data changes.

The whole map is redrawn on every frame while it moves, so how long one redraw takes decides how smooth it is. D3 can draw any shape in any view but is too slow for that, so `globe.js` does its own drawing for the globe and for the flat map (`trace` and the functions after it) and leaves D3 the second in which one turns into the other. `npm run check` compares the two.

## Scores, filters and the country list

Every country, state and island that opens on the map shows a "Top 3 things to do" list near the top of its panel, and the first three show on its card. The lists are in `docs/data/activities.json`, keyed by the country codes in `countries.json`: three short lines each, written by hand. A code with no entry shows no list.

A country's panel has three tabs: Things to do, Weather and Travel advice. The Weather tab rates every month Great, Okay or Bad, with the average high and low and the rain. The figures are in `docs/data/weather.json`, built by `npm run build:weather` from NASA POWER's daily readings for 2015–2024, corrected for height. The rules for each rating are at the top of `scripts/build-weather.mjs`. The trip planner is switched off for now (`TRIP_PLANNER` in `docs/assets/app.js`).

There used to be destination guides (`docs/guides/`, removed in November 2026). `docs/data/guides.json` is kept only as the trip planner's places and routes, and the site doesn't load it while the planner is off. After adding or moving places in it, run `npm run build:distances` and `npm run build:airports`.

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

Airports are not drawn on the map. In a trip:

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
| `contactEmail` | Adds an "Ask for help with this trip" button to the planner, which opens an email containing the visitor's trip. |
| `url` | The site's full address, e.g. `https://example.com/`. Needed for the sitemap. |
| `partners` | Booking links added to every place automatically (see Earning from the site). |
| `accounts` | The Supabase project that sign-in uses: its `url` and publishable `key`. Set it with `npm run accounts`, not by hand, so the pages are updated to match (see Accounts and sign-in). |
| `planning` | The paid planning offer: `label` renames the button, `text` is a line shown with it, `page` sends the button to a page on this site (`"plan/"`), and `url` sends it to an outside booking or payment page instead (`https://` only). With neither, it opens an email to `contactEmail`. |

## Earning from the site

**Booking links.** Join an affiliate programme (places to stay, tours, car hire, insurance), then add its link in one of two ways:

- For every place at once, as a partner in `site.json`. The address is a search link from the programme with gaps the site fills in: `{place}` ("Petra, Jordan"), `{country}`, and, inside a trip, `{checkin}`, `{checkout}` (as `2027-03-10`) and `{travellers}`. For example `{ "label": "Places to stay", "url": "https://partner.example/search?q={place}&checkin={checkin}&checkout={checkout}&ref=YOUR-ID" }`. Take the real address format from the programme: each has its own.
- For one place or one country, as `links` in its guide: a specific tour, a hotel you'd recommend.

The links appear under "Book it" on a country's Travel advice tab (the country-wide partner links) and under each stop in a trip (with the trip's dates). Only `https://` links are shown. Wherever one appears, the page adds a line saying that some links earn a commission.

**Paid planning.** `docs/plan/` is the page that sells it: what's on a trip page, a live sample in a phone frame, prices, and a brief form. The planning button in the trip builder goes there (`planning.page`). The form emails the brief to `contactEmail`; until that's set, it copies the answers and says bookings open soon. Prices are in `docs/plan/index.html` and `PRICES` in `docs/assets/plan.js`.

Trip pages are made with the `/travel-plan-client` skill, and the rest (questions, payment, delivery, changes) is done by email. A client's page is published **locked with a password**: `npm run lock -- <slug>` turns `business/clients/<slug>/trip.html` into `docs/c/<slug>/`, which holds only a password box (`index.html`) and the trip scrambled (`trip.lock`, AES-256-GCM with a key made from the password by PBKDF2-SHA256, 600,000 rounds). It prints the link and the password to email to the client; the password is kept in `business/clients/<slug>/password.txt`, so rebuilding after changes keeps it (delete that file for a new one). The client types it once and their browser remembers it. The repository is public, so this is what keeps a client's trip private: without the password, `trip.lock` is noise. `npm run check` fails if anything readable is in `docs/c/`. (Once accounts are on, a page can instead be published at `admin/`; see Accounts and sign-in.) Samples are in `docs/plan/samples/`. Client briefs and the log are in `business/clients/`, which git ignores: keep it that way, since it holds names and email addresses. Marketplace copy is in `business/listings.md`.

## Accounts and sign-in

People can sign in with Google. An account does three things:

- **A visitor's trip follows them.** The trip built on the map is saved to the account as well as the browser, so it is there on their phone and their laptop. Signing out takes it off that browser.
- **A client opens their trip page.** A paid trip page is kept in the database, not in `docs/`, and only the email addresses you list for it can open it, at `trip/`.
- **You manage client trips** at `admin/`: make a trip, list who can open it, publish the page.

Accounts are kept in a [Supabase](https://supabase.com) project. The site is still static: a signed-in page talks straight to the database from the browser. **Until the steps under "Switching it on" are done, accounts are off** and the site works as it did before, with no Sign in button.

### How it is kept safe

A browser can be made to send anything, so nothing in `docs/` decides who may see what. The database does, with the rules in `supabase/migrations/`:

- Every table has row level security. Someone who hasn't signed in can read and change nothing. A visitor can reach only their own trip. A client trip and its page can be read only by an account whose email address is on that trip's list, and only once the account has proved it owns the address (Google vouches for it). Only an admin can write a client trip, its list or its page.
- Who is an admin is a table (`private.admins`) in a part of the database the site cannot reach at all. You add yourself by hand, once (step 6 below). Nothing on the site can add an admin.
- `npm run test:db` proves the rules: 46 tests that sign in as a visitor, a client, an impostor and an admin and check what each is allowed and refused.
- Sign-in uses PKCE: Google's answer comes back as a one-use code only that browser can redeem. There are no passwords.
- The site holds the project's address and its **publishable** key, which are public by design. The **secret** key must never be in this repository or in `docs/`; `npm run accounts` refuses it and `npm run check` fails if it finds one.
- A page with sign-in may talk to this site and the Supabase project, and nowhere else (its security policy says so, and `npm run check` checks it). `trip/` may also run a script from memory (`blob:`), which is how a client's trip page runs after the database hands it over; nothing written into a page can use that.
- Anyone can delete their own account, and the trip saved to it, from the account button on the map. `privacy/` says what is kept; it is written by `scripts/build-pages.mjs`, so change it there if what accounts store changes.

Two limits worth knowing:

- The session is kept in the browser's storage for thecornerworld.com. The site has its own domain, so no other site (including your other GitHub Pages sites on `timdenby161.github.io`) can read it.
- A client's trip page needs a connection to open, since it comes from the database each time. The choices they make on it are still saved on their device.

### Switching it on

1. **Make the Supabase project.** Name it The Corner World, in **West EU (Ireland)**: the privacy page says Ireland. The free plan allows two active projects, so pause one or move to a paid plan.
2. **Create its tables and rules.** `supabase link --project-ref <the project's ref>` and then `supabase db push`. Linking also makes the copy on this computer use the same Postgres version as the real project.
3. **Make a Google sign-in client.** In Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application. Authorised JavaScript origin: `https://thecornerworld.com`. Authorised redirect URI: `https://<ref>.supabase.co/auth/v1/callback`. On the consent screen give the site's name, your email, and `https://thecornerworld.com/privacy/` as the privacy policy; then publish it, or only the test users you list can sign in.
4. **Tell Supabase about it**, in the dashboard under Authentication:
   - Providers → Google: on, with the client ID and client secret from step 3.
   - Providers → Email: **off**. (Sign-in is Google only. A trip page opens for whoever proves they own an address, and Google is what proves it.)
   - Anonymous sign-ins: off. "Allow new users to sign up": on.
   - URL Configuration → Site URL: `https://thecornerworld.com/`. Redirect URLs: `https://thecornerworld.com/trip/` and `https://thecornerworld.com/admin/`. No wildcards.
5. **Tell the site about the project.** `npm run accounts -- https://<ref>.supabase.co <publishable key>` (the key is under Project Settings → API keys and starts `sb_publishable_`). Set `contactEmail` in `docs/data/site.json` too, so the privacy page says how to reach you, then `npm run build:pages`, `npm run check`, commit and push.
6. **Make yourself the admin.** Sign in on the site once, then in the Supabase SQL editor: `insert into private.admins (user_id) select id from auth.users where email = '<your Google address>';`
7. **Ask Supabase to check it.** Dashboard → Advisors → Security should list nothing.

`npm run accounts -- off` switches accounts off again across the site.

### Client trip pages

Once accounts are on, a client's page is published at `admin/` rather than written into `docs/c/`: make the trip, add the client's email address (the one on their Google account), and choose the finished `trip.html` from `business/clients/<slug>/`. Send the client `https://thecornerworld.com/trip/`: they sign in and their page opens. To change a page, publish the new file over the old one. To take someone's access away, remove their address.

### Working on it

```bash
npm run db:start     # a copy of the database on this computer (Docker must be running)
npm run test:db      # the access-rule tests
npm run db:stop
```

A change to the tables or rules is a new file in `supabase/migrations/`, a test for it in `supabase/tests/database/`, and `supabase db push` once the tests pass. If `npm run test:db` loses its connection part-way, the local copy is on an old Postgres image with a fault: `supabase link` (step 2) fixes it.

## Privacy, terms and sitemap

`npm run build:pages` writes the privacy notice and terms (`docs/privacy/`, `docs/terms/`), the footers of the planning and sample pages, and, with `url` set in `site.json`, `docs/sitemap.xml`. Run it after changing `site.json`.

## Map and country data

`npm install && npm run build:data` regenerates `docs/data/world.json`, `docs/data/countries.json` and the two libraries in `docs/assets/lib/`. You only need this to update the underlying data.

Some shapes are changed from the source map, all at the top of `scripts/build-data.mjs`:

- Gaza (`XGZ`) and the West Bank (`XWB`) are listed separately in place of Palestine. Their facts are written there too.
- Territories the source draws as part of another country get a shape of their own: French Guiana, Guadeloupe, Martinique, Réunion, Mayotte, Caribbean Netherlands, Svalbard and Jan Mayen, Tokelau, Christmas Island and the Cocos (Keeling) Islands.
- Western Sahara is drawn as the whole territory up to 27°40'N rather than only the strip east of the Moroccan wall.

Road distances and driving times are from [OSRM](https://project-osrm.org) using © OpenStreetMap contributors data (ODbL). Airports are from [OurAirports](https://ourairports.com/data/) (public domain). Map shapes are from Natural Earth via [world-atlas](https://github.com/topojson/world-atlas). Country facts are from [mledoze/countries](https://github.com/mledoze/countries) (ODbL). The libraries are [D3](https://d3js.org) and topojson-client (both ISC).

## Countries split into states

Australia, Canada, the United Kingdom and the United States are drawn state by state (for the UK: England, Scotland, Wales and Northern Ireland). Each state has its own entry and can have its own scores; one without takes its country's. The country keeps its entry and lists its states under "Explore by area".

Two countries are split more loosely. Indonesia is drawn as Java, Sumatra, Bali, Nusa Tenggara, Sulawesi and Indonesian Borneo (`ID-JW`, `ID-SM`, `ID-BA`, `ID-NU`, `ID-SL`, `ID-KA`), each made of several provinces joined together; Maluku and Papua stay as Indonesia. Malaysia has Malaysian Borneo (`MY-EM`) split off, and the peninsula stays as Malaysia.

Some islands are split off their country the same way, and are listed on the country's page: Mallorca (`ES-MLL`), Ibiza (`ES-IBZ`), each of the seven Canary Islands (such as `ES-TEN` for Tenerife), the Azores (`PT-20`), Madeira (`PT-30`), Sardinia (`IT-88`), Sicily (`IT-82`) and Corsica (`FR-20R`). These are set up in `extras` and `splits` in `scripts/build-data.mjs`.

To split up another country:

1. `node scripts/fetch-states.mjs BRA` saves its state outlines to `scripts/states/`. Natural Earth has states at the map's level of detail for Australia, Brazil, Canada, China, India, Indonesia, Russia, South Africa and the USA, and larger parts for a few others, such as the UK.
2. Add the country to `states` in `scripts/build-data.mjs`, with each state's code and capital. States can also be joined into larger areas there, as Indonesia's are.
3. `npm run build:data`.
