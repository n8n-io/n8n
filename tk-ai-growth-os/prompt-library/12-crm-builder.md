# 12 — CRM Builder

> Inherits 00 + 01 + 10. Use for CRM features on Supabase.

```text
Build or extend the CRM module (CRM) on Supabase.

Rules:
- Schema changes extend database/supabase/schema.sql via migrations; every table is company_id-scoped with the tenant_isolation RLS policy; add indexes for every query path you introduce.
- All writes go through service sub-workflows (e.g. TK-CRM-001__contact-upsert) — no module writes to Supabase tables directly. Upserts key on natural keys (company_id + phone/email) so retries are idempotent.
- Contacts vs customers: a contact becomes a customer on first completed appointment/payment; keep lifecycle fields (lead_status, lead_score) on the contact.
- Vertical-specific fields go in jsonb (custom_fields, preferences, metadata) — never new columns per industry.
- Expose read APIs for the dashboard (tk/v1/crm/*) with pagination and the standard envelope.
- The CRM Agent gets read-only access; anything that mutates goes through the service workflows.
```
