# VolleyOS Global

**English** | [Español](README.es.md) | [Português](README.pt.md)

The volleyball operating system: 18 modules for players, coaches, referees,
organisers and clubs. Offline-first FOSS (F-Droid ready) + optional Cloud Pro.

- Backend: Python 3.13+ / FastAPI / Pydantic v2 / Decimal-only maths.
- Frontend: Next.js App Router / TypeScript strict / Tailwind / Zod.
- Security: CSP, rate limiting, 256 KiB body cap, XSS and formula-injection
  sanitisation, HMAC-SHA256 integrity seals.
- Locales: Spanish, English and Portuguese (UI, SEO and legal pages).
- Licence: AGPL-3.0-or-later. No telemetry. No proprietary SDKs.

## Quick start

```bash
# Windows
run_local.bat

# Linux/macOS
./run_local.sh
```

Backend on `http://localhost:8000`, frontend on `http://localhost:3000`.
API docs at `http://localhost:8000/docs`; app at `http://localhost:3000/es/`.

```bash
# Docker (API + web)
docker compose up --build
```

## Modules

| # | Module | Slug |
|---|--------|------|
| 1 | 5 Frames biomechanics + vertical jump | `biomechanics` |
| 2 | 5-1 rotation board + FIVB overlap validator | `rotation` |
| 3 | 3-click scouting + heatmap | `scouting` |
| 4 | Indoor 6v6 scoreboard | `scoreboard` |
| 5 | Tournament builder + FIVB ranking | `tournament` |
| 6 | Pickup team balancer + King of the Court | `pickup` |
| 7 | OBS/TV overlay | `overlay` |
| 8 | Pocket VAR referee | `var` |
| 9 | Beach 2v2 + Newcom | `beach` |
| 10 | VolleyCard + hexagon radar | `volleycard` |
| 11 | Attack tempo trainer | `tempo` |
| 12 | ACWR jump-load monitor | `acwr` |
| 13 | Block shadow and defensive coverage | `block-shadow` |
| 14 | Reception seam radar and ownership | `seam-radar` |
| 15 | Setter distribution unpredictability | `setter-iq` |
| 16 | FIVB lineup slip I-VI with libero window | `lineup-slip` |
| 17 | HMAC-SHA256 integrity seal | `integrity-seal` |
| 18 | Portable `.volleyos` capsule | `capsule-io` |

## API surface

- `GET /api/v1/health/deep` - 18-engine health and version.
- `GET /api/v1/catalog/modules` - modules, samples and pricing.
- `POST /api/v1/modules/{slug}/run` and `/demo` - run an engine.
- `POST /api/v1/security/verify-seal` - verify a signed match sheet.
- `POST /api/v1/jobs` -> `GET /jobs/{id}/preview` -> signed payment webhook ->
  `GET /jobs/{id}/download?format=xlsx|csv` (402 until paid).
- `DELETE /api/v1/jobs/{id}` - destroy data and return a signed UTC receipt.

Every API response carries `no-store`, `nosniff`, `SAMEORIGIN`, `no-referrer`
and a strict Permissions-Policy. Mutating requests are capped at 256 KiB and
120 per minute per IP.

## Development gates

```bash
cd backend && .venv\Scripts\python -m pytest -q
cd backend && .venv\Scripts\python -m ruff check app tests
cd backend && .venv\Scripts\python -m mypy --strict app
cd frontend && npm run typecheck && npm run test && npm run build
```

## Documentation

- `docs/HANDOFF.md` - sprint log and current state.
- `docs/QA_REPORT.md` - gates, E2E evidence and known limits.
- `docs/LAUNCH_PLAYBOOK.md` - deploy, domain, payments, rollback.
- `docs/FDROID_SUBMISSION_GUIDE.md` - offline Android distribution.
- `docs/openapi.json` - generated API contract.
- `SECURITY.md` - vulnerability disclosure and threat model.
- `CONTRIBUTING.md` - local setup, style and pull-request gates.

## Status

v2.0.0: 18 modules, 18 engine tests, trilingual UI and docs, live E2E for
modules, security, paywall and header policy.

Cloud export uses an HMAC webhook; wire a checkout provider before charging.
