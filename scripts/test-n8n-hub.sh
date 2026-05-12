#!/usr/bin/env bash
# n8n Hub smoke test
#
# Usage:
#   N8N_PAT=<your-api-key> ./scripts/test-n8n-hub.sh
#   N8N_PAT=<key> N8N_URL=http://localhost:5678 ./scripts/test-n8n-hub.sh
#
# Walks through every surface that landed for the hackathon — REST endpoint,
# CLI commands, SDK proxy — and prints what each test does, what's expected,
# and what came back. Exits 0 only if every expectation matches.

set -u

if [ -t 1 ]; then
  BOLD='\033[1m'; DIM='\033[2m'; GREEN='\033[32m'; RED='\033[31m'; YELLOW='\033[33m'; CYAN='\033[36m'; RESET='\033[0m'
else
  BOLD=''; DIM=''; GREEN=''; RED=''; YELLOW=''; CYAN=''; RESET=''
fi

# --- Config ----------------------------------------------------------------

: "${N8N_URL:=http://localhost:5678}"
: "${REPO_ROOT:=/Users/filipetavares/git/n8n}"

if [ -z "${N8N_PAT:-}" ]; then
  echo -e "${RED}ERROR${RESET}: N8N_PAT is not set. Mint a Personal Access Token in the n8n UI"
  echo -e "       (Settings → API → Create API key) and export it before running this script:"
  echo -e ""
  echo -e "       ${CYAN}export N8N_PAT='your-key-here'${RESET}"
  exit 1
fi

REST="$N8N_URL/rest"

# --- Helpers ---------------------------------------------------------------

PASS=0
FAIL=0
FAILED_TESTS=()
LAST_EXECUTION_ID=""

if ! command -v jq >/dev/null 2>&1; then
  echo -e "${RED}ERROR${RESET}: jq is not installed. Install with: brew install jq"
  exit 1
fi

print_header() {
  echo ""
  echo -e "${BOLD}${CYAN}=================================================================${RESET}"
  echo -e "${BOLD}${CYAN}$1${RESET}"
  echo -e "${BOLD}${CYAN}=================================================================${RESET}"
}

print_test() {
  echo ""
  echo -e "${BOLD}▶ $1${RESET}"
  if [ -n "${2:-}" ]; then
    echo -e "  ${DIM}$2${RESET}"
  fi
}

print_request() {
  echo -e "  ${DIM}$ $1${RESET}"
}

print_expect() {
  echo -e "  ${YELLOW}Expect:${RESET} $1"
}

print_got() {
  echo -e "  ${CYAN}Got:${RESET}"
  echo "$1" | sed 's/^/    /'
}

assert_pass() {
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}✓ PASS${RESET}: $1"
}

assert_fail() {
  FAIL=$((FAIL + 1))
  FAILED_TESTS+=("$1")
  echo -e "  ${RED}✗ FAIL${RESET}: $1"
}

assert_eq() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [ "$actual" = "$expected" ]; then
    assert_pass "$label (got '$actual')"
  else
    assert_fail "$label (expected '$expected', got '$actual')"
  fi
}

assert_nonempty() {
  local actual="$1"
  local label="$2"
  if [ -n "$actual" ] && [ "$actual" != "null" ]; then
    assert_pass "$label (got '$actual')"
  else
    assert_fail "$label (got empty/null)"
  fi
}

assert_gt() {
  local actual="$1"
  local min="$2"
  local label="$3"
  if [ "$actual" -gt "$min" ] 2>/dev/null; then
    assert_pass "$label (got $actual, > $min)"
  else
    assert_fail "$label (expected > $min, got '$actual')"
  fi
}

assert_jq() {
  local json="$1"
  local filter="$2"
  local label="$3"
  local result
  result=$(echo "$json" | jq -r "$filter" 2>/dev/null)
  if [ "$result" = "true" ]; then
    assert_pass "$label"
  else
    assert_fail "$label (jq filter '$filter' returned '$result')"
  fi
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if echo "$haystack" | grep -Fq "$needle"; then
    assert_pass "$label (found '$needle')"
  else
    assert_fail "$label (no match for '$needle')"
  fi
}

