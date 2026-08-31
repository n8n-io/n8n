#!/usr/bin/env bash
# Shared helpers for the demo scenarios. Source, don't run.
POC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

psql_q() { # one-line scalar query
  docker exec -i n8n-poc-postgres-1 psql -U n8n -d n8n -tA -c "$1"
}

workflow_id() { cat "$POC_DIR/.poc-data/workflow-id"; }

execution_count() {
  psql_q "SELECT count(*) FROM execution_entity WHERE \"workflowId\" = '$(workflow_id)'"
}

seat_state() {
  psql_q "SELECT \"seatIndex\" || ':' || coalesce(\"holderId\",'-') || ' epoch=' || \"leaseEpoch\" || ' ' || coalesce(\"actualState\",'-') FROM workflow_trigger_seat WHERE \"workflowId\" = '$(workflow_id)' ORDER BY \"seatIndex\""
}

distinct_holders() {
  psql_q "SELECT count(DISTINCT \"holderId\") FROM workflow_trigger_seat WHERE \"workflowId\" = '$(workflow_id)' AND \"holderId\" IS NOT NULL"
}

# Wait until the execution count stops moving (settled), print the final count.
wait_settled() { # [quiet-seconds] [timeout-seconds]
  local quiet="${1:-10}" timeout="${2:-180}" last=-1 same=0 waited=0 now
  while [ "$waited" -lt "$timeout" ]; do
    now=$(execution_count)
    if [ "$now" = "$last" ]; then
      same=$((same + 2))
      [ "$same" -ge "$quiet" ] && { echo "$now"; return 0; }
    else
      same=0
      last="$now"
    fi
    sleep 2
    waited=$((waited + 2))
  done
  echo "$last"
  return 1
}

# Wait until the execution count reaches target (or timeout). Prints the count.
# Failover drains only after Kafka's session timeout (~45s) evicts the dead
# member, so timeouts here must be generous.
wait_for_count() { # target [timeout-seconds]
  local target="$1" timeout="${2:-240}" waited=0 now=0
  while [ "$waited" -lt "$timeout" ]; do
    now=$(execution_count)
    [ "$now" -ge "$target" ] && { echo "$now"; return 0; }
    sleep 3
    waited=$((waited + 3))
  done
  echo "$now"
  return 1
}

assert_eq() { # actual expected label
  if [ "$1" = "$2" ]; then
    echo "  ✅ $3: $1"
  else
    echo "  ❌ $3: expected $2, got $1"
    return 1
  fi
}

main_pid() { cat "$POC_DIR/.poc-data/main-$1.pid"; }

# Which main number holds at least one seat (1..3), via runnerId -> pid match
# is impossible (nanoid), so scenarios that need "the holder" find it by
# pausing/killing a specific main and checking seats instead.
kafka_rebalance_count() {
  docker logs n8n-poc-kafka-1 2>&1 | grep -c "Preparing to rebalance group poc-seats" || true
}
