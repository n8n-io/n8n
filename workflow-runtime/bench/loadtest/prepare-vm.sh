#!/usr/bin/env bash
# Grows the workload pool on the VM: runs the engine-test harness
# prepare.mjs (with PREPARE_SINGLE=1: one reference run, no certification
# run) over workflow rows, split across K reference n8n instances.
#
#   prepare-vm.sh <k> <conc-per-instance> <rows.jsonl>...
#
# Bundles go to $OUT/bundles (default $DATA/prepared), results to $OUT/results-<n>.jsonl.
# Start the reference instances first: ref.sh up <k>.
set -euo pipefail
source "$(dirname "$0")/env.sh"
k=$1 conc=$2
shift 2
out=${OUT:-$DATA/prepared}
mkdir -p "$out/parts" "$out/bundles"
cat "$@" | split -n "r/$k" -d -a 2 - "$out/parts/part-"
pids=()
for ((i = 0; i < k; i++)); do
	part=$(printf '%s/parts/part-%02d' "$out" "$i")
	(cd "$DATA/engine-test/harness" && PREPARE_SINGLE=1 N8N_URL="http://127.0.0.1:$((47700 + i))" GYM_REPO="$GYM_REPO" \
		exec taskset -c "$LOADGEN_CPUS" "$NODE26/node" prepare.mjs "$part" "$out" --concurrency "$conc" --timeout 120 \
		--results "$out/results-$i.jsonl") > "$LT/logs/prepare-$i.log" 2>&1 &
	pids+=($!)
done
echo "${pids[*]}" > "$LT/logs/prepare.pids"
wait "${pids[@]}"
echo "prepare done"
