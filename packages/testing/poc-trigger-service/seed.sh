#!/usr/bin/env bash
# Seed the PoC fleet: owner account, kafka topic + credential, and the demo
# workflow (Kafka trigger with seatCount replicas -> NoOp), then publish it.
# Idempotent-ish: safe to re-run; re-publishing bumps the version.
#
#   ./seed.sh [seatCount] [partitions]
set -euo pipefail
POC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SEATS="${1:-2}"
PARTITIONS="${2:-4}"
TOPIC="${TOPIC:-poc-events}"
GROUP="${GROUP:-poc-seats}"
WF_NAME="${WF_NAME:-PoC Kafka Seats}"
BASE="${N8N_BASE:-http://localhost:5678}"
EMAIL="poc@n8n.io"
PASSWORD="PocPassword1"
JAR="$POC_DIR/.poc-data/cookies.txt"
mkdir -p "$POC_DIR/.poc-data"

api() { # method path [json-body]
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -sS -b "$JAR" -c "$JAR" -X "$method" "$BASE/rest$path" \
      -H 'Content-Type: application/json' --data "$body"
  else
    curl -sS -b "$JAR" -c "$JAR" -X "$method" "$BASE/rest$path"
  fi
}

echo "[seed] ensuring kafka topic $TOPIC ($PARTITIONS partitions)"
docker exec n8n-poc-kafka-1 /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --create --if-not-exists \
  --topic "$TOPIC" --partitions "$PARTITIONS" --replication-factor 1 >/dev/null

echo "[seed] owner setup / login"
SETUP=$(api POST /owner/setup "{\"email\":\"$EMAIL\",\"firstName\":\"Poc\",\"lastName\":\"Owner\",\"password\":\"$PASSWORD\"}" || true)
if ! echo "$SETUP" | grep -q '"id"'; then
  api POST /login "{\"emailOrLdapLoginId\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" >/dev/null
fi

echo "[seed] kafka credential"
CRED=$(api POST /credentials '{"name":"PoC Kafka","type":"kafka","data":{"clientId":"n8n-poc","brokers":"localhost:9094","ssl":false,"authentication":false}}')
CRED_ID=$(echo "$CRED" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["id"])')
echo "[seed]   credential id: $CRED_ID"

echo "[seed] demo workflow (seatCount=$SEATS)"
WF_BODY=$(python3 - "$CRED_ID" "$SEATS" "$TOPIC" "$GROUP" "$WF_NAME" <<'EOF'
import json, sys
cred_id, seats = sys.argv[1], int(sys.argv[2])
topic, group, wf_name = sys.argv[3], sys.argv[4], sys.argv[5]
wf = {
    "name": wf_name,
    "nodes": [
        {
            "id": "kafka-trigger-node",
            "name": "Kafka Trigger",
            "type": "n8n-nodes-base.kafkaTrigger",
            "typeVersion": 2,
            "position": [0, 0],
            "parameters": {
                "topic": topic,
                "groupId": group,
                "resolveOffset": "onCompletion",
                "seatCount": seats,
                "options": {},
            },
            "credentials": {"kafka": {"id": cred_id, "name": "PoC Kafka"}},
        },
        {
            "id": "noop-node",
            "name": "NoOp",
            "type": "n8n-nodes-base.noOp",
            "typeVersion": 1,
            "position": [260, 0],
            "parameters": {},
        },
    ],
    "connections": {"Kafka Trigger": {"main": [[{"node": "NoOp", "type": "main", "index": 0}]]}},
    "settings": {"executionOrder": "v1"},
}
print(json.dumps(wf))
EOF
)
WF=$(api POST /workflows "$WF_BODY")
WF_ID=$(echo "$WF" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["id"])')
VERSION_ID=$(echo "$WF" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["versionId"])')
echo "[seed]   workflow id: $WF_ID  version: $VERSION_ID"

echo "[seed] publishing"
api POST "/workflows/$WF_ID/activate" "{\"versionId\":\"$VERSION_ID\",\"name\":\"poc v1\"}" >/dev/null

echo "$WF_ID" > "$POC_DIR/.poc-data/workflow-id"
echo "[seed] done. Watch seats with ./watch.sh"
