#!/usr/bin/env bash
# Release 2, pure compiled set with K copies of each workflow (own tenant, own tokens, own route) and several load
# driver processes, so the load generator is not the limit. One executor core, then 4 shards in the 4-vCPU budget.
set -uo pipefail
cd "$HOME/wfrt-loadtest"
source kit/env.sh
export GYM_REMOTE=1 GYM_ADMIN=http://10.42.0.9:47090 GYM_ADDR=10.42.0.9 GYM_DNS=10.42.0.9:47053 GYM_PORT_MAP=
export PATH=$HOME/.cache/wfrt-bench/bin:$HOME/.cache/wfrt-bench/zig-x86_64-linux-0.17.0:$PATH
K=${K:-10}; RUN=${RUN:-copies}; OUT=results/$RUN; mkdir -p "$OUT"
DRIVE_CPUS=(2 3 10 11 8 9); ND=${#DRIVE_CPUS[@]}
log() { echo "$(date -u +%FT%TZ) $*" | tee -a "$OUT/r2m.log"; }
pkill -STOP -f "[b]uild-cache.mjs" || true
BASE=data/keys-r2-native.txt
{ cat $BASE; for j in $(seq 1 $((K - 1))); do sed "s/\$/c$j/" $BASE; done; } > "$OUT/keys-all.txt"
export LT_COPIES=$K LT_MODULE_STORE_MB=3072 LT_WFRT_ARGS="--target-in-flight 4096"
drives() { # label keysfile conclist hold
	local label=$1 keys=$2 conc=$3 hold=$4 i
	rm -f /tmp/kp.*; split -n r/$ND "$keys" /tmp/kp.
	i=0
	for f in /tmp/kp.*; do
		mkdir -p "$OUT/$label/p$i"
		taskset -c "${DRIVE_CPUS[$i]}" "$NODE26/node" kit/drive.mjs --manifest engine/compiled/manifest.json --pool data/pool.jsonl --keys "$f" \
			--components "$OUT/components-$label.json" --label "$label" --out "$OUT/$label/p$i" --warmup 10 --hold "$hold" --conc "$conc" --timeout 60 --reset live --restore none \
			> "$OUT/$label/p$i.log" 2>&1 &
		i=$((i + 1))
	done
	wait
	python3 - "$OUT/$label" "$label" << "PY" | tee -a "$OUT/r2m.log"
import re,sys,glob,collections
d,label=sys.argv[1],sys.argv[2]
steps=collections.defaultdict(list)
for f in sorted(glob.glob(d+"/p*.log")):
    n=0
    for l in open(f,errors="replace"):
        m=re.match(rf"{re.escape(label)} c=(\d+): ([\d.]+)/s ok ([\d.]+)% p50 (\d+) p99 (\d+) ms \| (.*?) \| gym",l)
        if m: steps[n].append(m.groups()); n+=1
for n,rows in sorted(steps.items()):
    tot=sum(float(r[1]) for r in rows); ok=sum(float(r[1])*float(r[2])/100 for r in rows)
    conc=sum(int(r[0]) for r in rows)
    cpu=re.sub(r"gym [0-9.c/%]+ gym-db [0-9.c/%]+ ","",rows[0][5]); cpu=re.sub(r" ?loadgen.*","",cpu)
    print(f"{label} drivers={len(rows)} c={conc}: {ok:.0f} ok/s ({100*ok/max(tot,1e-9):.1f}% of {tot:.0f}/s) p50 {max(int(r[3]) for r in rows)} p99 {max(int(r[4]) for r in rows)} ms | {cpu}")
PY
}
phase() { # label shards conclist-per-driver
	local label=$1 shards=$2 conc=$3
	kit/engine.sh stop > /dev/null 2>&1 || true
	log "$label: start, $shards shard(s), $K copies"
	KEYS=$BASE kit/engine.sh start compiled 4 "$shards" 1 native
	kit/engine.sh components "$OUT/components-$label.json"; cp "$OUT/components-$label.json" "$OUT/components-$label-q.json"
	grep -a "^ready\|copy c" logs/compiled.log | cut -c1-200 | tee -a "$OUT/r2m.log"
	cp data/keys-r2-native-x10.txt "$OUT/keys-$label.txt"
	log "$label: measured steps, per driver $conc"
	drives "$label" "$OUT/keys-$label.txt" "$conc" 30
}
export LT_WFRT_CPUS=4 LT_SUPPORT_CPUS=5,13,6,14
phase m1 1 200,400,700
unset LT_WFRT_CPUS LT_SUPPORT_CPUS
phase m4 4 300,600,1000
kit/engine.sh stop > /dev/null 2>&1 || true
pkill -CONT -f "[b]uild-cache.mjs" || true
date -u +%FT%TZ > "$OUT/DONE"
