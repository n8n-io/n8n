#!/usr/bin/env bash
# Failover: kill -9 one main mid-stream. Kafka redelivers its unresolved
# offsets to the surviving member; the dead main's seat is reclaimed after
# lease expiry. No message is lost.
#   ./scenario-2-failover.sh <main-number-to-kill> [count]
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scenario-lib.sh"

VICTIM="${1:?usage: scenario-2-failover.sh <main-number-to-kill> [count]}"
COUNT="${2:-600}"

BASELINE=$(execution_count)
echo "[scenario-2] baseline: $BASELINE; producing $COUNT messages in the background"
"$POC_DIR/produce.sh" "$COUNT" "s2-$(date +%s)" &
PRODUCER=$!

sleep 3
echo "[scenario-2] kill -9 main-$VICTIM (pid $(main_pid "$VICTIM"))"
kill -9 "$(main_pid "$VICTIM")"

wait "$PRODUCER"
echo "[scenario-2] producer done; waiting for the survivor to drain (Kafka session timeout ~45s + redelivery)"
FINAL=$(wait_for_count "$((BASELINE + COUNT))" 240 || true)
# Then settle a further quiet period to prove no duplicates trickle in.
FINAL=$(wait_settled 16 120)
assert_eq "$((FINAL - BASELINE))" "$COUNT" "executions after killing main-$VICTIM (nothing lost, nothing doubled)"
echo "[scenario-2] seats now:"
seat_state
