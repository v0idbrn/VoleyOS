# VolleyOS domain skill

Use when touching volleyball rules, engine maths or module UX.

## Invariants
- Money, coordinates, angles, ratios: `Decimal` in Python, string-decimal helpers in TS.
- FIVB 5-1 zones: front `Z4 Z3 Z2`, back `Z5 Z6 Z1`.
- Indoor sets to 25 (win by 2), deciding set 15; court switch at 8 in decider.
- Beach: 21/21/15, side switch every 7 points (5 in decider).
- Ranking points: 3-0/3-1 = 3, 3-2 = 2, 2-3 = 1, 1-3/0-3 = 0.
- ACWR acute 7d / chronic 4-week average; safe 0.80-1.30.

## Workflow
1. Engine first in `backend/app/services/`, tests next to it in `backend/tests/`.
2. Mirror the calculator in `frontend/src/lib/local-engines.ts`.
3. Run the gate commands in `AGENTS.md` before committing.
