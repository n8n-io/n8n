# Cloud Agent E2E Tests

End-to-end tests for the `cloud-agent` module that proxies to ai-assistant-service.

## Required infrastructure (not yet built)

These tests need a **stub upstream cloud agent** running alongside the n8n
test instance. The stub must implement:

- `POST /auth/token` — returns `{ accessToken: "...", tokenType: "Bearer" }`
- `POST /v1/agent/chat` body `{ threadId, message }` — returns `{ runId }` and
  immediately begins emitting events on the SSE stream for that thread
- `GET /v1/agent/events/:threadId` — SSE pipe that emits a canned sequence:
  `run-start` → some `text-delta` → at least one `tool-call` with
  `family: 'n8n'` (e.g. `workflows.list`) → wait for `tool-result` callback →
  `run-finish`
- `POST /v1/agent/runs/:runId/tool-result` — records the body and resolves
  the pending tool call so the canned sequence can continue
- `POST /v1/agent/runs/:runId/cancel` — returns `{ cancelled: true }`

n8n must be booted with:

- `N8N_CLOUD_AGENT_ENABLED=true`
- `N8N_CLOUD_AGENT_BASE_URL=http://<stub-host>:<stub-port>`
- `N8N_LICENSE_*` set so AiService can mint a license-bound JWT

## Test cases (planned)

- **chat-basics** — open `/cloud-agent`, send "list my workflows", assert
  - chat shows user message and assistant streaming text
  - `tool-call` for `workflows.list` appears in the message list
  - the stub received a `POST /v1/agent/runs/:runId/tool-result` payload with
    real workflows from the test n8n instance
  - `run-finish` event flips `store.isRunning` to false
- **chat-cancel** — start a run, click the Cancel button, assert
  - `POST /v1/agent/runs/:runId/cancel` was called
  - tool router stopped (no further `POST /tool-result` after cancel)
- **rbac-gate** — log in as a user without `cloudAgent:message`, assert
  - `/cloud-agent` route is not in the sidebar
  - direct navigation to `/cloud-agent` falls through to the unauthorized view
- **feature-flag-off** — boot n8n with `N8N_CLOUD_AGENT_ENABLED=false`, assert
  - `/rest/cloud-agent/chat` returns 404
  - sidebar nav entry hidden

## Why this isn't wired yet

The stub server is a non-trivial fixture (~150 lines of HTTP server +
SSE pumping). It belongs in `packages/testing/playwright/fixtures/` so
multiple specs can share it. Building it is the next concrete step
toward a runnable e2e suite.
