#!/usr/bin/env bash
#
# End-to-end Romeo weekly report — CLI flavor.
#
# Mirrors scripts/romeo-report-e2e.ts (SDK) but issues every node-execution
# through `n8n-cli exec run …` so each step shows up in the executions UI
# with `caller: {kind: "cli", name: "n8n-cli"}` for side-by-side comparison.
#
# Run:
#   scripts/romeo-report-e2e-cli.sh
#
set -euo pipefail

CLI="node $(pwd)/packages/@n8n/cli/bin/n8n-cli.mjs"
SELF_USER_ID="U09GV6R3QUX"
ROMEO_GH_LOGIN="romeobalta"
ROMEO_REAL_NAME="Romeo Balta"
WINDOW_START="2026-05-04"
TMPDIR="$(mktemp -d -t romeo-cli-XXXXXX)"
trap 'rm -rf "$TMPDIR"' EXIT

# One session id for the whole script so all four single-node executions
# collapse into one block in the UI's "Group by session" view.
SESSION_ID="${ROMEO_CLI_SESSION:-romeo-cli-$(date +%Y%m%d-%H%M%S)-$$}"
echo "session: $SESSION_ID"

step() { printf '\n[%s/6] %s\n' "$1" "$2"; }

# ──────────────────────────────────────────────────────────────────
# Step 1 — Resolve credentials (CLI: credential list)
# ──────────────────────────────────────────────────────────────────
step 1 "Resolve credentials"
$CLI credential list --json > "$TMPDIR/creds.json"
SLACK_CRED_ID="$(jq -r '.[] | select(.type=="slackOAuth2Api") | .id' "$TMPDIR/creds.json")"
GH_CRED_ID="$(jq   -r '.[] | select(.type=="githubApi")      | .id' "$TMPDIR/creds.json")"
SLACK_CRED_NAME="$(jq -r '.[] | select(.type=="slackOAuth2Api") | .name' "$TMPDIR/creds.json")"
GH_CRED_NAME="$(jq    -r '.[] | select(.type=="githubApi")      | .name' "$TMPDIR/creds.json")"
echo "  Slack:  $SLACK_CRED_NAME ($SLACK_CRED_ID)"
echo "  GitHub: $GH_CRED_NAME ($GH_CRED_ID)"

# ──────────────────────────────────────────────────────────────────
# Step 2 — Discover Romeo on Slack (CLI: exec run slack.user.getAll)
# ──────────────────────────────────────────────────────────────────
step 2 "Discover $ROMEO_REAL_NAME on Slack"
jq -n '{authentication:"oAuth2", returnAll:true}' > "$TMPDIR/slack-user-getall.params.json"
$CLI exec run slack.user.getAll \
  --credential "$SLACK_CRED_ID" \
  --input "$TMPDIR/slack-user-getall.params.json" \
  --session "$SESSION_ID" \
  --json > "$TMPDIR/slack-user-getall.result.json"

