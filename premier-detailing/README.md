# Premier Detailing — Automation System

**Status:** v1 build — review and test before going live.
**Owners:** Charlie Kuepfer · Kabir Aulakh
**Branch:** `claude/ai-detailing-workflow-z7QEl`

This is the automation backbone for Premier Detailing (Stratford, ON). Built on **n8n Cloud** with **Claude** (Anthropic) for the AI agents, **Twilio** for SMS, **Square** for booking + payments, **Google Calendar** for scheduling, and your existing **Wix** site for the lead form.

> **Goal:** 92% automated. Charlie and Kabir focus on detailing cars and growing the business — not answering the same texts 40 times a week.

---

## What's in this folder

```
premier-detailing/
├── README.md                              ← you are here
├── SETUP.md                               ← step-by-step zero-to-running guide (start here)
├── .env.template                          ← environment variables to fill in
├── workflows/
│   ├── 01-lead-to-quote-booking.json      ← n8n workflow: lead → AI quote → booking
│   ├── 02-review-harvester.json           ← n8n workflow: post-job 5-star review funnel
│   └── 03-reactivation-engine.json        ← n8n workflow: 90/180/365 + seasonal + fleet
├── prompts/
│   ├── voice-style-guide.md               ← how the AI sounds (Charlie/Kabir voice)
│   ├── quote-agent.md                     ← system prompt for the quote agent
│   ├── review-sentiment.md                ← system prompt for review sentiment + replies
│   └── reactivation-copywriter.md         ← system prompt for reactivation SMS
├── data/
│   ├── pricing.json                       ← machine-readable menu (S/M/L/XL by service)
│   ├── travel-zones.json                  ← travel-fee rules + auto-book thresholds
│   └── fleet-targets.json                 ← curated weekly walk-in pitch list
├── wix/
│   └── booking-form-embed.html            ← drop into Wix HTML iframe on /book
├── plans/
│   └── maintenance-and-family-plans.md    ← Bronze/Silver/Gold + Family + Fleet proposal
└── docs/                                  ← (reserved for future architecture diagrams)
```

---

## The three workflows in one minute

### 01 — Lead → AI Quote → Booking
**Trigger:** Wix form submission (or eventually IG/FB DM, inbound SMS).
**Flow:** Normalize → geocode city → calculate travel fee → AI agent generates a structured quote with 2 slot offers → if ≤30km away & all auto-quotable services, send the quote SMS in Charlie's voice → customer clicks the Square booking link → deposit + Calendar event happen automatically. Out-of-zone or special services route to owner Slack alert.

### 02 — Review Harvester
**Trigger:** Hourly schedule + Twilio inbound webhook.
**Flow:** Find appointments completed 22–26h ago → AI checks job notes + recent SMS thread for any negative signal → if positive, send the Google review SMS in Charlie's voice → if mixed/negative, alert owners privately and skip the review ask. Customer replies are classified by AI: thank-you, resend link, or escalate to owner. **Goal: 5-star reviews only, every dissatisfied customer gets a private call instead of a Google rant.**

### 03 — Reactivation Engine
**Trigger:** Daily 7am + weekly Monday 8am for fleet pitches.
**Flow:** Pulls all customers from Square, classifies them into 9 segments (90-day, 180-day, 365-day, pre-season, end-of-season ceramic, salt recovery, maintenance plan upsell, family plan upsell, fleet outreach reminder), AI drafts the SMS in Charlie's voice, sends during 9am–8pm only. Excludes anyone tagged `do_not_engage`, `discount_seeker`, or `complainer`.

---

## How to start

1. Read `SETUP.md` end-to-end before doing anything. It's the install manual.
2. Get the accounts in Phase 1 (n8n Cloud, Twilio, Anthropic, Google Cloud).
3. Import the three workflows.
4. Test with your own phone before going live.

**First-time setup is 2–4 hours. After that it runs itself.**

---

## Voice & tone — the most important file

Read `prompts/voice-style-guide.md`. It's the brand-voice anchor for every customer-facing message the AI sends. If a message ever sounds robotic, it's because the voice guide drifted from how you actually talk — update it. The guide ships with two of Charlie's real texts as voice anchors.

---

## What's intentionally NOT built (yet)

This is a focused v1. These are the obvious next builds, in priority order:

1. **AI voice agent for inbound calls** — ports the quote agent to phone. ~2 weeks of work.
2. **IG/FB DM intake** into the lead funnel. ~3 hours.
3. **Crew dispatch + day-of route optimization.** ~6 hours.
4. **Night-before confirmation flow** with AI rescheduling. ~3 hours.
5. **Weather-triggered reschedule offers.** ~2 hours.
6. **Review-link QR card** print design for handoff. ~30 min.
7. **Dedicated fleet onboarding portal.** ~4 hours.

See `SETUP.md` Phase 8 for the full roadmap.

---

## Costs (CAD/mo at your current scale)

| Tool | Plan | ~$/mo |
|------|------|------|
| n8n Cloud | Starter | $33 |
| Twilio | Pay-as-you-go (~500 SMS/mo + 1 number) | $15–25 |
| Anthropic Claude | API usage | $30–60 |
| Google Maps | Free tier | $0 |
| Slack | Free | $0 |
| Square | (you already pay) | — |
| Wix | (you already pay) | — |
| **Total** | | **~$80–120** |

At ~$150k revenue, this is <0.1% of revenue for full automation. As volume grows, Anthropic + Twilio scale linearly; n8n stays flat. Self-hosting n8n later (~$12/mo VPS) saves the n8n fee but adds maintenance — worth it once you're past $300k.

---

## Open questions (sent back for your review)

These are decisions you should make before going live. They live in the proposal docs:

- [ ] **Maintenance plan tier names + prices** — review `plans/maintenance-and-family-plans.md`
- [ ] **Family plan structure** — same doc
- [ ] **Travel-fee formula** — currently `max($20, $1/billable-km round-trip)`. Confirm or adjust in `data/travel-zones.json`.
- [ ] **Founders rate** for first 25 plan members — yes/no?
- [ ] **Plan auto-pause** for off-season — recommended yes
- [ ] **Referral bonus** for plan members — yes/no?

Mark these up, send back, and I'll wire any changes into the prompts + data files.

---

## Why this isn't on make.com

You asked. Three reasons:
1. **Cost at scale.** make.com bills per-operation. With AI agents firing dozens of LLM calls per lead, plus hourly review checks, plus daily reactivation, you'll hit 10k+ ops/mo and pay more than the n8n flat rate.
2. **AI Agent node.** n8n's AI Agent node is purpose-built for the structured-JSON-output, tool-using agents you need. make.com's AI modules are thin LLM wrappers — you'd be reimplementing what n8n gives you out of the box.
3. **Self-hostable later.** When you're past $300k, you can move n8n to a $12 VPS and zero out the SaaS bill. make.com is SaaS-only.

You'll hit ~the same drag-and-drop UX. The build skill transfers.
