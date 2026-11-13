#!/usr/bin/env bash
# One ramp: starts an engine setup on a CPU budget, ramps the concurrency
# with drive.mjs, and stops the setup.
#
#   ramp.sh <run> <label> <keys> <engine.sh start args...> [-- <drive.mjs args>]
#
# Examples:
#   ramp.sh pilot v1-b1 keys.txt v1 1
#   ramp.sh full compiled-b4-s2w3 keys.txt compiled 4 2 3 native -- --hold 60
# The n8n engines read their workflows from the database: load them first
# with n8n-load.mjs (manifest $LT/engine/manifest-v1.json or -v2.json).
# Results go to $RESULTS/<run>/.
set -euo pipefail
source "$(dirname "$0")/env.sh"
run=$1 label=$2 keys=$3
shift 3
eng=()
while [ $# -gt 0 ] && [ "$1" != "--" ]; do eng+=("$1"); shift; done
[ "${1:-}" = "--" ] && shift
out=$RESULTS/$run
mkdir -p "$out"
KEYS=$keys "$KIT/engine.sh" start "${eng[@]}"
# shellcheck disable=SC1090
source "$LT/engine/state"
"$KIT/engine.sh" components "$out/components-$label.json"
refresher=
case $ENGINE in
	v1 | v2)
		manifest=$LT/engine/manifest-$ENGINE.json
		taskset -c "$LOADGEN_CPUS" "$NODE26/node" "$KIT/n8n-refresh.mjs" --url "http://127.0.0.1:$PORT" --manifest "$manifest" \
			--pool "$DATA/pool.jsonl" > "$LT/logs/refresh.log" 2>&1 &
		refresher=$!
		for _ in $(seq 120); do grep -q ready "$LT/logs/refresh.log" && break; sleep 0.5; done
		extra=(--after-restore "http://127.0.0.1:18279/refresh")
		;;
	*) manifest=$LT/engine/compiled/manifest.json; extra=(--after-restore "http://127.0.0.1:18179/refresh") ;;
esac
cp "$manifest" "$out/manifest-$label.json"
# The build of the tree (pack name and checksum, from $LT/BUILD_ID) goes on every step.
# Line 1 of BUILD_ID is the tree (name, SHA-256, pack time); line 2 is the gym build.
build=$(head -1 "$LT/BUILD_ID" 2> /dev/null | cut -d' ' -f1,2,4 | tr ' ' ':')
gym_build=$(sed -n 2p "$LT/BUILD_ID" 2> /dev/null | grep -o 'binary sha256 [0-9a-f]*' | cut -d' ' -f3)
meta=$(printf '{"engine":"%s","budget":%s,"cpus":"%s","mode":"%s","workers":"%s","shards":"%s","build":"%s","gymBuild":"%s"}' \
	"$ENGINE" "$BUDGET" "$CPUS" "$MODE" "${WORKERS:-}" "${SHARDS:-}" "$build" "$gym_build")
set +e
taskset -c "$LOADGEN_CPUS" "$NODE26/node" "$KIT/drive.mjs" --manifest "$manifest" --pool "$DATA/pool.jsonl" --keys "$keys" \
	--components "$out/components-$label.json" --label "$label" --out "$out" --meta "$meta" "${extra[@]}" "$@" 2>&1 | tee -a "$out/drive-$label.log"
rc=${PIPESTATUS[0]}
set -e
[ -n "$refresher" ] && kill "$refresher" 2> /dev/null || true
"$KIT/engine.sh" stop
exit "$rc"
