# TK AI Growth OS — Architecture

## Design principles

1. **Scalable** — multi-tenant from day one; every row is scoped by `company_id`.
2. **Reusable** — capabilities are sub-workflows called via `Execute Workflow`; nothing is copy-pasted per client.
3. **Modular** — many small workflows, each with one job; modules communicate through typed payloads.
4. **White-label** — branding, sender identities, domains, and theme all come from tenant config.
5. **No hardcoded values** — secrets in n8n credentials / environment variables; business behavior in Supabase `vertical_configs` + `companies.settings`.
6. **Configurable everything** — a new industry is a new config file, not a new codebase.

## Layered model

```
┌───────────────────────────────────────────────┐
│  UI LAYER        Dashboard (Next.js, API-first)│
├───────────────────────────────────────────────┤
│  API LAYER       n8n webhooks /webhook/tk/v1/* │
├───────────────────────────────────────────────┤
│  MODULE LAYER    RCP · LEAD · CRM · MKT · PROP │
│                  KB · RPT                      │
├───────────────────────────────────────────────┤
│  AGENT LAYER     Role-scoped AI agents + tools │
├───────────────────────────────────────────────┤
│  CORE LAYER      Config · Errors · Logging ·   │
│                  Retry · Auth                  │
├───────────────────────────────────────────────┤
│  DATA LAYER      Supabase (Postgres + RLS +    │
│                  pgvector for KB)              │
└───────────────────────────────────────────────┘
```

## Execution contract (module ↔ module)

Every sub-workflow accepts and returns a **typed envelope**:

```jsonc
// INPUT
{
  "company_id": "uuid",        // required — tenant scope
  "request_id": "uuid",        // required — trace id, generated at the edge
  "source": "webhook|api|schedule|workflow",
  "channel": "voice|sms|facebook|instagram|google_business|email|web_chat|whatsapp|internal",
  "payload": { /* module-specific, documented per workflow */ }
}

// OUTPUT
{
  "ok": true,
  "request_id": "uuid",
  "data": { /* module-specific */ },
  "error": null,               // or { code, message, retryable }
  "meta": { "workflow": "TK-XXX-NNN", "version": "1.0.0", "duration_ms": 0 }
}
```

Rules:

- `company_id` is resolved **once** at the edge (webhook auth) and passed down — sub-workflows never re-authenticate.
- `request_id` flows through every hop and every log row → full trace per request.
- A workflow that cannot produce `ok: true` must return a structured `error` and let `TK-CORE-002` handle alerting; it must never swallow failures.

## Config resolution (TK-CORE-001)

Order of precedence (highest wins):

1. `companies.settings` (per-tenant overrides)
2. `vertical_configs.config` (per-industry defaults, e.g. `nail-salon`)
3. Platform defaults (`config/platform.example.json` → deployed as environment/JSON)

The Config Loader merges these into one `ctx` object cached per execution. **No other workflow reads config sources directly.**

## AI agent pattern

Each agent = system prompt template (from `prompts/`) + vertical variables (from config) + tools (n8n AI Agent node tools). Agents are stateless; conversation memory lives in `messages` keyed by `contact_id`, and long-term business knowledge lives in `knowledge_base` (pgvector RAG).

Agent roster and responsibilities: see `prompts/agent-library.md`.

## Multi-tenancy & white-label

- One n8n instance (or queue-mode cluster) serves all tenants; tenant identity is data, not deployment.
- White-label agencies get: their own `companies.parent_company_id` tree, their own branding block, their own sender domains/numbers (stored per company, injected into every outbound send).
- RLS policies restrict dashboard/API reads to the caller's company tree.

## Scaling path

| Stage | Setup |
|---|---|
| 0–50 tenants | Single n8n instance + Supabase Pro |
| 50–500 | n8n queue mode (workers), Redis, read replicas |
| 500+ | Per-region clusters, KB embeddings on dedicated pgvector pool, usage metering per tenant |
