#!/usr/bin/env bash
# The full load test: every ramp, in order. Each phase can run alone:
#
#   full.sh <run> <phase>...
#
# Phases:
#   load-full     load the full key set into v1 and v2 (n8n databases)
#   v1            v1 ramps on the full pool, budgets $BUDGETS
#   v2-once       v2 on the full pool at 1 vCPU
#   compiled      compiled (native Code): shard/worker search, then the best split, per budget
#   compiled-host compiled with Code in the host, at the best native split of each budget
#   load-subset   load the v2-capable subset into v1 and v2
#   subset        v1, v2 and compiled on the v2-capable subset
#   load-classa   load the class A (fully native) workflows into v1 and v2
#   classa        v1 and compiled on class A workflows only
#
# The gym gets 5 vCPUs (2,3,10,11,8); at the 6-vCPU budget, which leaves
# vCPUs 7 and 15 free, it gets those too.
set -uo pipefail
source "$(dirname "$0")/env.sh"
run=$1
shift
out=$RESULTS/$run
mkdir -p "$out"
FULL=$DATA/keys-full.txt
SUBSET=$DATA/keys-subset.txt
CLASSA=$DATA/keys-classA.txt
BUDGETS=${BUDGETS:-"1 2 4 6 8"}
RAMP=(--warmup "${WARMUP:-15}" --hold "${HOLD:-60}")
SEARCH=(--warmup 10 --hold 20)
log() { echo "$(date -u +%H:%M:%S) $*" | tee -a "$out/full.log"; }

gym_for() { # budget
	local want=2,3,10,11,8
	# 7 and 15 go to the gym only at budget 6: other agents use them for budgets below 6.
	[ "$1" = 6 ] && want=2,3,10,11,8,7,15
	if [ "${GYM_NOW:-}" != "$want" ]; then
		GYM_CPUS=$want "$KIT/bed.sh" restart > /dev/null
		GYM_NOW=$want
		log "gym on $want"
	fi
}

ramp() { # label keys engine-args... -- drive-args
	local label=$1
	log "ramp $label"
	"$KIT/ramp.sh" "$run" "$@" >> "$out/full.log" 2>&1 || log "ramp $label failed"
}

best_split() { # budget: the shard/worker split with the most OK wf/s among the search ramps
	node -e '
		const fs = require("fs");
		const rows = fs.readFileSync(process.argv[1], "utf8").split("\n").filter(Boolean).map(JSON.parse)
			.filter((r) => r.label.startsWith(`search-compiled-b${process.argv[2]}-`));
		rows.sort((a, b) => b.okRate - a.okRate);
		const m = /-s(\d+)w(\d+)$/.exec(rows[0].label);
		console.log(`${m[1]} ${m[2]}`);
	' "$out/saturation.jsonl" "$1"
}

splits() { # budget -> "s w" pairs to search
	case $1 in
		1) echo "1 1|1 2" ;;
		2) echo "1 1|1 2|1 3|2 2" ;;
		4) echo "1 3|1 4|1 6|2 4|2 6" ;;
		6) echo "1 5|1 6|2 6|2 8|3 8" ;;
		8) echo "1 7|2 7|2 8|2 10|3 10|4 12" ;;
	esac
}

for phase in "$@"; do
	case $phase in
		load-full) "$KIT/load-n8n.sh" "$FULL" >> "$out/full.log" 2>&1 ;;
		load-subset) "$KIT/load-n8n.sh" "$SUBSET" >> "$out/full.log" 2>&1 ;;
		load-classa) "$KIT/load-n8n.sh" "$CLASSA" >> "$out/full.log" 2>&1 ;;
		classa)
			for b in ${CLASSA_BUDGETS:-1 2 4 6}; do
				gym_for "$b"
				ramp "classA-v1-b$b" "$CLASSA" v1 "$b" -- "${RAMP[@]}"
				read -r _ s w < <(grep "^$b " "$out/best-split.txt" || echo "$b 1 $b")
				ramp "classA-compiled-b$b-s${s}w$w" "$CLASSA" compiled "$b" "$s" "$w" native -- "${RAMP[@]}"
			done ;;
		v1)
			for b in $BUDGETS; do gym_for "$b"; ramp "v1-b$b" "$FULL" v1 "$b" -- "${RAMP[@]}"; done ;;
		v2-once) gym_for 1; ramp "v2-b1" "$FULL" v2 1 -- "${RAMP[@]}" ;;
		compiled)
			for b in $BUDGETS; do
				gym_for "$b"
				IFS='|' read -r -a list <<< "$(splits "$b")"
				for sw in "${list[@]}"; do
					read -r s w <<< "$sw"
					ramp "search-compiled-b$b-s${s}w$w" "$FULL" compiled "$b" "$s" "$w" native -- "${SEARCH[@]}" --start 4 --factor 1.6
				done
				read -r s w <<< "$(best_split "$b")"
				echo "$b $s $w" >> "$out/best-split.txt"
				ramp "compiled-b$b-s${s}w$w" "$FULL" compiled "$b" "$s" "$w" native -- "${RAMP[@]}"
			done ;;
		compiled-host)
			while read -r b s w; do
				gym_for "$b"
				ramp "compiled-host-b$b-s${s}w$w" "$FULL" compiled "$b" "$s" "$w" host -- "${RAMP[@]}"
			done < "$out/best-split.txt" ;;
		subset)
			for b in ${SUBSET_BUDGETS:-1 2 4}; do
				gym_for "$b"
				ramp "subset-v1-b$b" "$SUBSET" v1 "$b" -- "${RAMP[@]}"
				if [ "$b" = 1 ]; then ramp "subset-v2-b$b" "$SUBSET" v2 1 -- "${RAMP[@]}"; else ramp "subset-v2-b$b" "$SUBSET" v2 "$b" 1 -- "${RAMP[@]}"; fi
				read -r _ s w < <(grep "^$b " "$out/best-split.txt" || echo "$b 1 $b")
				ramp "subset-compiled-b$b-s${s}w$w" "$SUBSET" compiled "$b" "$s" "$w" native -- "${RAMP[@]}"
			done ;;
		*) log "unknown phase $phase" ;;
	esac
done
log "phases done: $*"
