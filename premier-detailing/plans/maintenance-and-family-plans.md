# Maintenance, Family, and Fleet Plans — Proposal v1

This is a starting point. Tweak any number, drop any tier, rename anything. The reactivation engine reads tier names + prices from this doc when drafting upsell SMS — keep names consistent if you change them.

---

## Why plans matter

A one-time detailing customer is great. A customer on a recurring plan is **predictable revenue** — which is the single biggest reason a detailing business becomes sellable later. Plans also let you fill weather-shifted gaps and slow weeks without scrambling.

Goal in year 1: **20 customers on plans by end of August.** Conservatively that's $1,500–4,000/mo MRR. Year 2: 50+ on plans, you start the season already booked solid.

---

## Maintenance Plans (single vehicle)

Three tiers. Customers pre-pay monthly via Square subscription. They get priority booking — Charlie/Kabir hold morning slots Tue/Wed/Thu for plan members.

### 🟫 Bronze — Refresh — $69/mo (S/M) / $89/mo (L/XL)

- **1 Exterior Detail / month** (Wash, Clay, Seal)
- Priority booking (members get first dibs at slots)
- 5% off any add-on or upgrade
- Pause anytime (one month free per season)

**Math for you:** Exterior Detail M = $139. They pay $69, get one. Looks like a 50% discount, but: (a) you're filling a slot you may not have filled, (b) you're keeping the customer warm for Premier upgrades, (c) you can run two of these back-to-back same neighborhood = travel-fee economics. Worth it.

### 🟪 Silver — Care — $179/mo (S/M) / $209/mo (L/XL)

- **1 Exterior Detail every month**
- **1 Interior Detail every 2 months**
- 10% off add-ons and upgrades
- Free travel up to 15km from Stratford
- Priority booking + first crack at pre-season

**Math:** Average month value = $139 + ($289/2) = $283. They pay $179. You're trading ~$100/mo for retention + predictable scheduling.

### 🟨 Gold — Elite — $299/mo (S/M) / $349/mo (L/XL)

- **Full In & Out monthly**
- 15% off all add-ons and upgrades
- Free travel up to 25km
- Free annual ceramic top-up
- Free annual interior ceramic refresh
- VIP slot reservations (you can request a recurring weekly time)

**Math:** Full In & Out M = $339. They pay $299. Plus the freebies. You're losing on paper — but Gold members are your most loyal advocates and you're locked in to a $3,588/yr customer. They're who refer the best new business.

---

## Family Plan (2+ vehicles, same household)

**Family Bundle** — applied on top of any Maintenance Plan, OR à la carte:

- **2 vehicles same day:** 10% off the combined invoice
- **3+ vehicles same day:** 15% off + free travel anywhere ≤30km
- **Spouse/partner adds-on:** $20/mo on top of any Maintenance Plan to cover the second vehicle at the same tier

**Why:** detailing two cars in one driveway is far more profitable than two solo trips. Reward customers for batching.

**Eligibility:** any household sharing an address. Verified by address match in Square.

---

## Fleet / Dealership Plans

These are **not self-service** — they go through Charlie or Kabir directly. The reactivation engine generates the weekly walk-in pitch list (`data/fleet-targets.json`); the in-person pitch closes the deal.

### Fleet Standard

- **5–14 vehicles/month**: 20% off Exterior Detail rate, NET-15 invoicing
- Recurring weekly or bi-weekly schedule
- Single-point contact (one PO, monthly invoice)

### Fleet Volume

- **15+ vehicles/month**: 30% off Exterior, 20% off Interior, free travel
- Reserved crew time (e.g., every Wednesday is "X dealer day")
- Quarterly business review with Charlie or Kabir

### Dealership Pre-Delivery (PDI)

- **Per-unit flat rate:** $99 PDI clean (S/M), $129 (L/XL) — fast wash, interior wipe, glass, tire dressing
- **Ceramic upsell to dealer's customer:** dealer earns 15% commission, you book the customer separately
- **New-vehicle upgrade tier**: any new buyer at a partner dealer gets 10% off any retail service for 30 days post-purchase

### Why this works in Stratford specifically

- 6+ dealerships in town, several without dedicated detailers in mobile-only summer months
- A single dealer doing 20 units/mo at the PDI rate = $2,000+/mo recurring
- Dealer customers convert to retail clients (highest-LTV channel)

---

## Plans NOT to build (yet)

- **Pay-per-wash punch cards.** Race to the bottom. Price-anchors the wrong customer type. You explicitly said you don't want discount-seekers.
- **Annual ceramic warranty plans.** You'll have these naturally inside the Gold tier — don't fragment.
- **"Wash club" with free unlimited wash.** Only works for fixed-bay tunnels with sub-$5 incremental cost. Mobile economics make this a loss leader you can't recover.

---

## How customers join

1. **In quote SMS** (workflow 01): if AI detects this is the customer's 3rd+ booking, it adds a P.S. — "ps -- you've had us out 3x this year. our care plan is $179/mo, basically saves you the cost of 2 cleans. want me to send the link?"
2. **In reactivation SMS** (workflow 03): segment 7 (`maintenance_upsell`) fires automatically after the 3rd service.
3. **Square subscriptions**: set up the three Bronze/Silver/Gold tiers as Square subscriptions with Square Online links. Drop the link in the SMS.
4. **In-person**: Charlie/Kabir mention it during the handoff at the end of a Premier or 2-step correction job — those customers self-select into Gold.

---

## Tagging in Square

When a customer signs up, add a tag in their Square customer record:
- `tag:on_plan` — any tier
- `tag:plan_bronze` / `tag:plan_silver` / `tag:plan_gold`
- `tag:family_plan`
- `tag:fleet:rosewood-toyota` (etc.)

The reactivation engine reads these and skips the maintenance-upsell segment for plan members.

---

## Open questions (for you to decide)

- [ ] Do you want a **founders-rate** lock for the first 25 plan members? (e.g., "this rate forever" — great social proof, slight long-term margin hit)
- [ ] **Cancellation policy** for plans — month-to-month with 30 days notice, or annual lock with a 2-month early-exit fee?
- [ ] **Pause for off-season** — automatic Sept–Mar pause (no charge), auto-resume April? My recommendation: yes, this is huge for retention.
- [ ] **Referral bonus** — give plan members $25 off next month for every referred new customer who books?

Mark up this doc, send it back, and I'll wire the prices into the AI prompts.