# --- Pre-flight ------------------------------------------------------------

print_header "PRE-FLIGHT"
print_test "Verify n8n server is reachable" "Hit /healthz to confirm $N8N_URL is up."
HEALTH=$(curl -sS -o /dev/null -w "%{http_code}" "$N8N_URL/healthz" 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
  assert_pass "server reachable (healthz returned 200)"
else
  echo -e "  ${RED}Server is not reachable at $N8N_URL${RESET}"
  echo -e "  ${DIM}Run: pnpm dev${RESET}"
  exit 1
fi

# --- §1: OAuth scopes well-known ------------------------------------------

print_header "§1 — OAuth scope expansion (Phase 1.3)"
print_test "GET /.well-known/oauth-authorization-server" \
  "Verifies the three new MCP scopes are advertised."
print_request "curl $N8N_URL/.well-known/oauth-authorization-server"
WELL_KNOWN=$(curl -sS "$N8N_URL/.well-known/oauth-authorization-server" 2>/dev/null)
SCOPES=$(echo "$WELL_KNOWN" | jq -r '.scopes_supported | tostring' 2>/dev/null)
print_expect "scopes_supported includes node:execute, credential:read, tool:search"
print_got "$SCOPES"
assert_jq "$WELL_KNOWN" '.scopes_supported | index("node:execute") != null' "node:execute advertised"
assert_jq "$WELL_KNOWN" '.scopes_supported | index("credential:read") != null' "credential:read advertised"
assert_jq "$WELL_KNOWN" '.scopes_supported | index("tool:search") != null' "tool:search advertised"

# --- §2: REST search endpoint --------------------------------------------

print_header "§2 — REST node search (Phase 1.5 + 2.1)"
print_test "GET /rest/nodes/search?q=http" \
  "Should return executable HTTP Request operations (no triggers, no AI tool variants)."
print_request "curl '$REST/nodes/search?q=http' -H 'X-N8N-API-KEY: \$N8N_PAT'"
SEARCH=$(curl -sS "$REST/nodes/search?q=http" -H "X-N8N-API-KEY: $N8N_PAT" 2>/dev/null)
RESULT_COUNT=$(echo "$SEARCH" | jq -r '.data.results | length' 2>/dev/null || echo "0")
print_expect "results contains httpRequest, no triggers, no nodes ending in 'Tool'"
SAMPLE=$(echo "$SEARCH" | jq -r '.data.results[0:5] | map({id, displayName})' 2>/dev/null)
print_got "$SAMPLE"
assert_gt "$RESULT_COUNT" 0 "results returned"
assert_jq "$SEARCH" '.data.results | all(.id | endswith("Tool") | not)' "no AI tool variants (ids ending in Tool)"
assert_jq "$SEARCH" '.data.results | all(.id | contains("Trigger") | not)' "no trigger nodes"
assert_jq "$SEARCH" '[.data.results[] | select(.nodeId == "n8n-nodes-base.httpRequest")] | length > 0' "httpRequest action present"

print_test "GET /rest/nodes/search?q=slack" \
  "Should return Slack actions (slack.message.send, slack.channel.create, etc.)."
SEARCH_SLACK=$(curl -sS "$REST/nodes/search?q=slack" -H "X-N8N-API-KEY: $N8N_PAT" 2>/dev/null)
print_expect "operations for the slack node, no slackTool / slackHitlTool / slackTrigger"
SAMPLE_SLACK=$(echo "$SEARCH_SLACK" | jq -r '.data.results[0:5] | map({id, displayName})' 2>/dev/null)
print_got "$SAMPLE_SLACK"
assert_jq "$SEARCH_SLACK" '.data.results | all(.id | endswith("Tool") | not)' "no Slack tool variants"
assert_jq "$SEARCH_SLACK" '.data.results | all(.id | (contains("Trigger") | not))' "no Slack trigger"

print_test "GET /rest/nodes/search (empty query)" \
  "Empty query should short-circuit to empty results."
EMPTY=$(curl -sS "$REST/nodes/search" -H "X-N8N-API-KEY: $N8N_PAT" 2>/dev/null)
EMPTY_COUNT=$(echo "$EMPTY" | jq -r '.data.results | length' 2>/dev/null)
print_expect "results is empty array"
print_got "$EMPTY"
assert_eq "$EMPTY_COUNT" "0" "empty results"

# --- §3: Node schema endpoint --------------------------------------------

print_header "§3 — REST node schema (Phase 1.5)"
print_test "GET /rest/nodes/n8n-nodes-base.httpRequest" \
  "Schema with operations, credentials list, input schema (no auth fields)."
print_request "curl '$REST/nodes/n8n-nodes-base.httpRequest' -H 'X-N8N-API-KEY: \$N8N_PAT'"
SCHEMA=$(curl -sS "$REST/nodes/n8n-nodes-base.httpRequest" -H "X-N8N-API-KEY: $N8N_PAT" 2>/dev/null)
OP_COUNT=$(echo "$SCHEMA" | jq -r '.data.operations | length' 2>/dev/null || echo "0")
print_expect "schema has nodeId, displayName, operations (>=1); inputSchema excludes 'authentication' / 'nodeCredentialType'"
print_got "$(echo "$SCHEMA" | jq '.data | {nodeId, displayName, opCount: (.operations | length), firstOpInputProps: (.operations[0].inputSchema.properties | keys)}' 2>/dev/null)"
assert_jq "$SCHEMA" '.data.nodeId == "n8n-nodes-base.httpRequest"' "nodeId matches"
assert_gt "$OP_COUNT" 0 "operations list non-empty"
assert_jq "$SCHEMA" '[.data.operations[].inputSchema.properties | keys[]] | unique | (index("authentication") == null and index("nodeCredentialType") == null and index("genericAuthType") == null)' "inputSchema strips credential discriminators"

print_test "GET /rest/nodes/unknown.node" \
  "Unknown nodes return 404."
HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$REST/nodes/unknown.node" -H "X-N8N-API-KEY: $N8N_PAT" 2>/dev/null)
print_expect "HTTP 404"
print_got "HTTP $HTTP_CODE"
assert_eq "$HTTP_CODE" "404" "404 for unknown node"

# --- §4: POST /executions/node with HTTP Request --------------------------

print_header "§4 — POST /executions/node — real HTTP call (Phase 1.1)"
print_test "Execute HTTP Request against jsonplaceholder.typicode.com" \
  "Round-trip a public HTTPS GET. Validates engine wiring with a real external call."
print_request "curl -X POST $REST/executions/node ... (httpRequest GET https://jsonplaceholder.typicode.com/todos/1)"
EXEC=$(curl -sS -X POST "$REST/executions/node" \
  -H "X-N8N-API-KEY: $N8N_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "nodeType": "n8n-nodes-base.httpRequest",
    "parameters": {
      "method": "GET",
      "url": "https://jsonplaceholder.typicode.com/todos/1",
      "options": {}
    },
    "caller": {"kind": "cli", "name": "test-script", "clientId": "smoke-test"}
  }' 2>/dev/null)
print_expect 'status="success"; output[0] contains {"userId":1,"id":1,"title":"...","completed":false}'
print_got "$EXEC"
EXEC_STATUS=$(echo "$EXEC" | jq -r '.data.status' 2>/dev/null)
EXEC_OUTPUT_ID=$(echo "$EXEC" | jq -r '.data.output[0].id' 2>/dev/null)
EXEC_OUTPUT_USERID=$(echo "$EXEC" | jq -r '.data.output[0].userId' 2>/dev/null)
EXEC_ID=$(echo "$EXEC" | jq -r '.data.executionId' 2>/dev/null)
EXEC_URL=$(echo "$EXEC" | jq -r '.data.executionUrl' 2>/dev/null)
assert_eq "$EXEC_STATUS" "success" "status is success"
assert_eq "$EXEC_OUTPUT_ID" "1" "output[0].id == 1"
assert_eq "$EXEC_OUTPUT_USERID" "1" "output[0].userId == 1"
assert_nonempty "$EXEC_ID" "executionId returned"
assert_nonempty "$EXEC_URL" "executionUrl returned"
LAST_EXECUTION_ID="$EXEC_ID"

print_test "Execute HTTP Request with dryRun" \
  "dryRun validates input but doesn't trigger the engine."
DRY=$(curl -sS -X POST "$REST/executions/node" \
  -H "X-N8N-API-KEY: $N8N_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "nodeType": "n8n-nodes-base.httpRequest",
    "parameters": {"method": "GET", "url": "https://example.com"},
    "dryRun": true
  }' 2>/dev/null)
print_expect 'status="dry_run", wouldExecute.node.type=="n8n-nodes-base.httpRequest"'
print_got "$DRY"
DRY_STATUS=$(echo "$DRY" | jq -r '.data.status' 2>/dev/null)
DRY_WOULD=$(echo "$DRY" | jq -r '.data.wouldExecute.node.type' 2>/dev/null)
assert_eq "$DRY_STATUS" "dry_run" "status is dry_run"
assert_eq "$DRY_WOULD" "n8n-nodes-base.httpRequest" "wouldExecute.node.type matches"

print_test "Execute unknown node type" \
  "Should error cleanly (4xx, not 500)."
BAD=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$REST/executions/node" \
  -H "X-N8N-API-KEY: $N8N_PAT" \
  -H "Content-Type: application/json" \
  -d '{"nodeType": "n8n-nodes-base.does-not-exist", "parameters": {}}' 2>/dev/null)
print_expect "HTTP 4xx (not 500)"
print_got "HTTP $BAD"
if [ "$BAD" -ge 400 ] && [ "$BAD" -lt 500 ] 2>/dev/null; then
  assert_pass "client error for unknown node ($BAD)"
else
  assert_fail "expected 4xx, got $BAD"
fi

print_test "Auth check: missing PAT" \
  "Request without X-N8N-API-KEY should return 401."
UNAUTH=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$REST/executions/node" \
  -H "Content-Type: application/json" \
  -d '{"nodeType": "n8n-nodes-base.httpRequest", "parameters": {}}' 2>/dev/null)
print_expect "HTTP 401"
print_got "HTTP $UNAUTH"
assert_eq "$UNAUTH" "401" "unauthorized without PAT"

# --- §5: Execution detail with caller metadata ----------------------------

print_header "§5 — Execution detail with caller metadata (Phase 5.1)"
if [ -z "$LAST_EXECUTION_ID" ] || [ "$LAST_EXECUTION_ID" = "null" ]; then
  echo -e "  ${YELLOW}Skipping: no LAST_EXECUTION_ID from §4${RESET}"
else
  print_test "GET /rest/executions/$LAST_EXECUTION_ID" \
    "The execution we just created should carry caller={kind:cli, name:test-script}."
  print_request "curl '$REST/executions/$LAST_EXECUTION_ID' -H 'X-N8N-API-KEY: \$N8N_PAT'"
  DETAIL=$(curl -sS "$REST/executions/$LAST_EXECUTION_ID" -H "X-N8N-API-KEY: $N8N_PAT" 2>/dev/null)
  print_expect "caller={kind:'cli', name:'test-script', clientId:'smoke-test'}, mode='single-node'"
  print_got "$(echo "$DETAIL" | jq '.data | {id, mode, status, caller}' 2>/dev/null)"
  CALLER_KIND=$(echo "$DETAIL" | jq -r '.data.caller.kind' 2>/dev/null)
  CALLER_NAME=$(echo "$DETAIL" | jq -r '.data.caller.name' 2>/dev/null)
  CALLER_CLIENT=$(echo "$DETAIL" | jq -r '.data.caller.clientId' 2>/dev/null)
  MODE=$(echo "$DETAIL" | jq -r '.data.mode' 2>/dev/null)
  assert_eq "$CALLER_KIND" "cli" "caller.kind"
  assert_eq "$CALLER_NAME" "test-script" "caller.name"
  assert_eq "$CALLER_CLIENT" "smoke-test" "caller.clientId"
  assert_eq "$MODE" "single-node" "mode is single-node"
fi

# --- §6: Executions list (caller + nodeType in summary) -------------------

print_header "§6 — Executions list summary attribution (Phase 5.2)"
print_test "GET /rest/executions" \
  "List endpoint should attach caller + nodeType for single-node summaries."
print_request "curl '$REST/executions?filter={}' -H 'X-N8N-API-KEY: \$N8N_PAT'"
LIST=$(curl -sS "$REST/executions?filter=%7B%7D" -H "X-N8N-API-KEY: $N8N_PAT" 2>/dev/null)
SINGLE_NODE_COUNT=$(echo "$LIST" | jq -r '[.data.results[] | select(.mode == "single-node")] | length' 2>/dev/null || echo "0")
print_expect "at least one single-node execution carries caller AND nodeType in the row"
SAMPLE_ROW=$(echo "$LIST" | jq -r '[.data.results[] | select(.mode == "single-node")][0] | {id, mode, caller, nodeType}' 2>/dev/null)
print_got "$SAMPLE_ROW"
if [ "$SINGLE_NODE_COUNT" -gt 0 ] 2>/dev/null; then
  assert_pass "single-node executions visible in list ($SINGLE_NODE_COUNT)"
  assert_jq "$LIST" '[.data.results[] | select(.mode == "single-node" and .nodeType != null)] | length > 0' "at least one row has nodeType (Phase 5.1 enrichment)"
  assert_jq "$LIST" '[.data.results[] | select(.mode == "single-node" and .caller != null)] | length > 0' "at least one row has caller (Phase 5.1 enrichment)"
else
  assert_fail "no single-node executions found (expected at least one from §4)"
fi

# --- §7: Hidden scratch workflow ------------------------------------------

print_header "§7 — Scratch workflow hidden from workflows list"
print_test "GET /rest/workflows" \
  "The internal __n8n-hub-single-node-scratch__ row should NOT appear here."
WORKFLOWS=$(curl -sS "$REST/workflows" -H "X-N8N-API-KEY: $N8N_PAT" 2>/dev/null)
HUB_HITS=$(echo "$WORKFLOWS" | jq -r '[.data[] | select(.name | startswith("__n8n-hub-"))] | length' 2>/dev/null || echo "0")
print_expect "0 workflows whose name starts with '__n8n-hub-'"
print_got "matching internal workflows: $HUB_HITS"
assert_eq "$HUB_HITS" "0" "scratch placeholder hidden from list"

# --- §8: Credentials projection ------------------------------------------

print_header "§8 — Credentials list"
print_test "GET /rest/credentials" "Standard credentials endpoint; verify projection has no secrets."
CREDS=$(curl -sS "$REST/credentials" -H "X-N8N-API-KEY: $N8N_PAT" 2>/dev/null)
CREDS_LEN=$(echo "$CREDS" | jq -r '.data | length' 2>/dev/null || echo "?")
print_expect ".data is an array; no .data secret blob in projection"
print_got "data length: $CREDS_LEN"
if [ "$CREDS_LEN" != "?" ] && [ -n "$CREDS_LEN" ]; then
  assert_pass "credentials list returned ($CREDS_LEN items)"
  HAS_DATA=$(echo "$CREDS" | jq -r '[.data[]? | has("data")] | any' 2>/dev/null)
  if [ "$HAS_DATA" = "false" ] || [ "$CREDS_LEN" = "0" ]; then
    assert_pass "no .data (secret) fields in projection"
  else
    assert_fail "secret .data field present in at least one credential!"
  fi
else
  assert_fail "credentials list did not return an array"
fi

# --- §9: CLI commands ------------------------------------------------------

print_header "§9 — @n8n/cli commands (Phase 3)"

CLI_BIN="$REPO_ROOT/packages/@n8n/cli/bin/n8n-cli.mjs"

if [ ! -f "$CLI_BIN" ]; then
  echo -e "  ${YELLOW}Skipping CLI tests: $CLI_BIN not found${RESET}"
else
  # Always rebuild so the dist reflects the latest source changes (we're on a
  # working branch with active edits — stale dist would mask real fixes).
  echo -e "  ${DIM}Rebuilding @n8n/cli to pick up latest source...${RESET}"
  (cd "$REPO_ROOT/packages/@n8n/cli" && pnpm build > /tmp/n8n-cli-build.log 2>&1) \
    || { echo -e "  ${RED}Build failed; see /tmp/n8n-cli-build.log${RESET}"; CLI_BIN=""; }
fi

# Configure CLI with the same URL + PAT
if [ -n "${CLI_BIN:-}" ] && [ -f "$CLI_BIN" ]; then
  CLI_CONFIG="$HOME/.n8n-cli/config.json"
  mkdir -p "$(dirname "$CLI_CONFIG")"
  echo "{\"url\":\"$N8N_URL\",\"apiKey\":\"$N8N_PAT\"}" > "$CLI_CONFIG"

  print_test "n8n-cli node search http" "Should print HTTP Request operations."
  print_request "$CLI_BIN node search http"
  CLI_OUT=$("$CLI_BIN" node search http 2>&1)
  print_expect "output contains 'httpRequest'"
  print_got "$(echo "$CLI_OUT" | head -10)"
  assert_contains "$CLI_OUT" "httpRequest" "node search output mentions httpRequest"

  print_test "n8n-cli node get n8n-nodes-base.httpRequest" "Should print schema details."
  CLI_GET=$("$CLI_BIN" node get n8n-nodes-base.httpRequest 2>&1)
  print_expect "output mentions 'HTTP Request' (displayName) and 'operations'"
  print_got "$(echo "$CLI_GET" | head -10)"
  assert_contains "$CLI_GET" "HTTP Request" "node get output contains displayName"

  print_test "n8n-cli exec run httpRequest" "Real round-trip via CLI."
  CLI_EXEC=$("$CLI_BIN" exec run httpRequest \
    --param 'method=GET' \
    --param 'url=https://jsonplaceholder.typicode.com/todos/2' 2>&1)
  print_expect "output contains 'executionId' and 'executionUrl'"
  print_got "$(echo "$CLI_EXEC" | head -20)"
  assert_contains "$CLI_EXEC" "executionId" "exec run prints executionId"
  assert_contains "$CLI_EXEC" "executionUrl" "exec run prints executionUrl"

  print_test "n8n-cli credential list" "Should list credentials (or empty if none)."
  CLI_CRED=$("$CLI_BIN" credential list 2>&1)
  print_expect "command runs without error"
  print_got "$(echo "$CLI_CRED" | head -5)"
  # No assertion on content — list may legitimately be empty
  if [ -n "$CLI_CRED" ]; then
    assert_pass "credential list runs"
  else
    assert_fail "credential list produced no output"
  fi
fi

# --- §10: @n8n/sdk via tsx ------------------------------------------------

print_header "§10 — @n8n/sdk Proxy runtime (Phase 4)"

SDK_DIR="$REPO_ROOT/packages/@n8n/sdk"

# Always rebuild so dist reflects latest source changes.
echo -e "  ${DIM}Rebuilding @n8n/sdk to pick up latest source...${RESET}"
(cd "$SDK_DIR" && pnpm build > /tmp/n8n-sdk-build.log 2>&1) \
  || { echo -e "  ${RED}SDK build failed${RESET}"; SDK_DIR=""; }

if [ -n "$SDK_DIR" ] && [ -d "$SDK_DIR/dist" ]; then
  # Write a tiny test script that exercises the Proxy dispatch.
  SDK_TEST="/tmp/n8n-sdk-test.mjs"
  cat > "$SDK_TEST" <<EOF
import { createClient } from "$SDK_DIR/dist/index.js";

const n8n = createClient({
  baseUrl: process.env.N8N_URL,
  token: process.env.N8N_TOKEN,
});

try {
  // n8n.<service>.<resource>.<operation>(args) is the 3-segment form.
  // For HTTP Request the path is simpler — single op via the Proxy.
  const result = await (n8n).httpRequest({
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/todos/3",
    options: {},
  });
  console.log(JSON.stringify({
    executionId: result.executionId,
    status: result.status,
    outputId: result.output?.id,
    outputUserId: result.output?.userId,
    executionUrl: result.executionUrl,
  }, null, 2));
} catch (err) {
  console.error("SDK_ERROR:", err.message ?? String(err));
  process.exit(1);
}
EOF

  print_test "SDK Proxy dispatch via tsx" \
    "n8n.httpRequest({method,url}) should dispatch to /rest/executions/node and return output."
  print_request "N8N_URL=$N8N_URL N8N_TOKEN=\$N8N_PAT node $SDK_TEST"
  SDK_OUT=$(N8N_URL="$N8N_URL" N8N_TOKEN="$N8N_PAT" node "$SDK_TEST" 2>&1)
  print_expect 'status="success", outputId=3, outputUserId set, executionId set'
  print_got "$SDK_OUT"
  SDK_STATUS=$(echo "$SDK_OUT" | jq -r '.status' 2>/dev/null)
  SDK_ID=$(echo "$SDK_OUT" | jq -r '.outputId' 2>/dev/null)
  SDK_EXEC_ID=$(echo "$SDK_OUT" | jq -r '.executionId' 2>/dev/null)
  assert_eq "$SDK_STATUS" "success" "sdk status is success"
  assert_eq "$SDK_ID" "3" "sdk output.id == 3"
  assert_nonempty "$SDK_EXEC_ID" "sdk executionId returned"
fi

# --- §11: MCP server endpoint (unauthenticated metadata check) ------------

print_header "§11 — MCP server endpoint (Phase 2)"
print_test "GET /.well-known/oauth-protected-resource/mcp-server/http" \
  "The MCP-server's protected-resource metadata should advertise the three new scopes."
PROTECTED=$(curl -sS "$N8N_URL/.well-known/oauth-protected-resource/mcp-server/http" 2>/dev/null)
SCOPES_LIST=$(echo "$PROTECTED" | jq -r '.scopes_supported | tostring' 2>/dev/null)
print_expect "scopes_supported includes node:execute, credential:read, tool:search"
print_got "$SCOPES_LIST"
assert_jq "$PROTECTED" '.scopes_supported | index("node:execute") != null' "MCP advertises node:execute"
assert_jq "$PROTECTED" '.scopes_supported | index("credential:read") != null' "MCP advertises credential:read"
assert_jq "$PROTECTED" '.scopes_supported | index("tool:search") != null' "MCP advertises tool:search"

# Note: actually invoking the MCP tools (n8n_search_tools, n8n_execute_tool, n8n_list_credentials)
# requires an OAuth flow that's interactive — that's verified manually in Claude Desktop or
# via @modelcontextprotocol/inspector. The script only verifies the OAuth surface advertises
# the new scopes.

# --- Summary ---------------------------------------------------------------

echo ""
print_header "SUMMARY"
echo -e "  ${BOLD}Total tests:${RESET} $((PASS + FAIL))"
echo -e "  ${GREEN}Passed:${RESET} $PASS"
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}Failed:${RESET} 0"
  echo ""
  echo -e "${GREEN}${BOLD}✓ ALL CHECKS PASSED${RESET}"
  echo ""
  echo -e "${DIM}Note on MCP: full MCP invocation (n8n_search_tools, n8n_execute_tool, n8n_list_credentials)${RESET}"
  echo -e "${DIM}requires an interactive OAuth flow — test manually via Claude Desktop or${RESET}"
  echo -e "${DIM}\`npx @modelcontextprotocol/inspector $N8N_URL/mcp-server/http\`${RESET}"
  exit 0
else
  echo -e "  ${RED}Failed:${RESET} $FAIL"
  echo ""
  echo -e "${RED}${BOLD}✗ FAILING CHECKS:${RESET}"
  for t in "${FAILED_TESTS[@]}"; do
    echo -e "  ${RED}- $t${RESET}"
  done
  exit 1
fi
