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

## Development gates

```bash
cd backend && .venv\Scripts\python -m pytest -q
cd backend && .venv\Scripts\python -m ruff check app tests
cd backend && .venv\Scripts\python -m mypy --strict app
cd frontend && npm run typecheck && npm run test && npm run build
```

See `docs/HANDOFF.md`, `docs/QA_REPORT.md` and `docs/LAUNCH_PLAYBOOK.md`.
