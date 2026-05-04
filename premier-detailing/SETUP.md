# Premier Detailing — Setup Guide (Zero to Running)

This is a step-by-step guide written for someone who's never touched n8n. Follow it top to bottom. Total time: **2–4 hours** the first time, then everything runs itself.

## What you're building

Three workflows that together handle:
1. **Lead → AI quote → Booking** (workflow 01)
2. **Review harvester** (workflow 02)
3. **Reactivation engine** (workflow 03)

You'll need accounts at: **n8n Cloud, Twilio, Anthropic, Square (you have it), Google Cloud (free tier), Slack** (or use Gmail).

Total monthly cost at your current scale: ~**$100–130 CAD/mo** (n8n $30 + Twilio $20–30 + Anthropic $30–60 + Google Maps free tier).

---

## Phase 1 — Accounts (45 min)

### 1.1 n8n Cloud

1. Go to **n8n.io** → "Get Started" → choose the **Starter plan** ($24 USD/mo).
2. Create an account using `premierdetail.stratford@gmail.com`.
3. Pick a workspace URL — something like `premierdetailing.app.n8n.cloud`.
4. After signup, you land in the n8n editor. Leave the tab open.

### 1.2 Twilio

1. Sign up at **twilio.com**. They'll ask to verify your business phone — use 519-778-1310.
2. Go to **Phone Numbers → Buy a Number**. Choose a Canadian local number with a 519 area code. ~$1.50 USD/mo + per-message charges.
3. **Important:** do NOT buy a toll-free number — those need extra registration. A local Canadian number works for SMS without registration if you stay under ~200 messages/day, which you will.
4. From the **Console Dashboard**, copy these and stash them somewhere safe (you'll paste them into n8n later):
   - **Account SID**
   - **Auth Token**
   - **Phone number** in E.164 format: `+15195550199` style
5. **Compliance note:** Canadian SMS is governed by CASL. Always include an opt-out in customer-initiated message threads (Twilio handles "STOP" automatically — you don't need to add it manually).

### 1.3 Anthropic (Claude)

1. Go to **console.anthropic.com** → sign up.
2. Add a payment method. Pre-load **$50 USD** to start — that lasts a long time at your volume.
3. **API Keys → Create Key** → name it `premier-detailing-prod`. Copy the key (starts with `sk-ant-...`).

### 1.4 Google Cloud (for Maps Geocoding + Calendar)

1. Go to **console.cloud.google.com** → create a project named `Premier Detailing`.
2. Enable **APIs & Services**: search for and enable **Geocoding API** and **Google Calendar API**.
3. Go to **Credentials → Create Credentials → API Key**. Copy that key (Geocoding only, restrict it).
4. Go to **Credentials → Create Credentials → OAuth client ID** for Google Calendar. Choose "Web application." Authorized redirect URI: `https://premierdetailing.app.n8n.cloud/rest/oauth2-credential/callback` (replace with your n8n URL). Copy the Client ID and Client Secret.
5. Free tier covers everything you need. No card needed if you stay under quotas.

### 1.5 Square API access

1. Go to **developer.squareup.com** → log in with your Square account.
2. **Applications → Create Your First Application** → name it `Premier Detailing Automation`.
3. In your new app, go to **Credentials**. Copy the **Production Access Token** and your **Location ID** (under "Locations").
4. Note: Square's API access is included in your existing plan. No extra fees.

### 1.6 Slack (optional but recommended)

1. Free Slack workspace at **slack.com/get-started**.
2. Create channels: `#owner-alerts`, `#bookings`, `#reviews`.
3. Add Charlie + Kabir.
4. Connect n8n to Slack later via OAuth in the n8n credential setup.
5. **Alternative:** if you'd rather skip Slack, all the Slack nodes in the workflows can be swapped to Gmail nodes — just edit each `Slack:` node in n8n and change to "Send Email" pointing at `premierdetail.stratford@gmail.com`.

### 1.7 Google Review Link

You already have it: `https://share.google/9hhPFrKOa7XM7da9X`

Save it. You'll paste it into n8n env vars.

---

## Phase 2 — Set Twilio number up for SMS (20 min)

### 2.1 Inbound SMS webhook

This makes Twilio forward every inbound text to your n8n workflow.

1. In Twilio console, go to your phone number → **Messaging Configuration**.
2. **A message comes in:** Webhook → `https://premierdetailing.app.n8n.cloud/webhook/premier-detailing-sms-inbound`
3. HTTP method: POST.
4. Save.

### 2.2 Voice setup (later)

For now, set the voice config to **forward to 519-778-1310**. That keeps voice calls going to your existing line. The AI voice agent is a phase 2 build — not in this MVP.

---

## Phase 3 — Import the workflows (30 min)

### 3.1 Set environment variables in n8n

In n8n: **Settings (gear icon) → Variables** (n8n Cloud calls these "environment variables"). Add:

| Name | Value |
|---|---|
| `TWILIO_FROM_NUMBER` | your Twilio number, e.g. `+15195550199` |
| `GOOGLE_MAPS_API_KEY` | from step 1.4 |
| `GOOGLE_REVIEW_LINK` | `https://share.google/9hhPFrKOa7XM7da9X` |
| `SQUARE_LOCATION_ID` | from step 1.5 |
| `OWNER_PHONE_CHARLIE` | `+15192760518` |
| `OWNER_PHONE_KABIR` | `+14372336538` |
| `OWNER_EMAIL` | `premierdetail.stratford@gmail.com` |

### 3.2 Add credentials in n8n

n8n → **Credentials → New**. Add each:

1. **Anthropic** → paste your `sk-ant-...` key.
2. **Twilio** → paste Account SID + Auth Token.
3. **Square API** → paste Production Access Token. (It's an HTTP Header credential — name `Authorization`, value `Bearer YOUR_TOKEN`.)
4. **Google Calendar OAuth2** → paste Client ID + Secret, then click "Sign in with Google" and authorize using `premierdetail.stratford@gmail.com`.
5. **Slack OAuth2** → connect via OAuth.

### 3.3 Import the three workflows

For each file in `premier-detailing/workflows/`:

1. Open n8n → top-left **Workflows → Import from File**.
2. Select `01-lead-to-quote-booking.json`.
3. After import, n8n will flag any nodes missing credentials. Click each red node, pick the matching credential from the dropdown, save.
4. Repeat for `02-review-harvester.json` and `03-reactivation-engine.json`.

### 3.4 Paste the AI system prompts

The workflows reference the system prompts but you need to paste the actual text into each AI Agent node:

1. Open workflow 01 → click the **AI Agent — Generate Quote** node.
2. In the **System Message** field, replace the placeholder line ("See prompts/quote-agent.md...") with the **full text of `prompts/quote-agent.md`**, AND prepend the **full text of `prompts/voice-style-guide.md`** at the top.
3. Save.
4. Repeat for the AI Agent nodes in workflows 02 and 03 (using `review-sentiment.md` and `reactivation-copywriter.md` respectively, plus `voice-style-guide.md`).

### 3.5 Upload the data JSON files

The workflows reference `data/pricing.json`, `data/travel-zones.json`, and `data/fleet-targets.json`.

In n8n Cloud, the easiest path is:
1. Open each JSON file in this repo.
2. Replace the **Read File** node in each workflow with a **Set** node containing the JSON inline. (n8n Cloud doesn't have filesystem read by default.)
3. **OR** host these JSON files at `https://premierdetailing.ca/data/pricing.json` etc. (just upload them as static files via Wix) and replace the Read File nodes with HTTP Request nodes that GET those URLs.

Recommendation: go with the Set-node-inline approach for v1 — simplest, no external dependency.

---

## Phase 4 — Wire up the Wix form (20 min)

### 4.1 Add the booking form to your site

1. In Wix Editor, go to the page you want the booking form on (e.g., `/book`).
2. Add an **Embed → HTML** element.
3. Paste the contents of `wix/booking-form-embed.html` into the HTML iframe.
4. Edit one line: replace `https://YOUR-N8N-DOMAIN/webhook/premier-detailing-lead` with your real n8n URL.
5. Save and publish.

### 4.2 Test it

Submit the form yourself with a real phone number. You should receive 2–3 SMS messages within 30 seconds with a quote. If you don't, check the n8n execution log (Workflows → 01 → Executions tab).

---

## Phase 5 — Activate everything (10 min)

For each workflow in n8n:

1. Open the workflow.
2. Click **Inactive** in the top-right to flip it to **Active**.
3. Save.

That's it. The system is live.

---

## Phase 6 — Testing checklist

Run through these scenarios end-to-end before trusting it with real customers:

- [ ] Submit a Stratford lead with a Civic + Full In & Out → expect quote within 30s, $50 deposit line, 2 slot offers.
- [ ] Submit a St. Marys lead → expect $20 travel fee added to quote.
- [ ] Submit a London lead (50km) → expect polite decline SMS.
- [ ] Submit a Kitchener lead (~40km) → expect Slack alert in `#owner-alerts`, customer gets holding text.
- [ ] Submit a 2-step paint correction request → expect Slack alert, no auto-quote.
- [ ] Submit an off-season date (e.g., December) → expect off-season waitlist response.
- [ ] Manually create a fake completed Square booking from yesterday → wait an hour → expect review request SMS.
- [ ] Reply "thanks already left it!" → expect warm thank-you SMS.
- [ ] Reply with "the interior was still dirty" → expect immediate Slack alert, holding SMS to customer.

---

## Phase 7 — Day-2 maintenance

### Weekly (5 min Monday morning)

- Check `#owner-alerts` Slack channel for any AI escalations from the past week.
- Update `data/fleet-targets.json` after any walk-in pitches — set `last_pitched: "YYYY-MM-DD"` and `status: "pitched"|"in_discussion"|"won"|"lost"|"do_not_pitch"`.
- Review the Square customer notes — add `tag:trusted` for repeat customers, `tag:do_not_engage` for time-wasters.

### Monthly

- Open the `data/pricing.json` file, update any prices that drifted.
- Open `prompts/voice-style-guide.md`, paste in 2–3 new sample texts you've sent so the AI keeps current with your voice.
- Look at your conversion rate — leads received vs leads booked. If <30%, the AI is leaving money on the table; share examples in Slack and we'll tune the prompts.

### Seasonal

- **March 1:** flip workflows from off-season to in-season mode (the AI checks the date automatically — no action needed).
- **August 15:** review the previous season's reactivation performance, decide which segments worked, drop the ones that didn't.

---

## Phase 8 — What's NOT built yet (roadmap)

These are explicitly **out of scope** for this v1 but worth doing next, in order:

1. **AI voice agent for inbound calls** (~2 weeks). Ports the same quote agent to phone. Uses Twilio Voice + ElevenLabs. Big lift.
2. **IG/FB DM intake** into the same lead funnel. Need Meta Business Suite OAuth. ~3 hours.
3. **Crew dispatch + day-of routing**. Pulls tomorrow's bookings, builds optimal route, texts crew the schedule at 6am. ~6 hours.
4. **Auto-confirmation workflow** at 7pm the night before each appointment per your cancellation policy. Currently happens via Square reminders — fine for now, but a custom flow gives you AI conversational rescheduling. ~3 hours.
5. **Weather-triggered reschedule offers**. If rain forecast >70% for tomorrow's appointment, AI texts customer offering to push 24h. ~2 hours.
6. **Review-link QR card design** for in-person handoff. Print 100 business cards with the QR + a thank-you. ~30 min.
7. **Fleet onboarding portal** — once you land your first dealer, build a simple fleet-only Square link + dedicated inbox. ~4 hours.

---

## Help

If something breaks:

1. Check n8n **Executions** (left sidebar) for the failed run. Click it, see which node errored.
2. Most common issues: expired OAuth tokens (re-auth Google Calendar), Twilio out of credit, Anthropic key revoked.
3. The workflows have sticky notes on every section explaining what's happening — read those first.

You don't need to learn n8n deeply. You need to know:
- How to **re-auth a credential** (Credentials tab → click → re-authorize)
- How to **read an execution log** (Workflows → click workflow → Executions)
- How to **toggle a workflow on/off** (top-right of the workflow editor)

That's 90% of day-2 ops.
