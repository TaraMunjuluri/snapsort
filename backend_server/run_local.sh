#!/usr/bin/env bash
set -euo pipefail

# Simple helper to start the API locally for teammates.
# Usage: ./run_local.sh

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [ ! -f ".env" ]; then
  echo "[ERROR] .env not found. Copy .env.example and set OPENAI_API_KEY first." >&2
  exit 1
fi

PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="${VENV_DIR:-.venv}"

if [ ! -d "$VENV_DIR" ]; then
  echo "[INFO] Creating virtualenv at $VENV_DIR"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

echo "[INFO] Installing requirements"
pip install --upgrade pip >/dev/null
pip install -r requirements.txt

echo "[INFO] Loading environment from .env"
set -a
source .env
set +a

echo "[INFO] Starting server at http://0.0.0.0:8000"
exec uvicorn backend_server.app:app --host 0.0.0.0 --port 8000 --reload
