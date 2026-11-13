#!/usr/bin/env bash
# End-to-end chaos test of wfrt and the fallback host (bench/chaos/run.mjs):
# Code steps that loop, use all memory, call process.exit, throw after they
# end or leave a socket open run together with healthy executions; then the
# host server process is killed while steps run, and then the whole host
# stops and comes back. Only the faulty executions may fail, and none may
# hang. Needs Node.js and a built fallback host.
set -euo pipefail
cd "$(dirname "$0")/.."
zig build -Drelease=true
(cd ../packages/@n8n/workflow-fallback-host && pnpm build:unchecked > /dev/null)
node bench/chaos/run.mjs "${BASE_PORT:-28520}"
