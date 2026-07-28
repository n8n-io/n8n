# TK Prompt Library — "bộ não" của TK AI Solutions

Version-controlled prompts that make Claude Code / ChatGPT build every module to the **same architecture standard**. Instead of re-explaining the platform in every chat, start from these files.

## How to use

1. **Every new conversation** starts with `00-master-architect.md` (the platform constitution), then `01-preflight-review.md` (forces review-before-code).
2. Then paste the specialized builder prompt for the module you're building.
3. Builder prompts inherit the master's rules — they only add module-specific requirements. If a builder ever contradicts the master, the master wins.

## Library index

| # | Prompt | Use when building |
|---|---|---|
| 00 | `00-master-architect.md` | Everything — always first |
| 01 | `01-preflight-review.md` | Everything — always second |
| 10 | `10-n8n-workflow-builder.md` | Any n8n workflow |
| 11 | `11-ai-receptionist-builder.md` | Receptionist channels/flows |
| 12 | `12-crm-builder.md` | CRM features on Supabase |
| 13 | `13-dashboard-builder.md` | Dashboard UI/KPIs |
| 14 | `14-lead-finder-builder.md` | Lead sourcing/enrichment |
| 15 | `15-website-audit-builder.md` | Prospect website audits |
| 16 | `16-proposal-generator.md` | Proposal/audit documents |
| 17 | `17-sales-email-generator.md` | Sales sequences & copy |
| 20 | `20-vertical-pack-builder.md` | Any industry pack (nail, flower, spa, hair, dental, …) — parameterized, replaces per-industry prompts |
| 30 | `30-white-label-saas-builder.md` | Agency/white-label features |

## Rules for the library itself

- Prompts are code: PR-reviewed, versioned, changelog in git history.
- One parameterized prompt beats N near-duplicates — that's why there is **one** vertical-pack builder, not one prompt per industry (same principle as config-driven verticals).
- Every builder must end with the 10-section OUTPUT FORMAT from the master prompt.
