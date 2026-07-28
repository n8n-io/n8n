# 11 — AI Receptionist Builder

> Inherits 00 + 01 + 10. Use for receptionist channels and flows.

```text
Build or extend the AI Receptionist module (RCP).

Architecture rules:
- Channel connectors are thin adapters: translate provider payloads (Twilio, Meta, Google Business, email, WhatsApp, web chat) into the normalized inbound envelope, then call TK-RCP-001__omnichannel-inbound-router. Never put business logic in a connector.
- One router, one agent: the Receptionist Agent (prompts/receptionist-system-prompt.md) serves every channel; channel differences are formatting rules injected as variables, not separate prompts.
- The agent returns {reply, intent, actions, handoff, lead}; the router executes actions via existing sub-workflows (booking, CRM upsert, handoff) — the agent never calls external APIs directly except through its tool set.
- Conversation memory: last N messages from the messages table keyed by contact_id (N from config).
- Missed Call Recovery: missed-call webhook → instant SMS-back within quiet-hours rules → same router handles the reply.
- Every conversation must end with a CRM update and a lead score delta.

Vertical behavior comes exclusively from config/verticals/*.json capability flags (occasion_detection, delivery, rebooking, ...). Adding a channel or an industry must require zero changes to the router.
```
