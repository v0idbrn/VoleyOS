@echo off
setlocal
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
  python -m venv backend\.venv
)
backend\.venv\Scripts\python.exe -m pip install -q -e backend

if not exist "frontend\node_modules" (
  pushd frontend
  call npm install
  popd
)

start "VolleyOS API" cmd /k "backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000"
start "VolleyOS Web" cmd /k "cd /d %~dp0frontend && npm run dev"

echo API: http://127.0.0.1:8000/docs
echo Web: http://127.0.0.1:3000/es/
