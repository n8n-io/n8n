#!/usr/bin/env bash
# The fencing money-shot: SIGSTOP a seat holder past its lease so another main
# reclaims the seat (epoch bump), then SIGCONT the zombie. Its in-flight
# emissions are fenced out at execution insert; total executions stay exactly
# equal to messages produced — zero double executions.
#
# Requires THREE mains: anti-affinity forbids the other sibling-holder from
# reclaiming, so a third, seatless runner must exist to take over the frozen
# holder's seat.
#   ./scenario-3-zombie.sh <main-number-to-pause> [count] [pause-seconds]
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scenario-lib.sh"

VICTIM="${1:?usage: scenario-3-zombie.sh <main-number-to-pause> [count] [pause-seconds]}"
COUNT="${2:-400}"
PAUSE="${3:-25}" # > lease (10s) + reconcile tick, so the seat is reclaimed

BASELINE=$(execution_count)
EPOCHS_BEFORE=$(psql_q "SELECT sum(\"leaseEpoch\") FROM workflow_trigger_seat")

echo "[scenario-3] baseline: $BASELINE; producing $COUNT messages in the background"
"$POC_DIR/produce.sh" "$COUNT" "s3-$(date +%s)" &
PRODUCER=$!

sleep 3
echo "[scenario-3] SIGSTOP main-$VICTIM for ${PAUSE}s (pid $(main_pid "$VICTIM"))"
kill -STOP "$(main_pid "$VICTIM")"
sleep "$PAUSE"

echo "[scenario-3] seats while paused (expect the victim's seat reclaimed, epoch bumped):"
seat_state
EPOCHS_AFTER=$(psql_q "SELECT sum(\"leaseEpoch\") FROM workflow_trigger_seat")

echo "[scenario-3] SIGCONT main-$VICTIM — the zombie wakes with stale claims"
kill -CONT "$(main_pid "$VICTIM")"

wait "$PRODUCER" || true
FINAL=$(wait_for_count "$((BASELINE + COUNT))" 240 || true)
# Settle a further quiet period: the zombie's fenced emissions must not land late.
FINAL=$(wait_settled 16 120)
assert_eq "$((FINAL - BASELINE))" "$COUNT" "executions with a zombie in the fleet (zero doubles)"
if [ "$EPOCHS_AFTER" -gt "$EPOCHS_BEFORE" ]; then
  echo "  ✅ seat was reclaimed while the zombie was paused (epoch sum $EPOCHS_BEFORE -> $EPOCHS_AFTER)"
else
  echo "  ⚠️ no reclaim happened during the pause (is a third, seatless main running?)"
fi

FENCED=$(grep -c "fenced out" ".poc-data/main-$VICTIM.log" || true)
if [ "$FENCED" -gt 0 ]; then
  echo "  ✅ the zombie's late emissions were fenced at execution insert ($FENCED rejection(s) in main-$VICTIM.log)"
else
  echo "  ⚠️ no fence rejections logged by main-$VICTIM — its consumer may have had no in-flight work at freeze time; rerun with more load"
fi
