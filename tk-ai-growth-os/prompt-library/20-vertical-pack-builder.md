# 20 — Vertical Pack Builder (parameterized)

> Inherits 00 + 01. One prompt for ALL industries — replaces per-industry builder prompts (Flower Shop AI Builder, Nail Salon AI Builder, Spa AI Builder, Hair Salon AI Builder, …). Same principle as config-driven verticals: one parameterized asset, not N near-duplicates.

```text
Build a complete Vertical Pack for: <INDUSTRY NAME>

A Vertical Pack is DATA ONLY — config + prompts + seed content. If you find yourself writing a new workflow, stop: either an existing workflow already covers it via capability flags, or the platform needs a new GENERIC capability flag that other verticals could also use. Propose that instead.

Deliverables:
1. config/verticals/<slug>.json — full config from _template.json:
   - identity terms (what customers/staff/visits are called in this industry)
   - prompt variables: tone, service vocabulary, upsell rules, never_say list
   - booking rules: slot length, deposits, staff assignment, consultation-required services
   - modules: which capability flags turn ON (and note any missing platform capability)
   - intents: the industry's real intent list with routes and priorities
   - kpis: the 8–10 numbers this owner actually checks
   - calendars: seasonal peaks with capacity rules
   - compliance: quiet hours, consent language, industry-specific constraints (e.g. med spa/dental: no medical advice, HIPAA-adjacent caution)
2. Knowledge base seed pack: 15–20 FAQ entries this industry always gets asked, written as templates with {{company.*}} variables.
3. Rebooking/repeat logic: natural service cadences for this industry (if applicable).
4. 3 campaign templates for this industry's top seasonal peaks.
5. A 5-minute onboarding checklist: what data the owner must provide to go live.

Validate: run the Receptionist prompt template against this config for 5 realistic customer conversations and show the JSON outputs.
```
