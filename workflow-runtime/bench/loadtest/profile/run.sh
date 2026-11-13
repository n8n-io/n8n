#!/usr/bin/env bash
# Deep profile of the compiled engine on the real mix, on a 1-vCPU budget
# (wfrt 1 shard, host 1 worker, native Code, no trace).
#
#   profile/run.sh <out-dir> <keys> [mix|attrib]...
#
# mix:    drives all keys in random order at --conc $CONC for $HOLD s.
#         During the hold: `perf record --call-graph dwarf` on wfrt, a V8
#         CPU profile of the host and its worker (profile/cpuprof.cjs,
#         SIGUSR2), and the host step profile (WF_FALLBACK_STEP_PROFILE).
# attrib: each workflow alone (profile/attrib.mjs), with the step profile.
# stepcost: the marginal CPU of one host step (profile/stepcost.mjs).
# perf needs kernel.perf_event_paranoid <= 1: the script sets it with sudo
# and puts the old value back at the end.
set -uo pipefail
source "$(dirname "$0")/../env.sh"
OUTD=$1 KEYS=$2
shift 2
mkdir -p "$OUTD"
cp "$LT/BUILD_ID" "$OUTD/BUILD_ID" 2> /dev/null || true
CPUS=${CPUS:-4}
CONC=${CONC:-5}
HOLD=${HOLD:-300}
PERF_S=${PERF_S:-240}
old_paranoid=$(sysctl -n kernel.perf_event_paranoid)
restore_paranoid() { sudo sysctl -q kernel.perf_event_paranoid="$old_paranoid"; }
trap restore_paranoid EXIT
host_env() { # steps-dir [cpuprof-dir]
	local opts="--require=$GYM_REPO/deploy/e2e/host/resolve.cjs"
	[ -n "${2:-}" ] && opts="$opts --require=$KIT/profile/cpuprof.cjs"
	# With a V8 profile, the worker must live through the window: no recycling
	# (by default the host replaces a worker after 20,000 steps).
	printf '{"WF_FALLBACK_STEP_PROFILE":"%s","NODE_OPTIONS":"%s"%s}' "$1" "$opts" \
		"${2:+,\"LT_CPUPROF_DIR\":\"$2\",\"WF_FALLBACK_RECYCLE_STEPS\":\"100000000\",\"WF_FALLBACK_RECYCLE_RSS_MB\":\"8192\"}"
}
start_engine() { # host-env-json
	rm -f "$LT/engine/compiled/manifest.json"
	LT_HOST_ENV=$1 taskset -c "$LOADGEN_CPUS" "$NODE26/node" "$KIT/compiled.mjs" --pool "$DATA/pool.jsonl" --keys "$KEYS" \
		--shards "${SHARDS:-1}" --workers 1 --cpus "$CPUS" --code native --work "$LT/engine/compiled" > "$OUTD/compiled.log" 2>&1 &
	ENGINE_PID=$!
	for _ in $(seq 3600); do [ -f "$LT/engine/compiled/manifest.json" ] && break; sleep 1; done
	cp "$LT/engine/compiled/manifest.json" "$OUTD/manifest-$PHASE.json"
	tail -1 "$OUTD/compiled.log"
}
stop_engine() { kill "$ENGINE_PID" 2> /dev/null; wait "$ENGINE_PID" 2> /dev/null; }
host_pids() { cat "$(unit_cgroup host)/cgroup.procs"; }

for PHASE in "$@"; do
	case $PHASE in
		mix)
			sudo sysctl -q kernel.perf_event_paranoid=1
			rm -rf "$OUTD/steps-mix" "$OUTD/cpuprof"
			start_engine "$(host_env "$OUTD/steps-mix" "$OUTD/cpuprof")"
			cat > "$OUTD/components.json" << EOF
{"host": {"cgroups": ["$(unit_cgroup host)"], "cpus": 1}, "wfrt-0": {"cgroups": ["$(unit_cgroup wfrt-0)"], "cpus": 1},
 "svc": {"cgroups": ["$(unit_cgroup svc)"], "cpus": 1}, "gym": {"cgroups": ["$(unit_cgroup gym)"], "cpus": 5}}
EOF
			rm -f "$OUTD/samples-mix-c$CONC.jsonl" "$OUTD/steps.jsonl"
			taskset -c "$LOADGEN_CPUS" "$NODE26/node" "$KIT/drive.mjs" --manifest "$OUTD/manifest-mix.json" --pool "$DATA/pool.jsonl" \
				--keys "$KEYS" --components "$OUTD/components.json" --label mix --out "$OUTD" --conc "$CONC" --warmup 30 --hold "$HOLD" \
				--after-restore "http://127.0.0.1:18179/refresh" > "$OUTD/drive.log" 2>&1 &
			DRIVE=$!
			until [ -s "$OUTD/samples-mix-c$CONC.jsonl" ]; do sleep 1; kill -0 $DRIVE 2> /dev/null || break; done
			sleep 10
			wpid=$(cat "$(unit_cgroup wfrt-0)/cgroup.procs" | head -1)
			date -u +%s%3N > "$OUTD/window-start"
			for p in $(host_pids); do kill -USR2 "$p" 2> /dev/null; done
			sudo perf record -F 199 --call-graph dwarf,32768 -p "$wpid" -o "$OUTD/wfrt.perf.data" -- sleep "$PERF_S" > "$OUTD/perf.log" 2>&1
			for p in $(host_pids); do kill -USR2 "$p" 2> /dev/null; done
			date -u +%s%3N > "$OUTD/window-end"
			sudo chown "$(id -u):$(id -g)" "$OUTD/wfrt.perf.data"
			wait $DRIVE
			stop_engine
			;;
		stepcost)
			start_engine "$(host_env "$OUTD/steps-stepcost")"
			taskset -c "$LOADGEN_CPUS" "$NODE26/node" "$KIT/profile/stepcost.mjs" --manifest "$OUTD/manifest-stepcost.json" --out "$OUTD/stepcost.json" > "$OUTD/stepcost.log" 2>&1
			stop_engine
			;;
		attrib)
			rm -rf "$OUTD/steps-attrib"
			start_engine "$(host_env "$OUTD/steps-attrib")"
			taskset -c "$LOADGEN_CPUS" "$NODE26/node" "$KIT/profile/attrib.mjs" --manifest "$OUTD/manifest-attrib.json" --pool "$DATA/pool.jsonl" \
				--keys "$KEYS" --steps "$OUTD/steps-attrib" --out "$OUTD/attrib.jsonl" > "$OUTD/attrib.log" 2>&1
			stop_engine
			;;
	esac
done
echo "profile phases done: $*"
