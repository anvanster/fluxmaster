#!/usr/bin/env bash
set -euo pipefail

API_PORT=${API_PORT:-4000}
WEB_PORT=${WEB_PORT:-5199}
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() {
  echo ""
  echo "Shutting down..."
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null && echo "Stopped API server (PID $API_PID)"
  [[ -n "${WEB_PID:-}" ]] && kill "$WEB_PID" 2>/dev/null && echo "Stopped Vite dev server (PID $WEB_PID)"
  wait 2>/dev/null
  exit 0
}

trap cleanup SIGINT SIGTERM

check_port() {
  local port=$1 name=$2
  if lsof -iTCP:"$port" -sTCP:LISTEN -t &>/dev/null; then
    local pid
    pid=$(lsof -iTCP:"$port" -sTCP:LISTEN -t | head -1)
    echo "Port $port is already in use (PID $pid)."
    read -rp "Kill it and start $name? [y/N] " answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
      kill "$pid" 2>/dev/null
      sleep 1
      if lsof -iTCP:"$port" -sTCP:LISTEN -t &>/dev/null; then
        kill -9 "$pid" 2>/dev/null
        sleep 1
      fi
      echo "Freed port $port."
    else
      echo "Skipping $name."
      return 1
    fi
  fi
  return 0
}

echo "=== Fluxmaster Dev Servers ==="
echo ""

wait_for_api() {
  local max_attempts=30
  local attempt=0
  while (( attempt < max_attempts )); do
    if curl -sf "http://localhost:$API_PORT/api/system/health" &>/dev/null; then
      return 0
    fi
    (( attempt++ ))
    sleep 1
  done
  return 1
}

# Start API server
if check_port "$API_PORT" "API server"; then
  echo "Starting API server on port $API_PORT..."
  cd "$ROOT_DIR" && PORT="$API_PORT" npx tsx packages/server/src/index.ts &
  API_PID=$!
  echo -n "Waiting for API server..."
  if wait_for_api; then
    echo " ready (PID $API_PID)"
  else
    echo " failed."
    kill "$API_PID" 2>/dev/null
    exit 1
  fi
fi

# Start Vite dev server
if check_port "$WEB_PORT" "Vite dev server"; then
  echo "Starting Vite dev server on port $WEB_PORT..."
  cd "$ROOT_DIR/packages/web" && API_PORT="$API_PORT" npx vite --port "$WEB_PORT" &
  WEB_PID=$!
  sleep 2
  if kill -0 "$WEB_PID" 2>/dev/null; then
    echo "Vite dev server running (PID $WEB_PID)"
  else
    echo "Vite dev server failed to start."
    exit 1
  fi
fi

echo ""
echo "Ready:"
[[ -n "${API_PID:-}" ]] && echo "  API:  http://localhost:$API_PORT"
[[ -n "${WEB_PID:-}" ]] && echo "  Web:  http://localhost:$WEB_PORT"
echo ""
echo "Press Ctrl+C to stop all servers."

wait
