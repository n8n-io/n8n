# Agent Marketplace — Creator Interviews

Research interviews with template creators to validate the agent marketplace vision.

---

## P1: Lucas Peyrin — Automation Team Lead

**Profile:** 3+ years on n8n (~10h/day), runs plug-and-play automation team for SMBs, trains enterprise IT teams. Hundreds of production workflows. ~20 published templates.

### Templates as Lead Gen
- Discovered templates 2 years in, initially ignored them
- Adding a contact form to templates = primary source of inbound clients now
- ~90% of traffic from n8n featuring/ranking — almost zero external promotion
- Effective but volatile — depends entirely on platform visibility

### AI Agents: Love-Hate
- AI agent templates get the most traction of anything he publishes
- Published ~3 AI agent templates, all focused on fixing platform shortcomings
- Built fully custom "Auto Agent v1" replacing native AI agents (model selection, tool calling, memory, output parsing)
- Notes his template ideas often later appear in core product features

### Production Reliability Gap
- Business-critical workflows need 99.9% reliability
- Native AI agent reliability drops to ~90% — unacceptable
- Weak retry logic (max 5 retries / 5 seconds, no exponential backoff)
- Poor failure handling and recovery strategies

### Missing AI Agent Capabilities
- **Memory:** no control over what's stored, tool calls lost, can't share across agents
- **Prompts:** hard to optimise without injecting custom JS
- **Errors:** no exponential backoff, weak recovery
- **Parsing:** JSON breaks on markdown blocks, no native XML parsing
- **Images:** can't store in memory, requires manual download → base64 → prompt injection

### Marketplace UX Pain
- Search is "awful" — users miss the "load more" button
- Hard to discover or navigate content
- No template folders — forces complex systems into single workflows
- Needs folders for: subworkflows, multi-version templates, multilingual variants
- Folder structure would improve discoverability, SEO, and directory cleanliness

### Key Signals for Agent Marketplace
- Templates are already a proven lead-gen channel — marketplace would amplify this
- Creator is willing to build and publish, but reliability and UX are blockers
- Wants: folders, better search, agent reliability, memory/prompt control
- Revenue model would work if platform exposure is reliable

---

## P2: Robert Breen — AI & Data Analytics Consultant

**Profile:** ~1.5–2 years on n8n, runs Interactive (data analytics + AI automation consulting). Primarily serves small marketing agencies. ~20 templates ready but unpublished (backlogged by consulting workload).

### Templates as Lead Magnets
- Motivated after meeting a community member with ~70 templates
- Goal: turn client work into reusable content for publicity + inbound leads
- Submission process is fine; markdown formatting is a minor barrier
- Recently became an n8n ambassador

### AI vs Non-AI Reality Check
- At least 50% of his templates don't use AI at all
- Platform's strongest value: internal processes, data movement, orchestration
- AI mainly used for: data normalisation (PDFs), summarisation, content generation
- AI agents built only when clients explicitly need them (chatbots, RAG)
- AI appears more popular because it's a marketing differentiator, not because it dominates real usage

### Agent Reliability & Design Philosophy
- Avoids giving tools directly to AI agents — tool usage is unreliable
- Prefers chaining multiple simpler, cheaper agents over one complex one
- Compares AI agents to "human interns" — ~5% error rate acceptable for non-critical tasks
- Strongly advises against AI for financially sensitive workflows (accuracy ~90–95% insufficient)
- AI agents behave more like people than deterministic systems

### Execution Cost Concerns
- Every chatbot message = one execution — costs escalate fast
- High-usage chatbots can blow through 50k/month execution limits
- For heavy chatbot use, alternative platforms (e.g. LlamaHub) may be cheaper
- Strong preference for cloud-hosted n8n (security, reduced liability)
- Recommends Pro plan over Starter for long-running workflows

