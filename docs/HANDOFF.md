# HANDOFF — VolleyOS Global

## Sprint 0 — setup
- Monorepo scaffolded: `backend/`, `frontend/`, `fastlane/`, `docs/`, `.agents/skills/`.
- AGPL-3.0-or-later `LICENSE`, `THIRD_PARTY_LICENSES.md`, `AGENTS.md`.
- Backend venv installed, frontend dependencies installed.

Next: Sprint 1 (engines 1-6, Decimal-only TDD).

## Sprint 1 ? engines 1-6
- `biomechanics`, `rotation_validator`, `scouting_engine`, `scoreboard_engine`,
  `tournament_engine`, `pickup_balancer` + Decimal trigonometry in `mathx.py`.
- 98 tests green, ruff/mypy strict clean.

## Sprint 2 ? engines 7-12 + Excel
- `obs_overlay`, `pocket_var`, `beach_engine`, `volleycard_generator`,
  `attack_tempo`, `jump_load_monitor`, `excel_exporter` (Resumen + Detalle tabs).
- 162 tests green.

## Sprint 3 ? API
- 12-module dispatcher, demo payloads, catalog, deep health, HMAC paywall jobs,
  signed delete receipts, privacy headers, CORS wildcard, `docs/openapi.json`.
- 199 tests green, ruff/mypy strict clean.

Next: Sprint 4 (frontend + offline engine).
