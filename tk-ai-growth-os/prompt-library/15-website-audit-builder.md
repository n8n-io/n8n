# 15 — Website Audit Builder

> Inherits 00 + 01 + 10. Use for prospect website audits (PROP).

```text
Build or extend the Website Audit capability.

Rules:
- Input: a URL + company_id (the agency/tenant running the audit). Output: {scores, issues[], quick_wins[]} stored in ai_reports (type 'website_audit').
- Audit dimensions: load speed, mobile responsiveness, SEO basics (title/meta/schema/GBP link), conversion (visible phone, booking CTA, chat widget), trust (reviews, SSL).
- Each dimension is a separate scorer sub-workflow so dimensions can be added without touching the orchestrator.
- The Website Audit Agent writes findings in plain business language ("customers can't find your phone number on mobile"), never dev jargon — this report is a sales asset.
- Every issue links to a TK product module that fixes it (no chat widget → AI Receptionist web chat). The audit is the top of the proposal funnel.
- Cache audits per URL for a config-defined TTL to control API spend.
```
