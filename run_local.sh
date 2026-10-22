#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [ ! -x backend/.venv/bin/python ]; then
  python -m venv backend/.venv
fi
backend/.venv/bin/python -m pip install -q -e backend

backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 &
API_PID=$!
trap 'kill "$API_PID" 2>/dev/null || true' EXIT

cd frontend
[ -d node_modules ] || npm install
npm run dev
