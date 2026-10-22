# AGENTS.md — VolleyOS Global

## Stack
- `backend/` Python 3.13+ / FastAPI / Pydantic v2 / **Decimal only** (no `float` in `backend/app/`).
- `frontend/` Next.js App Router / TypeScript strict / Tailwind / Zod. **No `: any`** in `frontend/src/`.

## Commands
```bash
cd backend && .venv\Scripts\python -m pytest -q
cd backend && .venv\Scripts\python -m ruff check app tests
cd backend && .venv\Scripts\python -m mypy --strict app
cd backend && .venv\Scripts\python -m uvicorn app.main:app --port 8000
cd frontend && npm run typecheck && npm run test && npm run build
```

## Contracts
- Money / biomechanics / ratios: `Decimal`, never binary floats.
- Every engine lives in `backend/app/services/` and has a TS mirror in `frontend/src/lib/local-engines.ts`.
- Privacy headers on every API response: no-store, nosniff, DENY, no-referrer.
- Dual build: `NEXT_PUBLIC_BUILD_TARGET=cloud|fdroid`.
- Licence: AGPL-3.0-or-later. No proprietary SDKs, no telemetry.
