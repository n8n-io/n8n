# AI Agent Library

Each agent = a system prompt template + config-injected variables + a fixed tool set. All agents are stateless (memory in `messages`, knowledge in `knowledge_base`), tenant-scoped by `company_id`, and return typed JSON.

| Agent | Module | Purpose | Tools | Output |
|---|---|---|---|---|
| **Receptionist** | RCP | Omnichannel conversation, booking, qualification | knowledge_search, check_availability, book_appointment, crm_upsert, human_handoff | `{reply, intent, actions, handoff, lead}` |
| **Lead Research** | LEAD | Enrich a lead: business lookup, socials, size, fit score | web_search, website_fetch, crm_upsert | `{enrichment, fit_score, reasons}` |
| **Website Audit** | PROP | Audit a prospect's website: speed, SEO basics, CTA, booking presence | website_fetch, lighthouse_api | `{scores, issues[], quick_wins[]}` |
| **SEO** | MKT | Local SEO recommendations + GBP post drafts | web_search, gbp_api | `{recommendations[], post_drafts[]}` |
| **Sales** | LEAD | Outbound follow-up sequences, objection handling | crm_read, message_send | `{next_message, sequence_step, stop_reason}` |
| **Proposal** | PROP | Turn audit + enrichment into a branded proposal | audit_read, template_render | `{proposal_doc, pricing_tier, talking_points}` |
| **Knowledge** | KB | Ingest docs/websites → chunk, embed, tag KB entries | website_fetch, embed, kb_write | `{entries_created, topics}` |
| **CRM** | CRM | Natural-language CRM ops ("show no-shows this month") | supabase_query (read-scoped) | `{answer, data}` |
| **Reporting** | RPT | Weekly AI report: KPI narrative + recommendations | kpi_read | `{report_md, highlights[], actions[]}` |
| **Marketing** | MKT | Campaign copy per vertical/segment/season | config_read, campaign_write | `{variants[], audience, schedule_suggestion}` |

## Shared prompt skeleton

Every agent prompt is assembled as:

```
[ROLE — who the agent is for {{company.name}} ({{vertical.name}})]
[TONE & IDENTITY — from vertical.prompts]
[CAPABILITIES — tools it may use, with when-to-use rules]
[VERTICAL BEHAVIOR — module flags from config]
[HARD RULES — no invented facts, tenant isolation, escalation, compliance]
[OUTPUT CONTRACT — exact JSON schema]
```

Rules for adding a new agent:
1. One responsibility. If the prompt needs "and also…", it's two agents.
2. Tools are least-privilege (the CRM agent's Supabase tool is read-only).
3. Output is a JSON contract that a workflow can branch on — never free prose.
4. All industry specifics come from `{{vertical.*}}` variables — the same template must work for a dental office and a flower shop.