### Marketing & Discovery
- Tried YouTube tutorials but inconsistent publishing = no lead gen
- Shifting to in-person events and community involvement
- Content marketing requires consistency he hasn't maintained

### Key Signals for Agent Marketplace
- Agents should be very simple or modular — small node bundles preferred
- Complex workflows are too specific to generalise for individual users
- Complex agents could work as paid lead magnets → entry point to consulting
- Marketplace value for consultants: showcase expertise, generate implementation leads
- Non-AI templates are undervalued — marketplace shouldn't be AI-only

---

## P3: Marconi Darmawan ("Mark Coney") — YouTube Educator

**Profile:** ~1.5 years on n8n, runs "Automate with Mark" YouTube channel targeting non-technical sales & marketing folks. Day job at CodeCloud (DevOps e-learning), helped launch an n8n course there. Side project, weekly/biweekly cadence.

### Templates as Educational Content
- Templates are both downloadable assets and learning materials — most include a video snippet
- Discovered templates could drive YouTube discovery (bidirectional funnel)
- Not monetising templates directly; open to a differentiated beginner course in future
- Gets paid requests occasionally but doesn't want to become an agency

### Submission & Marketplace UX
- Submission UI feels developer-oriented — intimidating for non-technical creators at first
- Auto title correction highlights wrong things (e.g. emphasises "GPT-4.1" when model choice isn't the point)
- Biggest gap isn't finding templates — it's **configuring** them
- Wants: guided setup layer (step-by-step walkthrough, SaaS-style onboarding tooltips)
- Some friction is unavoidable (API keys, auth setup happens outside n8n)

### Template Quality & Spam Risk
- LLMs make it trivial to auto-generate templates + descriptions daily
- Marketplace at risk of flooding with low-quality "slop"
- Quality controls are essential for marketplace health

### Agent Experience
- Simple constrained agents (1-2 tools) work well — e.g. Slack bot for UTM campaign links
- Complex multi-agent setups break down — hard to separate platform issues from LLM limitations
- Only ~10% of his templates are chatbots/agents — they look great in demos but create maintenance headaches
- Likes the newer agent UI ("version two is awesome")

### Why Agents > Templates for Monetisation
- Templates have a **value mismatch**: users who can configure don't need them, users who can't configure feel cheated paying for them
- AI builder makes many templates recreatable by users themselves
- Agents change the proposition: creator builds production-ready + maintained, user pays per use
- Monetisation feels justified when output is reliable and maintained
- Pay-per-use model would strongly motivate high-quality builders (guardrails + production readiness)
- Predicts existing monetising creators would adopt quickly

### Key Signals for Agent Marketplace
- Guided configuration is the biggest unlock for non-technical adoption
- Pay-per-use agents are a better value unit than one-time template downloads
- Quality gate is critical — AI-generated spam will be a real problem
- Simple agents work; complex multi-agent still fragile
- Creator-maintained agents justify charging in a way templates don't

---

## P4: Ertay Kaya — Product Director, Tripledot Studios (Mobile Gaming)

**Profile:** ~6 months on n8n, Product Director at a mobile gaming company. Recently registered as a creator, ~7-8 published templates. Discovered n8n via CEO recommendation. Uses AI heavily for summarisation + response generation across text-heavy workflows (Zendesk, app store reviews, Slack updates, marketing reports).

### Templates as Portfolio & Learning Tool
- Two motivations: share reusable company use cases + build a public portfolio for job searching
- Explicitly wants a role working more deeply with n8n (applied previously, plans to try again)
- Uses templates as first stop when exploring new ideas, learning new nodes, even discovering if nodes exist
- Strong preference for example-driven learning ("visual learner")

### What Doesn't Get Published
- Has workflows too niche or fragile to publish (e.g. ad creative detection with scraping + fragile auth)
- Publishing bar: templates should be near plug-and-play once connections are set up

### Creator-Side Friction
- **Post-approval edits** aren't re-reviewed — creator could change template drastically (team says fix coming this quarter)
- Wants **submission preview/validator** when pasting JSON (strip creds, check syntax, see result before submit)
- Description authoring feels like one large text box — wants structured fields/sections
- **Review loop unclear** — unsure if resubmission worked, wants clearer status states ("Under review again")
- Creator analytics: view counts updated daily but less precise due to stricter cookie policy

### Marketplace UX (User Side)
- Search works fine, but main page feels **stale** — "Trending AI templates" are the same items repeatedly
- Wants: freshness feeds (recently published / new trending), ratings + reviews (star ratings, creator responses)
- Template preview opens in a small window — wants full-screen exploration
- Paid template previews too stripped down — visual learners need to scan node structure, not just read descriptions
- Featured templates: wants scrollable history + "Featured" badge on template page and creator profile

### Agent & Chat Experience
- No chat front-end templates — mostly single-prompt LLM steps (input → output)
- One light agent-like template (Zendesk ticket tagging)
- Main gotcha: workflow execution semantics (e.g. Pinecone vector store only used last item, required manual looping)

### Chat/Agent Deployment Blocker
- Unclear how chat scales beyond the workflow creator — how does the rest of the company interact?
- Slack integration: thread/context behaviour confusing, one app → one workflow limitation
- Built a workaround "master workflow" routing based on Slack input
- **Slack app approval per agent = company-level bottleneck** (IT governance friction)
- Became more positive after hearing about native n8n chat front end (beta) — removes Slack app friction

### Key Signals for Agent Marketplace
- Templates serve two roles: **discovery + learning**, not just reuse — marketplace should preserve this
- Freshness, ratings/reviews, and better previews are table stakes for trust (especially paid)
- Creator trust signals matter: featured badges, review scores, response to feedback
- Agent deployment model is critical — Slack app governance kills adoption in companies
- Native chat front end could unlock experimentation without IT approval bottlenecks
- Post-approval integrity and submission UX are creator retention issues

---

## P5: Samir Saci — Supply Chain Analytics Founder & Creator

**Profile:** ~1 year on n8n, runs a startup (~1.5 years) focused on analytics + automation for supply chain optimisation (manufacturing, logistics, transportation). Uses n8n both for internal automation delivery and as orchestration alongside their own analytics product. Creates content for ~6 years. Publishes articles 2-3x/month. Strong open-source mindset.

### Why n8n Over Code
- Data science/supply chain background, not SWE — n8n fills the integration gap
- Orchestration is visible and understandable (nodes + logs vs black-box code)
- Trains customers to self-maintain; provides L2/L3 support — n8n makes knowledge transfer easier than code
- Uses n8n for fast prototyping, integrations, multi-system orchestration, alerting
- Falls back to code only for local compute needs

### Templates & Content Strategy
- Creates templates to give back, condense knowledge, and engage with other creators
- Didn't expect templates to drive traffic — main source is data science articles + YouTube
- n8n featuring can spike traffic significantly
- Published supply chain control tower (text-to-SQL agent), Telegram shipment tracking bot (highest views, hardest build)
- Positioning: "not AI fluff" — practical automation for warehouses/factories
- One article ("n8n is best opportunity for SMBs to digitalise operations") got ~10-15k views

### Marketplace Friction
- **Categorisation** is the biggest friction — supply chain/logistics templates don't map to existing categories
- Wants finer-grained tagging or dedicated vertical categories
- Newer templates getting fewer views (more creators = more competition)
- Plagiarism concern: people scrape creator profiles and repackage as LinkedIn "comment for link" posts
- Supports policy enforcement / banning exploitative behaviour

### Agent & Chat Experience
- Builds chat-based experiences to "package" workflows — Telegram bots as practical distribution wrapper
- Warehouse digitisation: operators use phones to request info / generate reports (chat-like UX)
- Also built personal chat agents (language learning — Mandarin)
- No major complaints about n8n agents specifically — main limitation is inherent AI stochasticity
- Positive on: error handling improvements, evaluations feature, output parsers + structured outputs
- Built and shared a local MCP server workflow (amplified by official n8n account)

### Agent Marketplace: Automation as a Service (AaaS)
- Interprets marketplace as GPT Store-style directory — strong interest in hosted agent access
- **Key business value:** sell access to an agent directly, no client onboarding to full infrastructure
- Today: must teach clients to create/manage instances + maintenance — high friction for SMBs
- Preferred: hosted/managed agent access removes friction for both creator and customer
- Neutralises competitor narratives ("we host it so you don't deal with instances")
- Excited by native n8n chat front end — distribute access via chat instead of building custom React apps
- Loved the concept of a restricted "chat user" role (users only see chat + public agents, not full instance UI)

### Key Signals for Agent Marketplace
- **AaaS model** is the strongest signal: creators want to sell agent access, not teach clients n8n
- Hosted agents remove friction on both sides (creator doesn't own infra, customer doesn't manage instances)
- Chat UI + chat-only roles = distribution unlock for SMB-focused creators
- Vertical categorisation/tagging is critical for niche domains (supply chain, manufacturing)
- Plagiarism protection matters for creator trust and retention
- Structured outputs + evaluations are already seen as competitive advantages over other tools

---

## Cross-Interview Synthesis

### Universal Agreements (5/5 participants)
1. **Simple agents work, complex multi-agent breaks** — every participant hit this wall
2. **Templates are lead gen / discovery tools** — not just reuse, they drive business
3. **Native agent reliability isn't production-ready** — 90-95% isn't enough for business-critical

### Emerging Marketplace Requirements

| Requirement | Mentioned By | Priority |
|---|---|---|
| Pay-per-use / hosted agents (AaaS) | P3, P5 | High |
| Quality gate / anti-spam | P3, P5 | High |
| Ratings & reviews | P4 | High |
| Better search / freshness feeds | P1, P4 | High |
| Template folders / bundles | P1, P2 | High |
| Guided configuration / onboarding | P3, P4 | High |
| Vertical categorisation / tagging | P5 | Medium |
| Creator trust signals (badges, reviews) | P4 | Medium |
| Post-approval edit controls | P4 | Medium |
| Plagiarism protection | P5 | Medium |
| Native chat front end (not Slack) | P4, P5 | High |
| Chat-only user role | P5 | Medium |

### Two Marketplace Models Validated

| Model | Who Wants It | Value Prop |
|---|---|---|
| **Blueprint Install** (buy template, run on your infra) | P1, P2 (consultants/builders) | Showcase expertise, generate implementation leads |
| **Hosted Agent Access** (AaaS, pay-per-use) | P3, P5 (educators/SMB sellers) | Sell agent access directly, no client onboarding |

Both models appear in the business case doc — these interviews validate the two-stream approach.

### Key Insight: The Value Ladder
Templates → Agents → AaaS maps to increasing value justification:
- **Templates** = value mismatch (P3: "if you can configure it, you don't need it")
- **Agents** = creator maintains, user pays per use — monetisation justified
- **AaaS** = hosted access, no infra for either side — highest friction removal

### Agent Reliability: The Consistent Blocker
| Participant | Reliability Approach |
|---|---|
| Lucas (P1) | Built custom replacement — 99.9% needed, native gives 90% |
| Robert (P2) | Chains simple agents, avoids tool use — "intern" error rate |
| Marconi (P3) | 1-2 tool agents only, avoids chatbots in production |
| Ertay (P4) | Single-prompt LLM steps, no multi-agent |
| Samir (P5) | Accepts AI stochasticity, uses structured outputs as guardrails |

### Deployment Model: The Hidden Blocker
- Slack app governance kills enterprise adoption (P4)
- Custom React front ends are friction for creators (P5)
- Native n8n chat front end + chat-only user role = the unlock both sides need
