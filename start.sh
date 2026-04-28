#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$ROOT_DIR/web"
APP_URL="http://localhost:5173"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but was not found in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found in PATH."
  exit 1
fi

if [ ! -d "$WEB_DIR" ]; then
  echo "Expected web app at: $WEB_DIR"
  exit 1
fi

cd "$WEB_DIR"

if [ -f package-lock.json ]; then
  echo "Installing web dependencies (npm ci)..."
  npm ci
else
  echo "Installing web dependencies (npm install)..."
  npm install
fi

cleanup() {
  if [ "${DEV_PID:-}" != "" ] && kill -0 "$DEV_PID" >/dev/null 2>&1; then
    kill "$DEV_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting dev server..."
npm run dev &
DEV_PID=$!

echo "Waiting for server at $APP_URL ..."
for _ in $(seq 1 120); do
  if curl -fsS "$APP_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

echo "Opening $APP_URL"
open "$APP_URL" >/dev/null 2>&1 || true

echo ""
echo "Dev server running. Press Ctrl+C to stop."
echo ""

wait "$DEV_PID"