USER_EXEC_ID="$(jq -r '.executionId' "$TMPDIR/slack-user-getall.result.json")"
ROMEO_USER="$(jq --arg name "$ROMEO_REAL_NAME" '
  .output
  | map(select((.profile.real_name // .real_name // "") == $name))
  | .[0]
' "$TMPDIR/slack-user-getall.result.json")"
ROMEO_USER_ID="$(jq -r '.id'                    <<<"$ROMEO_USER")"
ROMEO_NAME="$(jq    -r '.name'                  <<<"$ROMEO_USER")"
ROMEO_TITLE="$(jq   -r '.profile.title // "—"'  <<<"$ROMEO_USER")"
echo "  exec=#$USER_EXEC_ID — found $ROMEO_REAL_NAME ($ROMEO_USER_ID) — title: $ROMEO_TITLE"

# ──────────────────────────────────────────────────────────────────
# Step 3 — GitHub activity (CLI: exec run httpRequest)
# ──────────────────────────────────────────────────────────────────
step 3 "GitHub activity for @$ROMEO_GH_LOGIN"
jq -n --arg url "https://api.github.com/users/$ROMEO_GH_LOGIN/events" '{
  method: "GET",
  url:    $url,
  sendQuery: true,
  queryParameters: { parameters: [ { name: "per_page", value: "100" } ] }
}' > "$TMPDIR/gh-events.params.json"

$CLI exec run httpRequest \
  --input "$TMPDIR/gh-events.params.json" \
  --session "$SESSION_ID" \
  --json > "$TMPDIR/gh-events.result.json"

GH_EXEC_ID="$(jq -r '.executionId' "$TMPDIR/gh-events.result.json")"
jq --arg cutoff "$WINDOW_START" '[ .output[] | select(.created_at >= $cutoff) ]' \
  "$TMPDIR/gh-events.result.json" > "$TMPDIR/gh-events.window.json"

GH_TOTAL="$(jq    'length'                                                                          "$TMPDIR/gh-events.window.json")"
GH_PUSHES="$(jq   '[.[] | select(.type=="PushEvent")] | length'                                     "$TMPDIR/gh-events.window.json")"
GH_PRS="$(jq      '[.[] | select(.type=="PullRequestEvent" and .payload.action=="opened")] | length' "$TMPDIR/gh-events.window.json")"
GH_BRANCHES="$(jq '[.[] | select(.type=="CreateEvent")] | length'                                   "$TMPDIR/gh-events.window.json")"
echo "  exec=#$GH_EXEC_ID — $GH_TOTAL events • $GH_PUSHES pushes • $GH_PRS PRs • $GH_BRANCHES branches"

# ──────────────────────────────────────────────────────────────────
# Step 4 — Slack activity (CLI: exec run slack.message.search)
# ──────────────────────────────────────────────────────────────────
step 4 "Slack activity for @$ROMEO_NAME"
jq -n --arg query "from:@$ROMEO_NAME after:$WINDOW_START" '{
  authentication: "oAuth2",
  query:          $query,
  sort:           "desc",
  returnAll:      false,
  limit:          50
}' > "$TMPDIR/slack-search.params.json"

$CLI exec run slack.message.search \
  --credential "$SLACK_CRED_ID" \
  --input "$TMPDIR/slack-search.params.json" \
  --session "$SESSION_ID" \
  --json > "$TMPDIR/slack-search.result.json"

SLACK_EXEC_ID="$(jq -r '.executionId' "$TMPDIR/slack-search.result.json")"
SLACK_COUNT="$(jq '.output | length' "$TMPDIR/slack-search.result.json")"
echo "  exec=#$SLACK_EXEC_ID — $SLACK_COUNT messages"

# ──────────────────────────────────────────────────────────────────
# Step 5 — Compose Block Kit (pure local jq transform)
# ──────────────────────────────────────────────────────────────────
step 5 "Compose Block Kit report"
TOP_CHANNELS="$(jq -r '
  [ .output[].channel.name // empty ]
  | group_by(.)
  | map({channel: .[0], count: length})
  | sort_by(-.count)
  | .[0:6]
  | map("• #\(.channel): \(.count)")
  | join("\n")
' "$TMPDIR/slack-search.result.json")"

LATEST_PR="$(jq -r --argjson empty 0 '
  [ .[] | select(.type=="PullRequestEvent" and .payload.action=="opened") ][0]
  | if . == null then "_No PRs opened in this window._"
    else
      "*\(.payload.pull_request.title // ("PR #" + (.payload.pull_request.number|tostring)))* — <\(.payload.pull_request.html_url)|view on GitHub>"
    end
' "$TMPDIR/gh-events.window.json")"

BRANCH_LIST="$(jq -r '
  [ .[] | select(.type=="CreateEvent") | .payload.ref // empty ]
  | if length == 0 then "_No new branches._" else map("`" + . + "`") | join(" • ") end
' "$TMPDIR/gh-events.window.json")"

REPOS_TOUCHED="$(jq -r '
  [ .[].repo.name ] | unique | map("`" + . + "`") | join(" ") | if . == "" then "—" else . end
' "$TMPDIR/gh-events.window.json")"

jq -n \
  --arg name        "$ROMEO_REAL_NAME" \
  --arg windowStart "$WINDOW_START" \
  --arg ghLogin     "$ROMEO_GH_LOGIN" \
  --arg slackName   "$ROMEO_NAME" \
  --arg title       "$ROMEO_TITLE" \
  --argjson ghTotal    "$GH_TOTAL" \
  --argjson ghPushes   "$GH_PUSHES" \
  --argjson ghPrs      "$GH_PRS" \
  --argjson ghBranches "$GH_BRANCHES" \
  --argjson slackCount "$SLACK_COUNT" \
  --arg topChannels    "$TOP_CHANNELS" \
  --arg latestPr       "$LATEST_PR" \
  --arg branchList     "$BRANCH_LIST" \
  --arg reposTouched   "$REPOS_TOUCHED" '
{
  blocks: [
    {type:"header",text:{type:"plain_text",text:"📊 \($name) — Weekly Activity",emoji:true}},
    {type:"context",elements:[
      {type:"mrkdwn",text:"*Period:* since \($windowStart)"},
      {type:"mrkdwn",text:"•"},
      {type:"mrkdwn",text:"*Pipeline:* `scripts/romeo-report-e2e-cli.sh` via `@n8n/cli`"}
    ]},
    {type:"divider"},
    {type:"header",text:{type:"plain_text",text:"🐙 GitHub",emoji:true}},
    {type:"section",fields:[
      {type:"mrkdwn",text:"*Events:*\n\($ghTotal)"},
      {type:"mrkdwn",text:"*Pushes:*\n\($ghPushes)"},
      {type:"mrkdwn",text:"*PRs opened:*\n\($ghPrs)"},
      {type:"mrkdwn",text:"*Branches:*\n\($ghBranches)"},
      {type:"mrkdwn",text:"*Repos touched:*\n\($reposTouched)"},
      {type:"mrkdwn",text:"*GitHub handle:*\n<https://github.com/\($ghLogin)|\($ghLogin)>"}
    ]},
    {type:"section",text:{type:"mrkdwn",text:"*Latest PR opened:* \($latestPr)"}},
    {type:"section",text:{type:"mrkdwn",text:"*New branches:* \($branchList)"}},
    {type:"divider"},
    {type:"header",text:{type:"plain_text",text:"💬 Slack",emoji:true}},
    {type:"section",fields:[
      {type:"mrkdwn",text:"*Messages:*\n\($slackCount)"},
      {type:"mrkdwn",text:"*Slack handle:*\n@\($slackName)"},
      {type:"mrkdwn",text:"*Title:*\n\($title)"}
    ]},
    {type:"section",text:{type:"mrkdwn",text:"*Top channels:*\n\($topChannels)"}},
    {type:"divider"},
    {type:"context",elements:[
      {type:"mrkdwn",text:"Built with `@n8n/cli` exec run — every step recorded as `caller: cli`"}
    ]}
  ]
}' > "$TMPDIR/blocks.json"

BLOCK_COUNT="$(jq '.blocks | length' "$TMPDIR/blocks.json")"
echo "  $BLOCK_COUNT blocks composed"

# ──────────────────────────────────────────────────────────────────
# Step 6 — Deliver (CLI: exec run slack.message.post)
# ──────────────────────────────────────────────────────────────────
step 6 "Deliver report to self via Slack DM"
FALLBACK_TEXT="$ROMEO_REAL_NAME — Weekly Activity ($GH_TOTAL GH events, $SLACK_COUNT Slack msgs) via @n8n/cli"

jq -n \
  --arg userId   "$SELF_USER_ID" \
  --arg text     "$FALLBACK_TEXT" \
  --arg blocksUi "$(jq -c . "$TMPDIR/blocks.json")" '
{
  authentication: "oAuth2",
  select: "user",
  user: { __rl: true, mode: "id", value: $userId },
  messageType: "block",
  text: $text,
  blocksUi: $blocksUi,
  otherOptions: { includeLinkToWorkflow: false, mrkdwn: true }
}' > "$TMPDIR/post.params.json"

$CLI exec run slack.message.post \
  --credential "$SLACK_CRED_ID" \
  --input "$TMPDIR/post.params.json" \
  --session "$SESSION_ID" \
  --json > "$TMPDIR/post.result.json"

POST_EXEC_ID="$(jq -r '.executionId'   "$TMPDIR/post.result.json")"
POST_STATUS="$(jq  -r '.status'        "$TMPDIR/post.result.json")"
POST_URL="$(jq     -r '.executionUrl'  "$TMPDIR/post.result.json")"
echo "  status=$POST_STATUS executionId=#$POST_EXEC_ID"
echo "  $POST_URL"

echo
echo "✓ end-to-end complete — execution chain: #$USER_EXEC_ID → #$GH_EXEC_ID → #$SLACK_EXEC_ID → #$POST_EXEC_ID (all caller=cli)"
