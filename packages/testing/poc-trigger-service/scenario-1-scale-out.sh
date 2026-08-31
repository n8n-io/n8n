#!/usr/bin/env bash
# Scale-out: with 2 mains and seatCount=2, both replicas consume one consumer
# group; every message becomes exactly one execution.
# Preconditions: compose up, main 1 + main 2 + worker running, ./seed.sh 2 done,
# seats settled (watch.sh shows 2 holders).
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scenario-lib.sh"

COUNT="${1:-1000}"

echo "[scenario-1] seats:"
seat_state
HOLDERS=$(distinct_holders)
assert_eq "$HOLDERS" 2 "distinct seat holders before the run"

BASELINE=$(execution_count)
echo "[scenario-1] baseline executions: $BASELINE; producing $COUNT messages"
"$POC_DIR/produce.sh" "$COUNT" "s1-$(date +%s)"

FINAL=$(wait_settled 10 300)
assert_eq "$((FINAL - BASELINE))" "$COUNT" "executions for $COUNT messages (no loss, no duplicates)"
