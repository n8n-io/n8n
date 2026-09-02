# Seed n8n instance

Four scripts, all dev tooling, none of them product code:

| Script | Command | What it does |
| --- | --- | --- |
| `seedInstance.mjs` | `pnpm seed:account` | Builds the estate via the **public API**. Two profiles, below. |
| `seedHistory.mjs` | `pnpm seed:history` | Execution history, AI threads, activity entries via **SQLite**. |
| `inspectActivity.mjs` | `pnpm inspect:activity` | Read-only one-page viewer of `activity_event`. |
| `checkPreferenceProfile.mjs` | `pnpm seed:account:check` | Checks top-level parameter names against real node definitions. |

## Two profiles

`PROFILE` selects what shape of estate you get. They exist for opposite reasons,
so neither one replaces the other.

**`estate`** (default) — ~500 workflows across 30 projects, deliberately diverse
and deliberately random. Built to stress the workflow dependency graph. The rest
of this document describes it.

**`preference`** — 10 hand-written workflows that all follow one house style.
Built so an agent can be asked "what does this org normally do?" and be gradeable
on the answer. Diversity is the bug here, not the feature.

```sh
N8N_API_KEY=… PROFILE=preference pnpm seed:account
```

The ten are written out in `preference-profile.mjs` rather than generated. At
n=10 there is no reason to generate them, and a generated workflow whose name
does not describe its nodes teaches anything reading the estate something false.

### The house style

Five rules, no exceptions. Each is a place n8n offers a real choice and this org
always makes the same one — a rule with no alternative is a constraint, not a
preference, and an agent gets no credit for following it.

| Rule | What it rejects |
| --- | --- |
| OpenAI `gpt-4o-mini` chat model (5/5 AI workflows) | Anthropic, Gemini, Mistral, Ollama |
| Linear for issue tracking (6/6 tracker workflows) | Jira, GitHub Issues, Asana, Trello |
| Slack for notifications (10/10 workflows) | Discord, Teams, Telegram, email |
| Cron expressions on every schedule | the `interval` rule form |
| Every workflow ends writing to `automation_runs` | no audit trail |

### Determinism

Every random choice goes through one seeded PRNG, and seeded runs pin the clock
too. `PROFILE=preference` sets `SEED=1` by default, so two runs produce
byte-identical estates — which is what lets an A/B eval compare two arms against
the same instance. Set `SEED` explicitly for the estate profile.

### Credentials

`preference` builds credentials from the developer's own tokens, read from the
environment:

| Env var | Credential |
| --- | --- |
| `SEED_OPENAI_API_KEY` | `openAiApi` |
| `SEED_LINEAR_API_KEY` | `linearApi` |
| `SEED_SLACK_TOKEN` | `slackApi` |
| `SEED_GMAIL_OAUTH` | `gmailOAuth2` |
| `SEED_ENRICHMENT_TOKEN` | `httpHeaderAuth` |

A missing token is not an error. It produces a placeholder named
`(seed, fake key)`, so the workflows are wired and openable but visibly not
runnable. Supplying the token later and re-running upgrades the credential in
place, keeping its id, so nodes keep pointing at it.

Secrets go through the public API, which means **n8n does the encryption** — this
tooling never touches the instance encryption key. Token lengths are logged,
never values.

The upgrade is a `PATCH`. The public API exposes no `PUT` for credentials and
answers 405, which fails quietly enough to look like a working upgrade. The
preference profile also deliberately avoids `clearSeeded()` for the same reason:
that helper deletes credentials, which would change every id on every run and
rewire every node pointing at them. Only the workflows are removed and rebuilt.

## `seedHistory.mjs`

Writes what the public API cannot: executions have no create route, and threads
and activity entries have no route at all. Run it **after** `seed:account`.

A running instance is fine. SQLite serialises writers, so n8n's own inserts queue
behind this script rather than interleaving with it. Prefer an idle instance
anyway: one that is actively executing workflows can hold the write lock long
enough to time this out.

`pnpm seed:preference` chains the estate and the history, which is the single
command that leaves a usable instance.

A default run produces 175 executions over 14 days, 10 AI threads with 22
messages, and 35 activity entries. `[seed] Invoice Dunning` is made to fail its
three most recent runs at `Send Dunning Email`, so a "what broke?" probe has a
definite answer.

### The history window ends at real now, and must

n8n prunes on age. `cleanupExpiredThreads` drops conversation threads after 30
days, and execution pruning drops runs past `EXECUTIONS_DATA_MAX_AGE` (336 hours
by default). A hardcoded past date puts the whole fortnight beyond both cutoffs,
so n8n deletes the history at the next startup — this was observed, not
theorised: a fixed clock lost all 10 threads to the TTL sweep on the first
restart.

Determinism survives this. Which workflow fails, on which run, at which node,
and every message body all still come from the seeded PRNG; only the absolute
timestamps move. Set `HISTORY_NOW` to pin the window when byte-identical
timestamps are genuinely needed — and expect the history to be pruned.

### Errors have to match their workflow

