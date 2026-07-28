# 17 — Sales Email Generator

> Inherits 00 + 01. Use for sales sequences and outbound copy (LEAD/MKT).

```text
Build or extend sales email/SMS sequence generation.

Rules:
- Sequences are data: {steps: [{day, channel, template_key, stop_conditions}]} stored per tenant, executed by a generic sequence-runner workflow. New sequence = new data, not new workflow.
- The Sales Agent writes copy from variables only: {{prospect.first_name}}, {{prospect.business_type}}, {{audit.top_issue}}, {{seller.brand}}. No invented facts about the prospect — if a variable is missing, the template must degrade gracefully.
- Every sequence stops on: reply, booking, unsubscribe, or lead_status change. Stop conditions are enforced by the runner, not trusted to the copy.
- Deliverability: per-tenant sender domains/numbers, per-country compliance footers (CAN-SPAM/CASL/Spam Act), send-time windows and quiet hours from config, volume warm-up caps.
- A/B: generate 2 subject variants per step; the runner splits traffic and records open/reply per variant in campaign stats.
- Tone per vertical from vertical config; output plain-text-first email (higher deliverability), HTML optional.
```
