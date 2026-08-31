#!/usr/bin/env bash
# Rebalance/churn: run this after starting with ONE main (it claims all seats),
# then start a second main and watch: vacant seats are claimed with no handoff
# churn; if the first main holds everything, at most rate-limited handoffs move
# seats. Counts Kafka group rebalances to show churn is bounded.
#   Terminal A: ./run-main.sh 1   (then ./seed.sh 2)
#   Terminal B: (later) ./run-main.sh 2
#   Terminal C: ./scenario-4-rebalance.sh
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scenario-lib.sh"

echo "[scenario-4] watching seat movement and Kafka rebalances for 90s..."
START_REBALANCES=$(kafka_rebalance_count)
for i in $(seq 1 45); do
  HOLDERS=$(distinct_holders)
  REB=$(( $(kafka_rebalance_count) - START_REBALANCES ))
  echo "t=$((i * 2))s holders=$HOLDERS rebalances=+$REB"
  seat_state | sed 's/^/    /'
  sleep 2
done

echo "[scenario-4] final: $(distinct_holders) holders, +$(( $(kafka_rebalance_count) - START_REBALANCES )) group rebalances since start"
