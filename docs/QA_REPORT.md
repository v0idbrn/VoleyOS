# QA Report — VolleyOS Global v1.0.0

Date: 2026-10-22
Environment: Windows 11, Python 3.14.3 (backend venv), Node 24.15.0, npm 12.0.2, Next.js 15.1.6, Docker 29.5.3 (daemon unavailable).

## Gates

| Gate | Command | Result |
| --- | --- | --- |
| Backend tests | `.venv\Scripts\python -m pytest -q` | 202 passed |
| Backend lint | `.venv\Scripts\python -m ruff check app tests` | 0 findings |
| Backend types | `.venv\Scripts\python -m mypy --strict app` | 0 errors, 22 files |
| Frontend types | `npm run typecheck` | 0 errors |
| Frontend tests | `npm run test` | 25 passed (6 files) |
| Frontend build | `npm run build` | 140 static pages, 0 errors |
| Contracts | `float` in `backend/app/` | 0 matches |
| Contracts | `: any` in `frontend/src/` | 0 matches |

## Live end-to-end (22/22)

`scripts/e2e_check.py` against `uvicorn` on :8000 and `next start` on :3000:

- API root, privacy headers (no-store, nosniff, DENY, no-referrer), deep health (12/12 engines).
- Catalog with 12 modules and 3 pricing tiers.
- Biomechanics demo returns 5 frame verdicts.
- Job lifecycle: create → preview locked → download 402 → bad HMAC 401 → signed webhook 200 → XLSX (PK zip, correct MIME) → CSV → delete receipt (64-char HMAC) → 404 afterwards.
- Web: ES/EN homes, scouting SEO page with FAQPage JSON-LD, privacy page, overlay `noindex`, sitemap 133 URLs, robots with sitemap, security headers.

## Build output

- 3 locale homes, 15 section indexes, 102 guide pages, 12 legal pages, overlay, sitemap, robots.
- First Load JS: 105 kB shared, 125 kB home.
- All routes prerendered; `next start` serves them without a database.

## Docker

- `docker compose config` validates.
- `docker compose build` not executed: Docker Desktop Linux engine was not running on this machine (`npipe:////./pipe/dockerDesktopLinuxEngine`).
- Images are multi-stage, non-root, backend has a healthcheck. Re-run `docker compose build && docker compose up` before publishing.

## Accessibility / UX

- Semantic `main`, `header`, `nav`, `footer`, FAQ `details`, ARIA `tablist` for profile filters.
- Skip link to stations, visible focus rings, `aria-current` on language switchers.
- Color palette keeps ≥ 4.5:1 for body text on obsidian; metrics use large bold type.
- `prefers-reduced-motion` disables transitions and animations.
- Mobile-first grids: 1 column on phones, 2 on tablets, 3 on desktop.

## Privacy

- No analytics, ads, crash reporting, proprietary SDKs or telemetry.
- Vault uses localStorage only; destruction emits a local HMAC-style receipt.
- API responses are `no-store`; CORS wildcard without credentials.
- Legal pages cover AGPL, payments, retention, FIVB/health disclaimers and trademarks.

## Known limits

- Jobs are in-memory by design; they vanish on API restart (`store.py` ponytail note).
- No authentication or rate limiting on the API: add before paid public traffic.
- Frontend stations are fully local and do not call the API; Cloud export UI is not wired to the HMAC job flow yet.
- Pricing CTAs use `mailto:` until a Stripe checkout link is configured.
- F-Droid APK wrapper is documented but not built; see `docs/FDROID_SUBMISSION_GUIDE.md`.
- Docker images were not built in this environment (daemon down).
- SEO deliberately ships 34 curated entries instead of 180 thin permutations.
