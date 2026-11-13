#!/usr/bin/env bash
# Starts the gym for the `--bundles` mode, as the gym runs of
# packages/@n8n/workflow-lang/scripts/gym do: vendor names resolve to
# GYM_ADDR, connections to GYM_ADDR:443 go to the gym's HTTPS listener, and
# the CA is the engine-test harness CA (bench/warm/warm.ts trusts that one).
#
#   bench/cloud/gym.sh <work-dir>      prints the environment for warm.ts, then runs in the background
#
# Needs the gym binary from `setup.sh --with-gym` ($TOOLS/bin/gym) and
# ENGINE_TEST_DIR (the engine-test folder with harness/ and sets/).
set -euo pipefail
source "$(dirname "$0")/common.sh"
WORK=${1:?work dir}
: "${ENGINE_TEST_DIR:?set ENGINE_TEST_DIR to the engine-test folder}"
GYM=${GYM_BIN:-$TOOLS/bin/gym}
[ -x "$GYM" ] || { echo "no gym binary at $GYM: run setup.sh --with-gym" >&2; exit 1; }
mkdir -p "$WORK"
CA_DIR=$ENGINE_TEST_DIR/harness/ca
[ -f "$CA_DIR/ca.pem" ] || "$GYM" ca -dir "$CA_DIR" > /dev/null
GYM_ADDR=10.255.0.53
ADMIN=${GYM_ADMIN_PORT:-47190} HTTPS=${GYM_HTTPS_PORT:-47543} DNS=${GYM_DNS_PORT:-47153}
SIM_HARNESS_TOKEN=harness \
LLM_BACKEND_URL=http://sim-llm-stub.ai-gym.svc.cluster.local:8000/v1 LLM_BACKEND_MODEL=stub \
  pinx "$AUX_CPUS" "$GYM" -data-dir="$WORK/gym-data" -dns-listen=127.0.0.1:$DNS -dns-answer=$GYM_ADDR \
  -bind-https=127.0.0.1:$HTTPS -admin=127.0.0.1:$ADMIN -ca-dir="$CA_DIR" -egress-allow=127.0.0.1 \
  -mem-limit=2048 -log-level=warn > "$WORK/gym.log" 2>&1 &
echo $! > "$WORK/gym.pid"
for _ in $(seq 1 300); do curl -fs "http://127.0.0.1:$ADMIN/readyz" > /dev/null 2>&1 && break; sleep 0.1; done
curl -fs "http://127.0.0.1:$ADMIN/readyz" > /dev/null || { echo "the gym did not start; see $WORK/gym.log" >&2; exit 1; }
cat > "$WORK/gym.env" << EOF
export GYM_ADMIN=http://127.0.0.1:$ADMIN
export GYM_DNS=127.0.0.1:$DNS
export GYM_PORT_MAP=443=$HTTPS
export ENGINE_TEST_DIR=$ENGINE_TEST_DIR
EOF
cat "$WORK/gym.env"
