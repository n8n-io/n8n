# API Design

API-first: the dashboard, mobile apps, and third-party integrations all consume the same versioned API served by n8n webhook workflows.

## Conventions

- Base path: `/webhook/tk/v1/`
- Auth: `X-TK-API-Key` header → resolved to `company_id` + role (owner / staff / agency) at the edge; key hashes stored in `companies.api_keys`
- Content type: JSON in/out
- Envelope (all responses):

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "meta": { "request_id": "uuid", "version": "1.0.0" }
}
```

- Errors: `ok: false`, `error: { code, message, retryable }`; HTTP status mirrors class (400 validation, 401 auth, 404 missing, 429 rate limit, 500 internal)
- Idempotency: mutating endpoints accept `Idempotency-Key` header, deduped in `workflow_logs`
- Rate limiting: per API key, limits from tenant plan config

## Endpoint catalog (v1)

| Method | Path | Module | Purpose |
|---|---|---|---|
| POST | `tk/v1/receptionist/inbound` | RCP | Normalized inbound message from any channel connector |
| POST | `tk/v1/receptionist/missed-call` | RCP | Missed-call event → recovery flow |
| POST | `tk/v1/leads/capture` | LEAD | Capture + qualify a lead |
| POST | `tk/v1/crm/contacts/upsert` | CRM | Idempotent contact create/update |
| GET | `tk/v1/crm/contacts` | CRM | List/search contacts |
| POST | `tk/v1/appointments/book` | RCP | Book an appointment |
| GET | `tk/v1/appointments` | RCP | List appointments |
| POST | `tk/v1/campaigns/send` | MKT | Trigger a campaign send |
| GET | `tk/v1/reports/kpis` | RPT | KPI snapshot for dashboard |
| POST | `tk/v1/kb/documents` | KB | Add knowledge base content |
| POST | `tk/v1/proposals/generate` | PROP | Generate audit/proposal |

Channel connectors (Twilio, Meta, Google Business, email, WhatsApp) are thin adapter workflows that translate provider payloads into the normalized `receptionist/inbound` shape — the router never sees provider-specific formats.

## Versioning

Breaking changes → new base path (`tk/v2/...`); old versions kept alive through a deprecation window. Additive changes are allowed within a version.
