# VolleyOS Global

The volleyball operating system: 12 modules for players, coaches, referees,
organisers and clubs. Offline-first FOSS (F-Droid ready) + optional Cloud Pro.

- Backend: Python 3.13+ / FastAPI / Pydantic v2 / Decimal-only maths.
- Frontend: Next.js App Router / TypeScript strict / Tailwind / Zod.
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

## API surface

- `GET /api/v1/health/deep` - 12-engine health.
- `GET /api/v1/catalog/modules` - modules, samples and pricing.
- `POST /api/v1/modules/{slug}/run` and `/demo` - run an engine.
- `POST /api/v1/jobs` -> `GET /jobs/{id}/preview` -> signed payment webhook ->
  `GET /jobs/{id}/download?format=xlsx|csv` (402 until paid).
- `DELETE /api/v1/jobs/{id}` - destroy data and return a signed UTC receipt.

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

## Status

v1.0.0: 202 backend tests, 25 frontend tests, 140 static pages, 22/22 live E2E.
Cloud export uses an HMAC webhook; wire a checkout provider before charging.
