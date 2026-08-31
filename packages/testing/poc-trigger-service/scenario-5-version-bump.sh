#!/usr/bin/env bash
# Version bump under load: republish the workflow mid-stream. Holders swap the
# trigger in place (same seat, same epoch, new version); after the publish
# commits, no execution of the old version is ever created — the version-scoped
# fence retires it fleet-wide, atomically.
#   ./scenario-5-version-bump.sh [count]
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scenario-lib.sh"

COUNT="${1:-600}"
BASE="${N8N_BASE:-http://localhost:5678}"
JAR="$POC_DIR/.poc-data/cookies.txt"
WF_ID=$(workflow_id)

api() {
  local method="$1" path="$2" body="${3:-}"
  curl -sS -b "$JAR" -c "$JAR" -X "$method" "$BASE/rest$path" \
    -H 'Content-Type: application/json' ${body:+--data "$body"}
}

OLD_VERSION=$(psql_q "SELECT \"activeVersionId\" FROM workflow_entity WHERE id = '$WF_ID'")
EPOCHS_BEFORE=$(psql_q "SELECT array_agg(\"leaseEpoch\" ORDER BY \"seatIndex\") FROM workflow_trigger_seat WHERE \"workflowId\" = '$WF_ID'")
BASELINE=$(execution_count)

echo "[scenario-5] baseline: $BASELINE, active version: $OLD_VERSION"
echo "[scenario-5] producing $COUNT messages in the background"
"$POC_DIR/produce.sh" "$COUNT" "s5-$(date +%s)" &
PRODUCER=$!

sleep 2
echo "[scenario-5] editing + republishing mid-stream"
# Nudge a node position: content change -> new versionId.
WF=$(api GET "/workflows/$WF_ID")
PATCH=$(echo "$WF" | python3 -c '
import json, sys, random
wf = json.load(sys.stdin)["data"]
for node in wf["nodes"]:
    if node["name"] == "NoOp":
        node["position"] = [node["position"][0] + random.randint(1, 50), node["position"][1]]
print(json.dumps({
    "name": wf["name"],
    "nodes": wf["nodes"],
    "connections": wf["connections"],
    "settings": wf["settings"],
    "versionId": wf["versionId"],
}))
')
UPDATED=$(api PATCH "/workflows/$WF_ID" "$PATCH")
NEW_VERSION=$(echo "$UPDATED" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["versionId"])')
api POST "/workflows/$WF_ID/activate" "{\"versionId\":\"$NEW_VERSION\",\"name\":\"bump under load\"}" >/dev/null
PUBLISHED_AT=$(psql_q 'SELECT now()')
echo "[scenario-5] published $NEW_VERSION at $PUBLISHED_AT"

wait "$PRODUCER"
FINAL=$(wait_for_count "$((BASELINE + COUNT))" 240 || true)
FINAL=$(wait_settled 16 120)
assert_eq "$((FINAL - BASELINE))" "$COUNT" "executions across the version bump (nothing lost or doubled)"

EPOCHS_AFTER=$(psql_q "SELECT array_agg(\"leaseEpoch\" ORDER BY \"seatIndex\") FROM workflow_trigger_seat WHERE \"workflowId\" = '$WF_ID'")
assert_eq "$EPOCHS_AFTER" "$EPOCHS_BEFORE" "seat epochs unchanged (in-place swap, no ownership churn)"

SWAPPED=$(psql_q "SELECT count(*) FROM workflow_trigger_seat WHERE \"workflowId\" = '$WF_ID' AND \"actualVersionId\" = '$NEW_VERSION' AND \"actualState\" = 'registered'")
assert_eq "$SWAPPED" "$(psql_q "SELECT count(*) FROM workflow_trigger_seat WHERE \"workflowId\" = '$WF_ID' AND \"desiredState\" = 'active'")" "holders re-registered at the new version"

# The hard invariant: after the publish committed, no old-version execution was created.
STRAGGLERS=$(psql_q "SELECT count(*) FROM execution_entity WHERE \"workflowId\" = '$WF_ID' AND \"workflowVersionId\" = '$OLD_VERSION' AND \"createdAt\" > '$PUBLISHED_AT'")
assert_eq "$STRAGGLERS" 0 "old-version executions created after the publish"
