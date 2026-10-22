# HANDOFF - VolleyOS Global

## Sprint 0 - setup
- Monorepo scaffolded: `backend/`, `frontend/`, `fastlane/`, `docs/`, `.agents/skills/`.
- AGPL-3.0-or-later `LICENSE`, `THIRD_PARTY_LICENSES.md`, `AGENTS.md`.
- Backend venv installed, frontend dependencies installed.

## Sprint 1 - engines 1-6
- `biomechanics`, `rotation_validator`, `scouting_engine`, `scoreboard_engine`,
  `tournament_engine`, `pickup_balancer` + Decimal trigonometry in `mathx.py`.
- 98 tests green, ruff/mypy strict clean.

## Sprint 2 - engines 7-12 + Excel
- `obs_overlay`, `pocket_var`, `beach_engine`, `volleycard_generator`,
  `attack_tempo`, `jump_load_monitor`, `excel_exporter` (Resumen + Detalle tabs).
- 162 tests green.

## Sprint 3 - API
- 12-module dispatcher, demo payloads, catalog, deep health, HMAC paywall jobs,
  signed delete receipts, privacy headers, CORS wildcard, `docs/openapi.json`.
- 199 tests green, ruff/mypy strict clean.

## Sprint 4 - Command Center frontend
- TS mirrors of all 12 engines in `frontend/src/lib/local-engines.ts`; modules,
  samples, i18n (ES/EN/PT), ephemeral localStorage vault with signed-style receipt.
- `VolleyOSHub`: hero, profile filters, 12 interactive station cards (SVG court,
  radar hex, heatmap, OBS preview), Cloud Pro pricing, FOSS/Cloud badge,
  language switcher, privacy footer. `/overlay/tv` transparent OBS demo.
- 19 vitest tests green; `tsc --noEmit`, `next build` (SSG es/en/pt) pass; 0 `: any`.
- Root `/` renders the Spanish hub with canonical to `/es/` (redirect() broke SSG).

## Sprint 5 - legal pages
- `/es|en|pt/legal/{terms,privacy,disclaimer,trademarks}` (12 SSG routes).
- Content covers AGPL, HMAC paywall, ephemeral vault, Cloud data retention,
  FIVB/VAR/health disclaimers and third-party trademark attribution.
- 21 vitest tests green.

## Sprint 6 - F-Droid, PWA, store metadata
- PWA: 192/512/maskable icons + apple touch + favicon, installable manifest with
  shortcuts, offline service worker (shell precache, API bypass), auto-register.
- F-Droid: `.fdroid.yml` template, `docs/FDROID_SUBMISSION_GUIDE.md`, fastlane
  metadata (title/description/changelog) in en-US, es-ES, pt-BR, FUNDING.yml.
- 23 vitest tests green.

## Sprint 7 - SEO content layer
- 34 curated entries (12 modules, 6 positions, 4 rotation systems, 6 alternatives,
  6 tools) x 3 locales = 102 detail pages + 15 section indexes.
- `/[locale]/[section]/[slug]` with Article + FAQPage JSON-LD, breadcrumbs,
  canonical + hreflang, shared steps/FAQ, internal links.
- `sitemap.xml` (133 URLs) and `robots.txt`; overlay excluded from indexing.
- 25 vitest tests green; `next build` emits 140 static pages.
- Deliberate cut: no 180-page glossary permutation to avoid thin/duplicate SEO.

## Sprint 8 - deploy, Docker, live E2E
- `backend/Dockerfile` (python:3.13-slim, non-root uid 10001, deep-health check)
  and `frontend/Dockerfile` (node:24-alpine, 3 stages, non-root, `next start`).
- `docker-compose.yml` (8000/3000), `render.yaml` (both services),
  `run_local.bat` / `run_local.sh`, `.github/workflows/ci.yml`.
- `scripts/e2e_check.py`: 22 live checks covering health, 12-engine catalog,
  demo, privacy headers, full paywall (402 -> HMAC webhook -> XLSX/CSV ->
  signed delete receipt -> 404) and web routes/sitemap/robots/overlay noindex.
- `docs/QA_REPORT.md` with gates, E2E evidence, a11y notes, known limits.
- Gates: 202 backend tests, ruff/mypy clean, 25 frontend tests, 140 static pages.
- `next.config.ts`: `trailingSlash` + privacy headers; `standalone` removed so
  `next start` works on Render, Docker and bare Node.
- Docker images not built locally: Docker Desktop Linux engine was stopped.
  `docker compose config` validates; build before publishing.

Next: Sprint 9 (launch playbook, README, GitHub push, v1.0.0 tag).
