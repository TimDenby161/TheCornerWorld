# Security

## Reporting a problem

Please report security issues privately through
[GitHub's private vulnerability reporting](https://github.com/TimDenby161/TheCornerWorld/security/advisories/new),
not in a public issue. Say what's affected (a page on thecornerworld.com, a client trip page, or
this repository) and how to reproduce it. This is a one-person project, so expect a reply within
about a week.

A wrong score, weather figure or fact about a country isn't a security issue: open a normal
[issue](https://github.com/TimDenby161/TheCornerWorld/issues/new).

## What there is to protect

The site is static files in `docs/`, served by GitHub Pages. It has no server, no accounts, no
cookies and no database, and a visitor's browser talks only to thecornerworld.com: every page
carries a Content-Security-Policy that allows nothing from another site, and `npm run check`
fails if a page loads or sends anything elsewhere.

| What | Where | How it's protected |
|---|---|---|
| Client trip pages | `docs/c/<slug>/` | Published only encrypted (AES-256-GCM, key from the client's password by PBKDF2-SHA256, 600,000 rounds). Without the password `trip.lock` is noise. `npm run check` fails if anything readable is in `docs/c/` |
| Client briefs, names and email addresses | `business/clients/` | Never committed (`.gitignore`), never published |
| Secrets | `.env` (local only, gitignored) | Nothing secret is in the repository or sent to the browser |
| Third-party code | `docs/assets/lib/` (D3, topojson-client) | Copied from npm; `npm run check` fails if a copy differs from the installed package |

Every push and pull request runs `npm run check` (`.github/workflows/check.yml`), with no secrets.
