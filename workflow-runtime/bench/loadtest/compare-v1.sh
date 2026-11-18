#!/usr/bin/env bash
# Replays bundles on the compiled engine and compares each run with the v1 reference of the bundle (harness/replay.mjs).
#   cmp.sh <set name under results/> [concurrency]
set -uo pipefail
cd "$HOME/wfrt-loadtest"
export GYM_REMOTE=1 GYM_ADMIN=http://10.42.0.9:47090 GYM_ADDR=10.42.0.9 GYM_DNS=10.42.0.9:47053 GYM_PORT_MAP=
export ENGINE_TEST_DIR=$HOME/wfrt-loadtest/data/engine-test TZ=UTC WF_TARGET_RUNNER_ZONE=UTC
# With the node compiler, a node on the verified list runs compiled from its source, as in the load test.
export ENGINE_TEST_NODE_COMPILER=${ENGINE_TEST_NODE_COMPILER-$HOME/wfrt-loadtest/kit/lib/node-compiler.mjs}
export PATH=$HOME/wfrt-loadtest/e2e-cache/node-v26.7.0/bin:$PATH
SET=results/$1; CONC=${2:-6}
node data/engine-test/harness/replay.mjs "$SET" --concurrency "$CONC" --out "$SET/replay.jsonl" --engine "$HOME/wfrt-loadtest/src/packages/@n8n/workflow-lang/scripts/gym/engine-test-adapter.mjs" > "$SET/replay.log" 2>&1
echo "exit $?" >> "$SET/replay.log"
python3 - "$SET/replay.jsonl" << "PY" > "$SET/summary.txt"
import json,sys,collections
t=collections.Counter(); n=0
for l in open(sys.argv[1]):
    try: r=json.loads(l)
    except Exception: continue
    n+=1; t[r.get("match","?")]+=1
print("bundles",n,dict(t))
PY
echo DONE >> "$SET/summary.txt"
