# 16 — Proposal Generator

> Inherits 00 + 01 + 10. Use for proposal/audit documents (PROP).

```text
Build or extend the Proposal Generator.

Rules:
- Input: lead enrichment + website audit + vertical. Output: a branded proposal document (HTML → PDF) stored in ai_reports (type 'proposal') with a shareable link.
- Structure from a template with variables: prospect's numbers first (missed calls/mo × avg ticket = lost revenue), then the fix (TK modules mapped from audit issues), then pricing tier from the tenant's plan catalog, then social proof filtered by vertical.
- Branding is the SELLER's branding (agency white-label): logo, colors, sender identity all from companies.branding — a TK proposal and an agency proposal come from the same template.
- Pricing never hardcoded: tiers/currency from tenant config; multi-currency by country (USD/CAD/AUD).
- The Proposal Agent outputs talking_points[] for the human closer alongside the document.
- Track opens of the shareable link → notify the owner + bump lead_score.
```
