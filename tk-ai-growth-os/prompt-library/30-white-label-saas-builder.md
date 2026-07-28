# 30 — White-label SaaS Builder

> Inherits 00 + 01. Use for agency/white-label features.

```text
Build or extend white-label capability.

Rules:
- Tenancy model: agencies are companies with children (parent_company_id tree). An agency sees/manages its subtree; a location owner sees only their company. All enforcement via RLS company_tree() — never in client code.
- Rebrandable surface: platform_name, logo, colors, dashboard domain, email sender domain, SMS sender ID, proposal branding — all from companies.branding. Acceptance test: an agency demo must show ZERO TK AI Solutions branding.
- Billing: agency pays TK (per child location + AI usage); agency sets its own retail pricing to clients. Usage metering per company_id rolls up the tree.
- Agency console: provision a new client in one flow (create company → pick vertical → apply overrides → issue API keys → connect channels). Target: live in under 30 minutes.
- Never fork per agency: one codebase, one n8n cluster, one schema. If a feature request only works as a fork, redesign it as configuration.
- Data isolation is a sales feature: document it (RLS, key scoping, per-tenant senders) so agencies can resell with confidence.
```
