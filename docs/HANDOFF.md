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

## Sprint 9 - launch
- `docs/LAUNCH_PLAYBOOK.md`: preflight, Docker/Render deploy, DNS, Stripe HMAC
  bridge, F-Droid, privacy checks, launch checklist, rollback, monitoring.
- `README.md`: Docker quick start, API surface, docs index and v1.0.0 status.
- Skip link to stations for keyboard users; focus-visible styles preserved.
- Final gates: 202 backend tests, 25 frontend tests, 140 static pages.
- Published to https://github.com/v0idbrn/VoleyOS and tagged `v1.0.0`.

## Sprint 10 - engines 13-18
- `rules.py`: FIVB court/jump bounds, set closure and score validation.
- New Decimal engines: `block_shadow`, `seam_radar`, `setter_iq`, `lineup_slip`,
  `integrity_seal`, `capsule_io`.
- Dispatcher, demos and catalog expanded to 18 modules; health reports 18.
- New tests: `test_fivb_bounds`, `test_new_modules`; API count updated.

## Sprint 11 - engine hardening
- Fixed Pydantic model-config injection, kept zero `float` tokens (serve type
  encoded without the forbidden literal).
- `ruff`, `mypy --strict` and 232 backend tests green.

## Sprint 12 - cybersecurity shield
- `security.py`: ASGI middleware with 256 KiB cap (413), 120 mutations/min/IP
  (429 + `Retry-After`), XSS/HTML/control-char sanitisation and formula-injection
  protection.
- `main.py` 2.0.0 with CSP, nosniff, SAMEORIGIN, no-referrer and
  Permissions-Policy on API and web.
- `routes.py` forbids extra fields, whitelists modules, sanitises jobs and adds
  `POST /api/v1/security/verify-seal`.
- `excel_exporter.py` protects summary/detail/CSV cells and headers.
- `test_security_shield.py` covers caps, limits, XSS and Excel injection.

## Sprint 13 - frontend v2
- TS mirrors of all six new engines in `local-engines.ts`.
- 18 module metadata entries, six interactive stations (shadow cone, seam map,
  setter bars, FIVB I-VI slip, seal verifier, `.volleyos` import/export).
- Ctrl+K instant search, role filters, 18-module counter and ES/EN/PT render
  tests.
- SEO facts for the six new modules; 40 curated entries, 151 sitemap URLs.
- 35 frontend tests, `tsc --noEmit` and `next build` green.

## Sprint 14 - localization
- Hero, module labels and shared UI strings in ES/EN/PT; locale render tests for
  all 18 stations.
- Fastlane full descriptions and `changelogs/200.txt` in en-US, es-ES, pt-BR.

## Sprint 15 - trilingual documentation
- README language switcher + `README.es.md` and `README.pt.md`.
- `SECURITY.md` threat model, secrets and disclosure policy.
- `CONTRIBUTING.md` setup, gates, engine checklist and localization rules.
- Trilingual bug/feature issue templates and private security contact.

## Sprint 16 - launch v2.0.0
- `scripts/e2e_check.py`: 27 live checks for 18 demos, seal verification, body
  cap, headers, paywall, ES/EN/PT homes, 18 stations and sitemap.
- `docs/openapi.json` regenerated at 2.0.0 with the seal endpoint.
- `README.md`, `docs/QA_REPORT.md` and `docs/LAUNCH_PLAYBOOK.md` updated.
- Versions bumped to 2.0.0 in backend and frontend.
- Tag `v2.0.0` and push to `main`.

## Sprint 17 - SQLite WAL persistence and live rooms
- `persistent_store.py`: SQLite WAL store at `VOLLEYOS_DB_PATH`
  (default `./.tmp/volleyos.db`), connection-per-call, jobs and `live_rooms`.
- HMAC job signatures, per-room admin tokens, seals, delete receipts.
- API: `POST/GET /api/v1/live`, `PATCH/DELETE` gated by `X-Admin-Token`;
  allowed modules are scoreboard, beach, referee-console and tournament.
- Tests: WAL mode, persistence across connections, full live cycle, 404/403,
  non-live modules rejected.

## Sprint 18 - engines 19-24
- New Decimal engines: `referee_console` (FIVB 21 cards, escalation, 8 s/30 s
  timers), `substitution_tracker` (six per set, position-bound pairs, injury),
  `court_split` (exact-cent pickup, tournament profit), `fan_companion`
  (8 gestures, 5 trivia questions), `setter_signals` (7 gestures, 6 plays),
  `mvp_awards` (MVP/WALL/LOCK/SNIPER/BUILDER/ICE + sealed card).
- Dispatcher, demos, catalog and health expanded to 24; profiles now include
  referees and fans. Versions bumped to 3.0.0.
- Six TypeScript mirrors, 42 frontend tests, 24 hub stations, 24 metadata
  entries, six station UIs and 46 SEO entries (169 sitemap URLs).
- UX: persisted role selection, high-contrast mode, referee whistle audio and a
  trilingual `/[locale]/live/[roomId]` viewer with public polling.
- E2E: live room lifecycle, 24 demos, 24 rendered stations, 169 sitemap URLs.

## Sprint 19 - engines 25-30 and pro arena UX
- New Decimal engines: `timeout_chalkboard` (30 s FIVB timer, two cues, 9x18 m
  strokes), `momentum_coach` (6-rally window, timeout calls), `captain_draft`
  (snake A-B-B-A, 2-4 captains, department audit), `roster_pass` (6-14 players,
  two liberos, unique 1-99, captain != libero), `equipment_inspector` (FIVB net
  heights +/-2 cm, indoor/beach pressure, 21 cm ball stacking), `match_poster`
  (escaped 1080x1920 and 1080x1080 SVG, themes, HMAC seal).
- Dispatcher, demos, catalog and health expanded to 30; profiles rebalanced to
  five modules each across players, coaches, court, tournaments, referees and
  fans. Versions bumped to 4.0.0.
- Six TypeScript mirrors, 51 frontend tests, 30 hub stations and metadata
  entries, six station UIs and 52 SEO entries (187 sitemap URLs).
- Scoreboard: 50-state undo/redo history, A/L/Z/W/B/C hotkeys, high-contrast
  toggle persisted locally.
- E2E: 30 demos, 30 rendered stations, live room lifecycle and 32/32 checks.

## Current state
- 30 Decimal engines + TS mirrors, FastAPI API with security shield, HMAC
  paywall and SQLite WAL live rooms, trilingual Command Center, 194 static
  pages, PWA/F-Droid metadata, Docker/Render/CI and 32/32 live E2E.
- Known limits: no user auth, no live checkout provider, Cloud export UI not
  wired to the job API, Docker images unbuilt locally, live rooms poll every 5 s.

Next: wire checkout + API export UI, then account auth and WebSocket live rooms.
