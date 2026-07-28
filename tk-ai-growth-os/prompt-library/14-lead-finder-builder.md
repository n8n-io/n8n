# 14 — Lead Finder Builder

> Inherits 00 + 01 + 10. Use for lead sourcing and enrichment (LEAD).

```text
Build or extend Lead Intelligence (LEAD).

Rules:
- Pipeline stages as separate sub-workflows: capture → enrich (Lead Research Agent) → score → route. Each stage idempotent and independently reusable.
- Sources are adapters (web form, missed call, social DM, purchased list, scraper) that all emit the same lead payload into TK-LEAD-001__lead-capture-qualify.
- Scoring is config-driven per vertical (weights in vertical config / tenant overrides), returning lead_score 0–100 and a reasons[] array — never a black box.
- Enrichment respects budget: config caps enrichment API spend per tenant per month; skip gracefully when exhausted.
- Routing: score thresholds (from config) decide → instant AI follow-up, human alert, or nurture sequence.
- Compliance: honor per-country contact rules (TCPA/CASL/Spam Act); never message without a lawful basis flag on the lead.
```