An error names a node, and that node must exist in the workflow the error is
attached to, saying something a node of that type could say. A single shared
error message produces self-contradicting records — a Gmail auth failure
reported against a workflow with no Gmail node — which is worse than no history
at all. `NODE_FAILURES` maps node type to a plausible message for this reason.

## `inspectActivity.mjs`

```sh
pnpm inspect:activity                                  # ~/.n8n/database.sqlite
DB_SQLITE_DATABASE=/path/to/database.sqlite pnpm inspect:activity
PORT=5700 pnpm inspect:activity
```

Every column of `activity_event`, paginated, sortable on any column, with a
free-text filter that spans all columns including the JSON `data` blob.

Read-only three times over, because any one layer can be undone by a later edit
without the others noticing:

1. The connection is opened `readOnly`, so SQLite rejects a write itself.
2. Every statement is a SELECT.
3. The sort column comes from an allowlist derived from the table — a column name
   cannot be a bound parameter, so it is the one part of the query built by
   concatenation.

Non-GET methods return 405, and a request whose `Host` is not loopback returns
403, which closes DNS rebinding. That matters because there is no authentication
behind it.

**It is a debug surface.** Unauthenticated, serving the whole table including who
did what in which project. Loopback-only. Do not tunnel or port-forward it.

Zero dependencies — `node:sqlite` and `node:http`, both built into Node 24.

## Note on `activity_event`

`activityEventCategories` is `['workflow', 'credential']`. **Executions are
deliberately absent**: `execution_entity` already indexes `(workflowId, status,
id)` for exactly the read a feed wants, so a row per run would duplicate an
existing row and pay for it with an insert on the execution hot path. A reader
queries that table instead. So the execution and activity phases of the seed are
independent, and there is no id-citing order between them.

---

# The estate profile


`seedInstance.mjs` fills a local n8n instance with a realistic-looking spread of
projects, workflows, credentials, and data tables via the **public API**. The
resulting dependency graph is designed to render like a real org's automation
estate: dense intra-team clusters, sparse cross-team bridges through shared
utility projects, a few legacy "trenchcoat" projects sitting off to the side,
and one central data table that everything reaches through a proxy workflow.

Useful for demos, perf testing, visual QA of the workflow dependency graph, and
poking at the workflow-index module with non-trivial input.

## Quick start

```sh
N8N_API_KEY="<a public-api JWT for an owner/admin>" \
  node scripts/instance-seeding/seedInstance.mjs
```

Targets `http://localhost:5678` by default. The script is **destructive by
default**: it deletes its own prior output (anything tagged `[seed]`) and any
team projects whose names match the current taxonomy plus orphans from older
runs. Personal-project entities that don't match the seed prefix are left
alone, as are the n8n-default `My project` team projects.

### Environment variables

| Var | Default | Purpose |
| --- | --- | --- |
| `N8N_API_KEY` | (required) | Public-API JWT. Must have owner or admin scopes. |
| `N8N_BASE_URL` | `http://localhost:5678` | n8n instance to seed. |
| `CLEAR` | `false` | Set to `true` to wipe data instead. |
| `PERSONAL_WORKFLOWS` | `50` | Amount of workflows to create in the personal project. |

Runtime is ~30–45 s for a default run (~500 workflows, ~30 projects).

## What it creates

**Projects** (30 team projects + your existing personal):

- **2 utility projects** — `Shared Platform` (technical plumbing: Audit
  Logger, Slack Alerts Dispatcher, Sentry Error Forwarder, …) and
  `Org Utilities` (business helpers: Tenant Resolver, Vault Reader, Feature
  Flag Resolver, …). These are the hub workflows the rest of the org calls
  into.
- **25 community projects** organised into 5 themed communities of 5 projects
  each: Revenue, Customer, Engineering, Operations, Knowledge.
- **3 trenchcoat projects** — Legacy Migrations, Skunkworks, Founder's
  Workflows. Smaller, internally split into 2-3 disjoint sub-systems (e.g.
  `[HR System]`, `[Old Billing]`, `[Acme Acquisition]`), and almost entirely
  detached from the rest of the org. They model accreted legacy state.

**Credentials** (~110):
- Two per project max (random recipes: Notion, Slack, Postgres, GitHub, …).
- Plus **5 global credentials** living in the utility projects (Production
  Slack Webhook, Datadog API, GitHub platform bot, OpenAI production,
  Vault read-only).

**Data tables** (~15–20):
- One per ~55% of projects, with 5–20 sample rows.
- Plus one **central data table** `seed_customers` in `Org Utilities` that
  the entire org reaches through a single proxy workflow.

**Workflows** (~500), built in four phases:
- **Phase 0** — Utility lynchpin workflows in `Shared Platform` and
  `Org Utilities`, plus the Customers Proxy.
- **Phase 1** — Leaf workflows in every project, no sub-calls.
- **Phase 2** — Parent workflows with sub-workflow refs. Community projects
  pick own/sibling/lynchpin; trenchcoats pick within their internal group.
