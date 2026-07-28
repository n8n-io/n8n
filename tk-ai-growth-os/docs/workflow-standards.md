# Workflow Standards — the contract every TK workflow must meet

Every workflow in this repo MUST satisfy all eleven points below before it ships. PR reviews check against this list.

## 1. Purpose
One job per workflow. The workflow `name` and a Sticky Note at the top-left state the purpose in one sentence.

## 2. Input
Typed envelope (see `docs/architecture.md`): `company_id`, `request_id`, `source`, `channel`, `payload`. Sub-workflows start with `Execute Workflow Trigger`; edge workflows start with `Webhook` or `Schedule`.

## 3. Output
Standard envelope `{ ok, request_id, data, error, meta }`. Never return raw third-party API responses upstream.

## 4. Configuration
- Secrets → n8n **credentials** only.
- Infrastructure (URLs, instance settings) → **environment variables** (`{{ $env.* }}`).
- Business behavior (hours, services, tone, industry logic) → **TK-CORE-001 Config Loader**.
- Zero literals: no phone numbers, business names, API keys, or industry assumptions in nodes.

## 5. Error Handling
- Workflow settings: `errorWorkflow` → `TK-CORE-002__error-handler`.
- Nodes that can fail externally set **On Error → Continue (using error output)** where a fallback exists, otherwise fail fast.
- Errors returned to callers are structured: `{ code, message, retryable }`.

## 6. Retry Logic
- External HTTP/AI nodes: `retryOnFail: true`, `maxTries: 3`, `waitBetweenTries: 2000` (exponential where supported).
- Retried operations must be idempotent (upserts keyed on natural keys; dedupe on `request_id`).

## 7. Logging
Call `TK-CORE-003__logger` (or insert directly to `workflow_logs`) at: start (info), branch decisions (debug), completion (info with `duration_ms`), failure (error). Always include `company_id` + `request_id`.

## 8. Webhook Support
Edge workflows expose `POST /webhook/tk/v1/<module>/<action>` with header auth (`X-TK-API-Key`). Respond via `Respond to Webhook` node with the standard envelope.

## 9. API Support
Any capability usable by the dashboard gets an API path (see `docs/api-design.md`). Webhook + API share the same underlying sub-workflow — never duplicate logic per entry point.

## 10. Versioning
- Workflow name carries the id: `TK-<MODULE>-<NNN>__<slug>`.
- `meta.version` (semver) inside the workflow's output envelope; breaking payload changes bump major and get a new webhook path (`/v2/`).
- Templates in this repo are the source of truth; deployed instances are synced from here.

## 11. Documentation
Each workflow JSON is accompanied by a Sticky Note block inside the canvas covering: Purpose, Input, Output, Config keys used, Failure modes. Non-trivial modules also get a `docs/` page.

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Workflow | `TK-<MODULE>-<NNN>__<kebab-slug>` | `TK-RCP-002__missed-call-recovery` |
| Webhook path | `tk/v1/<module>/<action>` | `tk/v1/receptionist/inbound` |
| Env var | `TK_<SCOPE>_<NAME>` | `TK_SUPABASE_URL` |
| Log source | workflow id | `TK-CRM-001` |

## Required environment variables (platform level)

| Variable | Purpose |
|---|---|
| `TK_SUPABASE_URL` | Supabase project URL |
| `TK_SUPABASE_SERVICE_KEY` | Service-role key (n8n credential preferred; env fallback) |
| `TK_PLATFORM_NAME` | White-label platform name for outbound branding fallback |
| `TK_ALERT_WEBHOOK_URL` | Where TK-CORE-002 sends critical alerts |
| `TK_DEFAULT_TIMEZONE` | Fallback timezone when company config lacks one |
