# Contributing to VolleyOS

Thanks for helping build the volleyball operating system. This project is
AGPL-3.0-or-later and welcomes code, translations, drills and bug reports.

## Ground rules

- Be respectful. Assume good faith. No harassment or discrimination.
- Never commit secrets, real athlete data or proprietary SDKs.
- Keep the free/F-Droid build offline: no telemetry, analytics or hidden network
  calls.
- Money, biomechanics and ratio maths in the backend use `Decimal` only. Never
  introduce binary floats in `backend/app/`.
- TypeScript is strict. Do not use `: any` in `frontend/src/`.

## Local setup

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\pip install -e ".[dev]"   # Windows
# source .venv/bin/activate && pip install -e ".[dev]"  # Linux/macOS
.venv\Scripts\python -m uvicorn app.main:app --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Or run both with `run_local.bat` / `./run_local.sh`.

## Required gates

Run every gate before opening a pull request:

```bash
cd backend && .venv\Scripts\python -m pytest -q
cd backend && .venv\Scripts\python -m ruff check app tests
cd backend && .venv\Scripts\python -m mypy --strict app
cd frontend && npm run typecheck
cd frontend && npm run test
cd frontend && npm run build
```

Contracts checked by the suite:

- Zero `float` tokens under `backend/app/`.
- Zero `: any` under `frontend/src/`.
- Health and catalog report 24 modules.
- Every response carries the privacy/security headers.
- Every engine has a TS mirror in `frontend/src/lib/local-engines.ts`.

## Adding or changing an engine

1. Add the Python service in `backend/app/services/` using `Decimal`.
2. Register metadata, demo data and the runner in `backend/app/api/`.
3. Mirror the algorithm and types in `frontend/src/lib/local-engines.ts`.
4. Add metadata in `frontend/src/lib/modules.ts`, a station in
   `frontend/src/components/stations.tsx`, and SEO facts in
   `frontend/src/lib/seo.ts`.
5. Add tests on both sides and update `scripts/e2e_check.py` if the API surface
   changes.

## Localization

Every user-facing string must exist in Spanish, English and Portuguese. Use
`t(locale, es, en, pt)` in components and `Record<Locale, string>` for data.
Volleyball terminology should follow FIVB usage per language (for example
`armador` / `setter` / `levantador`, `líbero` / `libero` / `líbero`).
When you change docs, update `README.md`, `README.es.md` and `README.pt.md`.

## Style

- No comments unless they explain a non-obvious trade-off.
- Prefer standard library and existing helpers over new dependencies.
- Keep diffs small and focused; do not reformat unrelated files.
- Commits use Conventional Commits, e.g.
  `fix(scouting): reject empty player numbers`.

## Reporting bugs

Open an issue with the template that matches: bug, feature or security. For
vulnerabilities, follow `SECURITY.md` and use a private advisory instead.

## Licence

By contributing you agree that your work is released under
AGPL-3.0-or-later and that you have the right to submit it.
