# QA Report - VolleyOS Global v5.0.0

Date: 2026-10-22
Environment: Windows 11, Python 3.14.3 (backend venv), Node 24.15.0, npm 12.0.2,
Next.js 15.1.6, Docker 29.5.3 (daemon unavailable).

## Gates

| Gate | Command | Result |
| --- | --- | --- |
| Backend tests | `.venv\Scripts\python -m pytest` | 370 passed |
| Backend lint | `.venv\Scripts\python -m ruff check app tests` | 0 findings |
| Backend types | `.venv\Scripts\python -m mypy --strict app` | 0 errors, 49 files |
| Frontend types | `npm run typecheck` | 0 errors |
| Frontend tests | `npm run test` | 62 passed (12 files) |
| Frontend build | `npm run build` | 215 static pages, 0 errors |
| Contracts | `float` in `backend/app/` | 0 matches |
| Contracts | `: any` in `frontend/src/` | 0 matches |

## Live end-to-end (32/32)

`scripts/e2e_check.py` against `uvicorn` on :8000 and `next start` on :3000:

- API root and privacy/security headers: no-store, nosniff, SAMEORIGIN,
  no-referrer, CSP and Permissions-Policy.
- Deep health reports 36/36 engines and version 5.0.0.
- Catalog reports 36 modules, 6 profiles and 3 pricing tiers.
- Biomechanics demo returns 5 frame verdicts.
- All 36 module demos return HTTP 200.
- Live room lifecycle: create -> public read -> PATCH 403 without token ->
  token update with seal change -> signed delete receipt.
- Seal verification rejects an invalid HMAC seal.
- A 256 KiB+ mutation is rejected with 413.
- Job lifecycle: create -> preview locked -> download 402 -> bad HMAC 401 ->
  signed webhook 200 -> XLSX (PK zip, correct MIME) -> CSV -> delete receipt
  (64-char HMAC) -> 404 afterwards.
- Web: ES/EN/PT homes, security headers, 36 rendered stations, scouting SEO page
  with FAQPage JSON-LD, privacy page, overlay `noindex`, sitemap (205 URLs),
  robots with sitemap.

## Security shield

- Pydantic `extra="forbid"` and whitespace stripping at trust boundaries.
- 256 KiB body cap -> 413; 120 mutations/minute/IP -> 429 with `Retry-After`.
- XSS/HTML/control-character sanitisation before engines and exports.
- CSV/XLSX formula-injection protection for `= + - @`, tab and carriage return.
- HMAC-SHA256 payment webhooks, delete receipts and canonical-JSON integrity
  seals; constant-time comparison for seals.
- API and web responses set CSP, `nosniff`, `SAMEORIGIN`, `no-referrer` and a
  strict Permissions-Policy.

## Localization

- Spanish, English and Portuguese UI, module metadata, SEO pages, legal pages,
  fastlane metadata and README suite.
- Locale render tests cover all 36 stations in ES/EN/PT.
- FIVB terminology follows local usage (armador/setter/levantador,
  líbero/libero/líbero, punta/outside/ponteiro).

## Build output

- 3 locale homes, 15 section indexes, 174 guide pages (58 entries x 3 locales),
  12 legal pages, overlay, sitemap, robots and three static local live-room pages (ES/EN/PT).
- First Load JS: 105 kB shared, 159 kB home.
- All static routes prerendered; live rooms hydrate from the API and degrade to
  a trilingual offline message.

## Accessibility / UX

- Semantic `main`, `header`, `nav`, `footer`, FAQ `details`, ARIA `tablist` for
  profile filters.
- Skip link to stations, Ctrl+K module search, Escape clears the query,
  visible focus rings, `aria-current` on language switchers, persistent role
  selection, and an opt-in high-contrast class with stronger text/border colors.
- Color palette keeps >= 4.5:1 for body text on obsidian; metrics use large bold
  type.
- `prefers-reduced-motion` disables transitions and animations.
- Mobile-first grids: 1 column on phones, 2 on tablets, 3 on desktop.

## Privacy

- No analytics, ads, crash reporting, proprietary SDKs or telemetry.
- Vault uses localStorage only; destruction emits a local signed-style receipt.
- API responses are `no-store`; CORS wildcard without credentials.
- Legal pages cover AGPL, payments, retention, FIVB/health disclaimers and
  trademarks.

## Known limits

- Jobs and live rooms persist in SQLite WAL; back up `VOLLEYOS_DB_PATH` before
  deploys. Live rooms intentionally expose public reads and token-gated writes.
- No user authentication yet; admin tokens are per-room and HMAC-derived.
- Frontend engine stations remain fully local; only the live-room viewer calls
  the API. Cloud export UI is not wired to the HMAC job flow yet.
- Pricing CTAs open a local confirmation dialog and then `mailto:` until a
  checkout provider is configured.
- F-Droid APK wrapper is documented but not built; see
  `docs/FDROID_SUBMISSION_GUIDE.md`.
- Docker images were not built in this environment (daemon down); run
  `docker compose build && docker compose up` before publishing.
- SEO deliberately ships 52 curated entries instead of thin permutations.
