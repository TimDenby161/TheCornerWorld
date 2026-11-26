# The Corner World

An interactive globe that scores every country out of 10, at thecornerworld.com, plus paid trip
planning. Static site in `docs/`, served by GitHub Pages from `main`. This repository is public.
`README.md` explains every part; read the section the work touches.

## Commands

```bash
npm run serve          # http://localhost:8000 (this computer only)
npm run build:pages    # after editing site.json, a guide, privacy or terms
npm run build:version  # after changing docs/assets/ or a trip page's files
npm run check          # must pass before every commit; CI runs it on every push
```

## Rules that matter

- **No outside requests.** No script, font, image, analytics or form posts to another site. The
  CSP on each page enforces it and `npm run check` tests it. Links out are fine.
- **Client data stays private.** `business/clients/` is gitignored: never commit it, copy from
  it into `docs/`, or quote it in a commit message. A client's trip is published only locked
  (`npm run lock -- <slug>`).
- **No email addresses written into pages**; `check` looks for them. The contact address lives
  only in `site.json`.
- **Scores are judgements**, written by hand in `docs/data/ratings.json` through `npm run rate`.
  Don't present a draft score as checked.
- **Library copies** in `docs/assets/lib/` come from npm by `npm run build:data`, never edited.
- **After any change to assets**, run `build:version` so browsers fetch the new file.
- Paid trip pages are made with the `/travel-plan-client` skill.
