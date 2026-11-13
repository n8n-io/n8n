#!/usr/bin/env bash
# Starts or stops K reference n8n 2.42.2 instances (regular mode, SQLite),
# for prepare.mjs and pool.mjs. They are not measured: run them only when no
# load step runs.
#
#   ref.sh up <k> [cpus]     ports 47700 .. 47700+k-1
#   ref.sh down <k>
set -euo pipefail
source "$(dirname "$0")/env.sh"
cmd=$1 k=$2 cpus=${3:-4-7,12-15}
case $cmd in
	up)
		for ((i = 0; i < k; i++)); do
			echo "N8N_RUNNERS_BROKER_PORT=$((48700 + i))" | "$KIT/n8n.sh" "ref-$i" start $((47700 + i)) "$cpus" 6G
		done
		for ((i = 0; i < k; i++)); do
			for _ in $(seq 600); do curl -fs -o /dev/null "http://127.0.0.1:$((47700 + i))/rest/settings" && break; sleep 0.5; done
		done
		echo "reference n8n up on 47700..$((47700 + k - 1))"
		;;
	down) for ((i = 0; i < k; i++)); do unit_stop "ref-$i"; done ;;
esac