- **Phase 3** — Data-table consumer workflows (one per project DT).
- **Phase 4** — Cross-project data-table proxies for ~6 non-utility DTs.

## Two non-obvious architectural rules

1. **`DataTable` nodes can only point at tables in their own project.** Cross-
   project access goes through a proxy workflow. The `customersProxy` in
   `Org Utilities` is the only workflow with a direct `DataTable` node on
   the central table; everyone else calls the proxy via `ExecuteWorkflow`.
   Phase 4 generalises this pattern to ~6 other data tables.

2. **Per-project external-ref budgets.** Each community project is capped at
   2–5 distinct external workflow refs and 5–10 external credential refs,
   tracked across all phases. About a third of community projects opt out of
   utility refs entirely (some of those go fully self-contained — no
   external refs of any kind). Trenchcoats and utility projects are exempt.

## Tunable knobs

All knobs live at the top of `seedInstance.mjs`. The ones that change the
shape of the graph the most:

| Constant | Effect |
| --- | --- |
| `COMMUNITIES` | Project taxonomy. Add/remove communities or projects. |
| `TRENCHCOAT_PROJECTS` + `TRENCHCOAT_GROUPS` | Legacy projects and their internal subsystems. |
| `UTILITY_WORKFLOW_THEMES` | Lynchpin workflow names per utility project. |
| `LYNCHPIN_CRED_RECIPES` | The 5 global credentials. |
| `UTILITY_REF_PROB` (0.6) | Per-workflow probability of including a utility ref. |
| `CENTRAL_DT_REF_PROB` (0.08) | Per-workflow probability of calling the Customers Proxy (indirect central-DT use). |
| `ORG_UTIL_DIRECT_DT_PROB` (0.5) | Per-workflow probability that an Org Utilities phase-0 workflow gets a direct DataTable node on the central table. |
| `EXT_WF_REF_BUDGET` / `EXT_CRED_REF_BUDGET` | Per-project distinct-ref caps. |
| `NON_UTILITY_USING_TARGET` (9) | How many community projects opt out of utility refs. |
| `SELF_CONTAINED_PROJECT_PROB` | Subset of the opt-out projects that go fully siloed. |
| `sampleWorkflowCount()` | Power-law-ish size buckets per project kind. |

`SUBWF_PROB_OWN`/`_SIBLING`/`_LYNCHPIN` (in `pickCommunitySubWf`) govern how
parent workflows route sub-calls.

## Verifying a run

The dependency-graph endpoint is the canonical view of what the seed
produced. It includes both the community structure and the central-DT proxy
pattern:

```sh
curl -s "$N8N_BASE_URL/api/v1/workflows/dependency-graph?format=dot" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | sfdp -Tsvg -Goverlap=prism > graph.svg
```

`sfdp`/`fdp` (Graphviz force-directed layouts) reveal the cluster topology
better than the default hierarchical `dot` layout.

Counts via API:

```sh
for path in workflows projects credentials data-tables; do
  echo -n "$path: "
  curl -s "$N8N_BASE_URL/api/v1/$path?limit=1" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" | jq -r '.data | length'
done
```

Key numbers a default run should land near:
- ~500 workflows, 30 team projects, ~110 credentials, ~15 data tables
- ~45% of workflows reference a utility workflow
- ~5–10% of workflows reach the central data table (2–4 direct refs from
  workflows inside Org Utilities — Customers Proxy plus a few service
  workflows like Region Router or Feature Flag Resolver — and the rest via
  `ExecuteWorkflow` into the proxy)
- 20 of 29 non-utility projects use utility workflows
- 0 direct cross-project DataTable references (architectural invariant)

## Re-running and cleanup

The clear step is greedy: any workflow / credential / data-table with the
`[seed]` (or `seed_` for data tables) prefix is deleted, plus any team
project owning a `[seed]`-prefixed entity, plus any orphan team project from
an earlier run that doesn't match the current `PROJECT_NAMES` list and is
empty and not named `My project`.

To remove all seeded data without reseeding:

```sh
N8N_API_KEY=… CLEAR=only node bin/seedInstance/seedInstance.mjs
```


## Adding new behaviour

Adding a new shape of workflow usually means three places:

1. A constant or recipe at the top of the file (theme name, cred type, …).
2. A change inside `workflowNodes()` if it needs a new node type.
3. A phase change (or new phase) inside `main()` that calls `createWf()`.

`applyOrgUtilityRefs()` is the central hook for "every workflow should
sometimes touch X". Phase 4 (`/* cross-project data-table proxies */`) is
the template for "select a few entities, give each its own consumer
fan-out".

## Known limitations

- Trenchcoat phase-3 (data-table consumer) workflows don't carry an internal
  group label, so they show up as ungrouped within their trenchcoat project.
  Minor visual artifact only.
- The `[seed] X: [group] Y N` naming convention is what powers the
  group-aware visualisation. Renaming a workflow externally severs the
  link the analyser uses to group it.
- No protection against running against a non-local instance. **Don't point
  it at a shared/production n8n** — the clear step will delete everything
  prefixed `[seed]` regardless of who created it.
