# 10 — n8n Workflow Builder

> Inherits 00 + 01. Use for any n8n workflow.

```text
Build an n8n workflow for TK AI Growth OS.

Contract (non-negotiable, see docs/workflow-standards.md):
- Name: TK-<MODULE>-<NNN>__<kebab-slug>; one job per workflow.
- Input/Output: the standard typed envelope {company_id, request_id, source, channel, payload} → {ok, request_id, data, error, meta}.
- Sub-workflows start with Execute Workflow Trigger; edge workflows with Webhook (path tk/v1/<module>/<action>, header auth X-TK-API-Key) or Schedule.
- Config: secrets in n8n credentials; infra in {{ $env.TK_* }}; business behavior via TK-CORE-001__config-loader. Zero literals.
- Error handling: errorWorkflow = TK-CORE-002__error-handler; structured errors {code, message, retryable}.
- Retry: external calls retryOnFail 3× with backoff; all mutations idempotent.
- Logging: TK-CORE-003__logger at start / decisions / end / failure with company_id + request_id.
- Versioning: meta.version semver; breaking changes bump the webhook path version.
- Documentation: Sticky Notes covering Purpose, Input, Output, Config keys, Failure modes.

Before generating JSON: list the sub-workflows you will reuse vs create, and flag anything that duplicates an existing TK workflow.
Output the full importable n8n workflow JSON plus the 10-section feature write-up.
```
