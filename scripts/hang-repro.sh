#!/usr/bin/env bash
# Loop n8n start/wait/kill until startup hangs. Designed to flush out the
# isolated-vm init-time hang (B-style) — large pool size amplifies the chance
# of drawing a wedged isolate.
#
# Usage:
#   scripts/hang-repro.sh                  # defaults: pool=100, timeout=90s, max 1000 iters
#   POOL_SIZE=500 TIMEOUT_SEC=120 scripts/hang-repro.sh
#
# On hang it:
#   - leaves the process running (so you can attach a debugger / take a snapshot)
#   - sends SIGUSR1 to enable the inspector on 127.0.0.1:9229
#   - prints the iteration number, log path, and the PID
# On normal boot it kills the process and continues.

set -uo pipefail

POOL_SIZE="${POOL_SIZE:-100}"
TIMEOUT_SEC="${TIMEOUT_SEC:-90}"
MAX_ITERS="${MAX_ITERS:-1000}"
PORT="${N8N_PORT:-5678}"
LOG_DIR="${LOG_DIR:-$HOME/n8n-hang-repro/$(date +%s)}"
READY_PATH="${READY_PATH:-/}"

mkdir -p "$LOG_DIR"
echo "logs: $LOG_DIR"
echo "config: pool=$POOL_SIZE timeout=${TIMEOUT_SEC}s port=$PORT readiness=$READY_PATH"

# n8n env
export N8N_EXPRESSION_ENGINE="${N8N_EXPRESSION_ENGINE:-vm}"
export N8N_EXPRESSION_ENGINE_POOL_SIZE="$POOL_SIZE"
# Use a throwaway sqlite DB per run to avoid migration noise
export DB_TYPE="${DB_TYPE:-sqlite}"
export N8N_USER_FOLDER="${N8N_USER_FOLDER:-$LOG_DIR/n8n-user}"

# The launch command. Adjust if your n8n is invoked differently.
LAUNCH="${N8N_LAUNCH_CMD:-pnpm --filter n8n start}"

trap 'echo "interrupted"; kill -TERM "${PID:-0}" 2>/dev/null || true; exit 130' INT TERM

for i in $(seq 1 "$MAX_ITERS"); do
  LOG="$LOG_DIR/iter-$i.log"
  ts() { date -Is; }
  echo "[$(ts)] iter $i — starting n8n"

  # shellcheck disable=SC2086
  $LAUNCH > "$LOG" 2>&1 &
  PID=$!

  START=$(date +%s)
  READY=0

  while :; do
    NOW=$(date +%s)
    ELAPSED=$(( NOW - START ))

    if curl -sf -o /dev/null --max-time 2 "http://localhost:$PORT$READY_PATH"; then
      READY=1
      break
    fi

    if ! kill -0 "$PID" 2>/dev/null; then
      echo "[$(ts)] iter $i — process died during boot after ${ELAPSED}s"
      echo "----- tail $LOG -----"
      tail -30 "$LOG"
      echo "----------------------"
      break
    fi

    if [ "$ELAPSED" -ge "$TIMEOUT_SEC" ]; then
      echo "[$(ts)] iter $i — HANG after ${ELAPSED}s"
      echo "  PID:  $PID"
      echo "  log:  $LOG"

      # Enable inspector for live debugging
      kill -USR1 "$PID" 2>/dev/null && \
        echo "  inspector: 127.0.0.1:9229 (SIGUSR1 sent — attach chrome://inspect)"

      echo "----- tail $LOG -----"
      tail -30 "$LOG"
      echo "----------------------"
      echo
      echo "process left running so you can investigate."
      echo "to clean up: kill $PID"
      exit 0
    fi

    sleep 1
  done

  if [ "$READY" -eq 1 ]; then
    ELAPSED=$(( $(date +%s) - START ))
    echo "[$(ts)] iter $i — ready in ${ELAPSED}s, killing"
    kill -TERM "$PID" 2>/dev/null || true
    # Wait briefly for graceful shutdown, then force
    for _ in $(seq 1 10); do
      if ! kill -0 "$PID" 2>/dev/null; then break; fi
      sleep 0.5
    done
    kill -KILL "$PID" 2>/dev/null || true
    wait "$PID" 2>/dev/null || true
    # Clean db so the next iter does the same first-run path
    rm -rf "$N8N_USER_FOLDER"
  fi
done

echo "[$(date -Is)] survived $MAX_ITERS iterations without hang"
