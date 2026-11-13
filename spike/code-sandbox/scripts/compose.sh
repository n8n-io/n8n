#!/usr/bin/env bash
# Runs docker compose for the local sandbox service stack (API, two runners,
# registry). It works on macOS (Docker Desktop) and on Linux.
#
#   spike/code-sandbox/scripts/compose.sh up -d
#   SANDBOX_CODE_POOLS='[...]' spike/code-sandbox/scripts/compose.sh up -d --no-deps api
#
#   SANDBOX_SERVICE_DIR  checkout of n8n-sandbox-service (default: ../n8n-sandbox-service-opus)
#   RUNNER_RUNTIME       privileged (default) or sysbox (Linux with Sysbox installed)
#   CODE_SANDBOX_IMAGE   code image for the runners (default: registry:5000/n8n-code-sandbox:latest)
#   SANDBOX_API_PORT     host port of the API (default: 8080)
set -euo pipefail
cd "$(dirname "$0")/../../.."

SANDBOX_SERVICE_DIR="$(cd "${SANDBOX_SERVICE_DIR:-../n8n-sandbox-service-opus}" && pwd)"
cd "$SANDBOX_SERVICE_DIR"

ARCH="$(uname -m | sed 's/aarch64/arm64/' | sed 's/x86_64/amd64/')"
export ARCH
export CODE_SANDBOX_IMAGE="${CODE_SANDBOX_IMAGE:-registry:5000/n8n-code-sandbox:latest}"

# The runners run Docker in Docker. compose.macos.yaml only sets privileged
# mode, so it serves Linux hosts without Sysbox too.
files=(-f compose.yaml -f compose.tls.yaml)
if [[ "${RUNNER_RUNTIME:-privileged}" == "sysbox" ]]; then
	files+=(-f compose.linux.yaml)
else
	files+=(-f compose.macos.yaml)
fi
if [[ -n "${SANDBOX_API_PORT:-}" && "$SANDBOX_API_PORT" != "8080" ]]; then
	override="${TMPDIR:-/tmp}/sandbox-api-port-$SANDBOX_API_PORT.yaml"
	cat >"$override" <<EOF
services:
  api:
    ports: !override
      - "$SANDBOX_API_PORT:8080"
EOF
	files+=(-f "$override")
fi
exec docker compose "${files[@]}" "$@"
