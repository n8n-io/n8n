#!/usr/bin/env bash
# Live pipeline dashboard for recording the demo:
#   Kafka -> [mains: seat holders consuming] -> queue -> [workers: executing]
# Counts come from instance logs (consumption/execution markers) and Postgres.
#   ./demo-dashboard.sh [refresh-seconds]
set -euo pipefail
POC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INTERVAL="${1:-1}"

BOLD=$'\e[1m'; DIM=$'\e[2m'; RESET=$'\e[0m'
BLUE=$'\e[34m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; MAGENTA=$'\e[35m'

psql_q() {
  docker exec -i n8n-poc-postgres-1 psql -U n8n -d n8n -tA -c "$1" 2>/dev/null || echo '?'
}

bar() { # count max-width
  local count="$1" width=40 total="$2" fill
  [ "$total" -eq 0 ] && total=1
  fill=$(( count * width / total ))
  [ "$fill" -gt "$width" ] && fill=$width
  printf '%s%s' "$(printf '█%.0s' $(seq 1 $((fill + 1))))" "$(printf "${DIM}·%.0s${RESET}" $(seq 1 $((width - fill))))"
}

while true; do
  TOTAL=$(psql_q 'SELECT count(*) FROM execution_entity')
  LAST10=$(psql_q "SELECT count(*) FROM execution_entity WHERE \"createdAt\" > now() - interval '10 seconds'")

  SEATS=$(psql_q "SELECT w.name || '|' || s.\"seatIndex\" || '|' || coalesce(s.\"holderId\",'-') || '|' || s.\"leaseEpoch\" || '|' || coalesce(s.\"actualState\",'-') FROM workflow_trigger_seat s JOIN workflow_entity w ON w.id = s.\"workflowId\" WHERE s.\"desiredState\"='active' ORDER BY w.name, s.\"seatIndex\"")

  OUT=""
  OUT+="${BOLD}  KAFKA ─▶ MAINS (trigger seats) ─▶ QUEUE ─▶ WORKERS${RESET}\n"
  OUT+="  $(date '+%H:%M:%S')   total executions: ${BOLD}${TOTAL}${RESET}   last 10s: ${BOLD}${LAST10}${RESET}\n\n"

  OUT+="${BOLD}${BLUE}  MAINS — Kafka messages consumed (log: 'Received trigger')${RESET}\n"
  MAINS_TOTAL=0
  declare -a MAIN_LINES=()
  for f in "$POC_DIR"/.poc-data/main-*.log; do
    [ -f "$f" ] || continue
    name=$(basename "$f" .log)
    count=$(grep -c 'Received trigger for workflow' "$f" 2>/dev/null || true); count=${count:-0}
    MAINS_TOTAL=$((MAINS_TOTAL + count))
    MAIN_LINES+=("$name $count")
  done
  for line in "${MAIN_LINES[@]:-}"; do
    [ -z "$line" ] && continue
    name=${line% *}; count=${line##* }
    OUT+="$(printf '  %-9s %6d  %s' "$name" "$count" "$(bar "$count" "$MAINS_TOTAL")")\n"
  done

  OUT+="\n${BOLD}${GREEN}  WORKERS — executions run (log: 'Worker finished execution')${RESET}\n"
  WORKERS_TOTAL=0
  declare -a WORKER_LINES=()
  for f in "$POC_DIR"/.poc-data/worker-*.log; do
    [ -f "$f" ] || continue
    name=$(basename "$f" .log)
    count=$(grep -c 'Worker finished execution' "$f" 2>/dev/null || true); count=${count:-0}
    WORKERS_TOTAL=$((WORKERS_TOTAL + count))
    WORKER_LINES+=("$name $count")
  done
  for line in "${WORKER_LINES[@]:-}"; do
    [ -z "$line" ] && continue
    name=${line% *}; count=${line##* }
    OUT+="$(printf '  %-9s %6d  %s' "$name" "$count" "$(bar "$count" "$WORKERS_TOTAL")")\n"
  done

  OUT+="\n${BOLD}${MAGENTA}  TRIGGER SEATS${RESET}\n"
  OUT+="$(printf '  %-18s %-4s %-24s %-6s %s' 'workflow' 'seat' 'holder' 'epoch' 'state')\n"
  while IFS='|' read -r wf seat holder epoch state; do
    [ -z "$wf" ] && continue
    OUT+="$(printf '  %-18s %-4s %-24s %-6s %s' "${wf:0:18}" "$seat" "$holder" "$epoch" "$state")\n"
  done <<< "$SEATS"

  clear
  printf '%b\n' "$OUT"
  sleep "$INTERVAL"
done
