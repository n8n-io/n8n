#!/usr/bin/env bash
set -euo pipefail

# Two-Instance A2A Demo
# Requires: n8nio/n8n:local (run pnpm build:docker first)

LLM_KEY="${N8N_AGENT_LLM_API_KEY:?Set N8N_AGENT_LLM_API_KEY}"
IMAGE="n8nio/n8n:local"
DIVIDER="======================================================================"
PORT1=5680
PORT2=5681
OWNER_EMAIL="nathan@n8n.io"
OWNER_PASSWORD="PlaywrightTest123"
SCOPES='["user:read","user:list","user:create","workflow:create","workflow:read","workflow:update","workflow:list","credential:create","project:create","project:update"]'

echo "$DIVIDER"
echo "  Starting two n8n instances..."
echo "$DIVIDER"

docker rm -f n8n-a2a-instance1 n8n-a2a-instance2 2>/dev/null || true

for i in 1 2; do
  port_var="PORT${i}"
  port="${!port_var}"
  docker run -d \
    --name "n8n-a2a-instance${i}" \
    --add-host=host.docker.internal:host-gateway \
    -p "${port}:5678" \
    -e N8N_ENCRYPTION_KEY="demo-key-instance-${i}" \
    -e N8N_DIAGNOSTICS_ENABLED=false \
    -e N8N_RUNNERS_MODE=internal \
    -e N8N_AGENT_LLM_API_KEY="$LLM_KEY" \
    -e E2E_TESTS=true \
    "$IMAGE" >/dev/null
  echo "  Instance ${i}: http://localhost:${port}"
done
echo ""

wait_for_ready() {
  local port=$1 name=$2
  echo -n "  Waiting for $name..."
  for _ in $(seq 1 60); do
    if curl -sf "http://localhost:${port}/healthz" >/dev/null 2>&1; then
      echo " ready!"
      return 0
    fi
    sleep 2
  done
  echo " TIMEOUT"; exit 1
}

wait_for_ready $PORT1 "instance1"
wait_for_ready $PORT2 "instance2"
echo ""

# Reset DB on both (creates owner/admin via E2E endpoint)
for port in $PORT1 $PORT2; do
  curl -sf -X POST "http://localhost:${port}/rest/e2e/reset" \
    -H "Content-Type: application/json" \
    -d "{
      \"owner\": {\"email\":\"${OWNER_EMAIL}\",\"password\":\"${OWNER_PASSWORD}\",\"firstName\":\"Owner\",\"lastName\":\"Demo\"},
      \"members\": [],
      \"admin\": {\"email\":\"admin@n8n.io\",\"password\":\"${OWNER_PASSWORD}\",\"firstName\":\"Admin\",\"lastName\":\"Demo\"},
      \"chat\": {\"email\":\"chat@n8n.io\",\"password\":\"${OWNER_PASSWORD}\",\"firstName\":\"Chat\",\"lastName\":\"Demo\"}
    }" >/dev/null
  echo "  DB reset on :${port}"
done

# Sign in on both
for i in 1 2; do
  port_var="PORT${i}"
  port="${!port_var}"
  curl -sf -c "/tmp/a2a-cookies${i}.txt" -X POST "http://localhost:${port}/rest/login" \
    -H "Content-Type: application/json" \
    -d "{\"emailOrLdapLoginId\":\"${OWNER_EMAIL}\",\"password\":\"${OWNER_PASSWORD}\"}" >/dev/null
  echo "  Signed in on :${port}"
done

# Create API keys
create_api_key() {
  local port=$1 cookie_file=$2
  curl -sf -b "$cookie_file" -X POST "http://localhost:${port}/rest/api-keys" \
    -H "Content-Type: application/json" \
    -d "{\"label\":\"A2A Demo\",\"scopes\":${SCOPES},\"expiresAt\":null}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',d)['rawApiKey'])"
}

API_KEY1=$(create_api_key $PORT1 /tmp/a2a-cookies1.txt)
API_KEY2=$(create_api_key $PORT2 /tmp/a2a-cookies2.txt)
echo "  API keys created"

# Create agents
AGENT_A_NAME="Orchestrator-$(openssl rand -hex 3)"
AGENT_B_NAME="RemoteWorker-$(openssl rand -hex 3)"

