#!/usr/bin/env bash
set -euo pipefail

# A2A Federation — two local n8n instances on separate ports/DBs
#
# Usage:
#   pnpm federation          Start both instances (kills stale first)
#   pnpm federation kill     Kill any running federation instances
#   pnpm federation reset    Wipe both DBs and start fresh
#
# Override ports:
#   PRODUCER_PORT=7001 CONSUMER_PORT=7002 pnpm federation

PRODUCER_PORT="${PRODUCER_PORT:-6001}"
CONSUMER_PORT="${CONSUMER_PORT:-6002}"
PRODUCER_DIR="${HOME}/.n8n-producer"
CONSUMER_DIR="${HOME}/.n8n-consumer"
CMD="${1:-start}"

C='\033[36m' G='\033[32m' Y='\033[33m' B='\033[1m' R='\033[0m'

kill_stale() {
  local killed=0
  for port in "$PRODUCER_PORT" "$CONSUMER_PORT" "$((PRODUCER_PORT + 1000))" "$((CONSUMER_PORT + 1000))"; do
    local pid
    pid=$(lsof -ti "tcp:${port}" 2>/dev/null || true)
    if [[ -n "$pid" ]]; then
      kill $pid 2>/dev/null || true
      killed=1
    fi
  done
  if [[ "$killed" -eq 1 ]]; then
    echo -e "  ${Y}Killed stale processes${R}"
    sleep 1
  fi
}

case "$CMD" in
  kill)
    echo -e "\n${B}${C}  Killing federation instances${R}"
    kill_stale
    echo -e "  ${G}Done${R}\n"
    exit 0
    ;;
  reset)
    echo -e "\n${B}${C}  Resetting federation${R}"
    kill_stale
    rm -rf "$PRODUCER_DIR" "$CONSUMER_DIR"
    echo -e "  ${G}Wiped ${PRODUCER_DIR} and ${CONSUMER_DIR}${R}\n"
    # Fall through to start
    ;;
  start)
    ;;
  *)
    echo "Usage: pnpm federation [start|kill|reset]"
    exit 1
    ;;
esac

# Kill any stale processes before starting
kill_stale

echo ""
echo -e "${B}${C}  A2A Federation${R}"
echo -e "  Producer: ${G}http://localhost:${PRODUCER_PORT}${R}  (data: ${PRODUCER_DIR})"
echo -e "  Consumer: ${G}http://localhost:${CONSUMER_PORT}${R}  (data: ${CONSUMER_DIR})"
echo ""

mkdir -p "$PRODUCER_DIR" "$CONSUMER_DIR"

cleanup() {
  echo ""
  echo -e "  ${Y}Shutting down...${R}"
  kill "$PID_PRODUCER" "$PID_CONSUMER" 2>/dev/null || true
  wait "$PID_PRODUCER" "$PID_CONSUMER" 2>/dev/null || true
  echo -e "  ${G}Done${R}"
}
trap cleanup INT TERM

# Start producer (broker on port+1000)
N8N_PORT="$PRODUCER_PORT" \
N8N_USER_FOLDER="$PRODUCER_DIR" \
N8N_ENCRYPTION_KEY="federation-producer-key" \
N8N_DIAGNOSTICS_ENABLED=false \
N8N_RUNNERS_MODE=internal \
N8N_RUNNERS_BROKER_PORT="$((PRODUCER_PORT + 1000))" \
  pnpm start > "${PRODUCER_DIR}/n8n.log" 2>&1 &
PID_PRODUCER=$!

# Start consumer (broker on port+1000)
N8N_PORT="$CONSUMER_PORT" \
N8N_USER_FOLDER="$CONSUMER_DIR" \
N8N_ENCRYPTION_KEY="federation-consumer-key" \
N8N_DIAGNOSTICS_ENABLED=false \
N8N_RUNNERS_MODE=internal \
N8N_RUNNERS_BROKER_PORT="$((CONSUMER_PORT + 1000))" \
  pnpm start > "${CONSUMER_DIR}/n8n.log" 2>&1 &
PID_CONSUMER=$!

# Wait for both to be ready
wait_for() {
  local port=$1 name=$2
  echo -ne "  Waiting for ${name}..."
  for _ in $(seq 1 60); do
    if curl -sf "http://localhost:${port}/healthz" >/dev/null 2>&1; then
      echo -e " ${G}ready${R}"
      return 0
    fi
    sleep 2
  done
  echo -e " ${Y}timeout${R}"; return 1
}

wait_for "$PRODUCER_PORT" "producer"
wait_for "$CONSUMER_PORT" "consumer"

echo ""
echo -e "  ${B}${G}Both instances running${R}"
echo -e "  Producer: ${G}http://localhost:${PRODUCER_PORT}/agents${R}"
echo -e "  Consumer: ${G}http://localhost:${CONSUMER_PORT}/agents${R}"
echo ""
echo -e "  Logs: tail -f ${PRODUCER_DIR}/n8n.log"
echo -e "        tail -f ${CONSUMER_DIR}/n8n.log"
echo ""
echo -e "  ${B}pnpm federation kill${R}  to stop"
echo -e "  ${B}pnpm federation reset${R} to wipe DBs and restart"
echo ""
echo -e "  Press ${B}Ctrl+C${R} to stop both"
echo ""

wait
