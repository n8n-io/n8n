#!/usr/bin/env bash
# Rebuilds the native modules that the fallback host loads for Node 26, the
# Node.js version that runs the host in the load test. bench/cloud/setup.sh
# builds the workspace with the system Node, so these modules get that
# Node's ABI, and Node 26 cannot load them. Run it after each setup.sh.
#
#   native26.sh [tree]   tree: default $LT/src
#
# It rebuilds isolated-vm (the expression runtime of the host) with the
# node-gyp of Node 26, then checks that Node 26 loads it.
set -euo pipefail
source "$(dirname "$0")/env.sh"
tree=${1:-$SRC}
gyp=$NODE26/../lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js
for dir in "$tree"/node_modules/.pnpm/isolated-vm@*/node_modules/isolated-vm; do
	echo "rebuild $dir"
	(cd "$dir" && PATH=$NODE26:$PATH nice "$NODE26/node" "$gyp" rebuild --release -j "${JOBS:-4}" > "$LT/logs/native26.log" 2>&1) ||
		{ tail -20 "$LT/logs/native26.log"; exit 1; }
done
(cd "$tree/packages/@n8n/expression-runtime" &&
	"$NODE26/node" -e "const i = new (require('isolated-vm').Isolate)({ memoryLimit: 16 }); i.dispose(); console.log('isolated-vm loads in Node', process.version)")