AGENT_A_ID=$(curl -sf -b /tmp/a2a-cookies1.txt -X POST "http://localhost:${PORT1}/rest/agents" \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"${AGENT_A_NAME}\",\"description\":\"Orchestrator that delegates to remote agents\",\"agentAccessLevel\":\"open\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',d)['id'])")

AGENT_B_ID=$(curl -sf -b /tmp/a2a-cookies2.txt -X POST "http://localhost:${PORT2}/rest/agents" \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"${AGENT_B_NAME}\",\"description\":\"Remote worker agent with workflows\",\"agentAccessLevel\":\"open\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',d)['id'])")

echo "  Agent A: ${AGENT_A_NAME} (${AGENT_A_ID}) on :${PORT1}"
echo "  Agent B: ${AGENT_B_NAME} (${AGENT_B_ID}) on :${PORT2}"

# Create workflow on Instance 2
WF_NAME="Remote Workflow $(openssl rand -hex 3)"
cat > /tmp/a2a-workflow.json <<WFJSON
{
  "name": "${WF_NAME}",
  "nodes": [
    {"id":"t1","name":"When clicking Test workflow","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[250,300],"parameters":{}},
    {"id":"s1","name":"Set","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[450,300],"parameters":{"assignments":{"assignments":[{"id":"a1","name":"result","value":"Hello from Instance 2! This crossed the network.","type":"string"}]}}}
  ],
  "connections": {"When clicking Test workflow":{"main":[[{"node":"Set","type":"main","index":0}]]}}
}
WFJSON
WF_ID=$(curl -sf -b /tmp/a2a-cookies2.txt -X POST "http://localhost:${PORT2}/rest/workflows" \
  -H "Content-Type: application/json" \
  -d @/tmp/a2a-workflow.json \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',d)['id'])")

echo "  Workflow: ${WF_NAME} (${WF_ID}) on :${PORT2}"

echo ""
echo "$DIVIDER"
echo "  TWO-INSTANCE A2A DEMO — READY"
echo "$DIVIDER"
echo ""
echo "  Instance 1: http://localhost:${PORT1}  (Agent A: ${AGENT_A_NAME})"
echo "  Instance 2: http://localhost:${PORT2}  (Agent B: ${AGENT_B_NAME})"
echo ""
echo "  Login: ${OWNER_EMAIL} / ${OWNER_PASSWORD}"
echo ""
echo "$DIVIDER"
echo "  CROSS-INSTANCE COMMANDS"
echo "$DIVIDER"
cat <<CMDS

  # SSE streaming: Agent A (instance1) → Agent B (instance2)
  curl -N -X POST http://localhost:${PORT1}/rest/agents/${AGENT_A_ID}/task \\
    -H 'Content-Type: application/json' \\
    -H 'Accept: text/event-stream' \\
    -H 'x-n8n-api-key: ${API_KEY1}' \\
    -d '{
      "prompt": "Delegate to ${AGENT_B_NAME} to run their workflow and report the result.",
      "externalAgents": [{
        "name": "${AGENT_B_NAME}",
        "description": "Remote worker agent with workflows",
        "url": "http://host.docker.internal:${PORT2}/rest/agents/${AGENT_B_ID}/task",
        "apiKey": "${API_KEY2}"
      }]
    }'

  # JSON: Agent A → Agent B
  curl -s -X POST http://localhost:${PORT1}/rest/agents/${AGENT_A_ID}/task \\
    -H 'Content-Type: application/json' \\
    -H 'x-n8n-api-key: ${API_KEY1}' \\
    -d '{
      "prompt": "Delegate to ${AGENT_B_NAME} to run their workflow.",
      "externalAgents": [{
        "name": "${AGENT_B_NAME}",
        "description": "Remote worker",
        "url": "http://host.docker.internal:${PORT2}/rest/agents/${AGENT_B_ID}/task",
        "apiKey": "${API_KEY2}"
      }]
    }' | jq .

  # Direct task to Agent B on instance2
  curl -s -X POST http://localhost:${PORT2}/rest/agents/${AGENT_B_ID}/task \\
    -H 'Content-Type: application/json' \\
    -H 'x-n8n-api-key: ${API_KEY2}' \\
    -d '{"prompt": "Run your workflow and report the result."}' | jq .

CMDS
echo "$DIVIDER"
echo "  BROWSER: http://localhost:${PORT1}/agents  or  http://localhost:${PORT2}/agents"
echo "  Cleanup: docker rm -f n8n-a2a-instance1 n8n-a2a-instance2"
echo "$DIVIDER"
