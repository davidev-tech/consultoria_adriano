#!/usr/bin/env bash
set -euo pipefail

# O script está em scripts/, então a raiz é um nível acima
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/back"
FRONT_DIR="$ROOT_DIR/frontend"
VENV_DIR="$ROOT_DIR/venv"
VENV_PYTHON="$VENV_DIR/bin/python"

BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONT_HOST="${FRONT_HOST:-0.0.0.0}"
FRONT_PORT="${FRONT_PORT:-8080}"
BACKEND_PID=""
FRONT_PID=""

if [[ -n "${BACKEND_PYTHON:-}" ]]; then
  VENV_PYTHON="$BACKEND_PYTHON"
fi

if [[ ! -x "$VENV_PYTHON" ]]; then
  if ! command -v python3 >/dev/null 2>&1; then
    echo "Erro: python3 não está disponível no PATH." >&2
    exit 1
  fi
  python3 -m venv "$VENV_DIR"
fi

if [[ ! -x "$VENV_PYTHON" ]]; then
  echo "Erro: não consegui preparar o ambiente virtual em '$VENV_DIR'." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Erro: npm não está disponível no PATH." >&2
  exit 1
fi

"$VENV_PYTHON" -m pip install --quiet -r "$BACKEND_DIR/requirements.txt"

if [[ ! -x "$FRONT_DIR/node_modules/.bin/vite" ]]; then
  (
    cd "$FRONT_DIR"
    npm ci --silent
  )
fi

cleanup() {
  trap - EXIT INT TERM
  [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "$FRONT_PID" ]] && kill "$FRONT_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Iniciando backend em http://${BACKEND_HOST}:${BACKEND_PORT}"
(
  cd "$BACKEND_DIR"
  "$VENV_PYTHON" -m uvicorn main:app --reload --host "$BACKEND_HOST" --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

echo "Iniciando frontend em http://${FRONT_HOST}:${FRONT_PORT}"
(
  cd "$FRONT_DIR"
  npm run dev -- --host "$FRONT_HOST" --port "$FRONT_PORT"
) &
FRONT_PID=$!

wait -n "$BACKEND_PID" "$FRONT_PID"
status=$?
exit "$status"