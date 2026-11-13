#!/usr/bin/env bash
# The profile phases in order (see profile/run.sh), on the full runnable
# pool, with 1 wfrt shard and 1 host worker on one vCPU. (wfrt needs
# --max-routes, or a build where max_routes follows --max-modules, to hold
# more than 256 webhook workflows in one shard.)
#   profile/all.sh [out-dir]
set -uo pipefail
K=$HOME/wfrt-loadtest/kit
D=$HOME/wfrt-loadtest/data
O=${1:-$HOME/wfrt-loadtest/results/profile}
mkdir -p "$O"
CONC=${CONC:-5} HOLD=300 PERF_S=240 SHARDS=1 "$K/profile/run.sh" "$O" "$D/keys-full-certified.txt" mix
SHARDS=1 "$K/profile/run.sh" "$O" "$D/keys-two.txt" stepcost
SHARDS=1 "$K/profile/run.sh" "$O" "$D/keys-full-certified.txt" attrib
echo ALL PROFILE DONE
