# Seed n8n instance

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

---

# Seed: Anthropic + Linear estate

`seed-anthropic-linear.mjs` is a second, much smaller seed. Where `seedInstance.mjs` builds
a ~500-workflow org through the public API to stress the dependency graph, this one writes
straight to the database to produce **one plausible account**: ten readable workflows, the
data tables they read, working credentials, a fortnight of runs, four Instance AI
conversations about that estate, and a matching activity log.

```sh
pnpm seed:account                     # tokens optional
export ANTHROPIC_API_KEY=...          # or put both in packages/cli/.env, for workflows that run
export LINEAR_API_KEY=...
```

`pnpm seed:account` builds `n8n-core` first, because the script reuses n8n's own
cipher rather than reimplementing the key derivation. Tokens are read from the
environment, else from `packages/cli/.env`, `packages/@n8n/instance-ai/.env` or a
root `.env`, in that order — the shell always wins. The run report says which
source each token came from, never its value.

**Both tokens are optional.** Without one, the credential is still created and
still attached to every node that needs it, holding a labelled placeholder — the
name becomes `Anthropic (seed, fake key)` and the stored key is
`SEEDED-FAKE-KEY-not-a-real-credential`, so a 401 in a log explains itself. The
workflows open without a missing-credential warning; they just cannot run until a
real token is supplied. Re-running with the token set replaces the credential in
place, keeping its id, so every node keeps pointing at it and the label drops
away.

`SEED_PLACEHOLDER_CREDENTIALS=1` forces placeholders even where a real token is
available — for handing the resulting database to someone else, or for seeing
what the estate looks like before anything is configured.

Fixtures live in `seed-anthropic-linear.data.mjs`; the runner holds the phases and the
choice table. SQLite only, via `node:sqlite`, so it needs no dependency of its own.

## Why not SQL, and why not the public API

Three things cannot be expressed in a shareable `.sql` file:

- **`execution_data.data` is flatted-encoded**, not JSON — a hand-written payload is
  unreadable and unmaintainable.
- **Data-table rows live in a table that does not exist yet.** Rows go in
  `data_table_user_<id>`, created at runtime by `DataTableDdlService`, so the DDL has to be
  issued first.
- **Credential secrets are encrypted with the instance key.** See below.

And two things the public API cannot do: `activity_event` is written from the event bus and
has no endpoint, and the API stamps timestamps at request time — so every workflow would
look one second old. Spreading the estate over a fortnight is what makes the runs list and
the activity feed worth looking at.

## Credentials, and the trap worth avoiding

The instance encryption key **can** be pinned across a team via `N8N_ENCRYPTION_KEY`, and
n8n's ciphertext **is** portable when it is — `CipherAes256CBC` uses the OpenSSL `Salted__`
envelope, so the salt travels inside the blob and any instance with the same key string
decrypts it. Two things stop that being the answer:

1. **A key shared next to its ciphertext gives no confidentiality.** Committing an encrypted
   token beside the key that opens it is a slower way of committing the token. This is a
   public repo.
2. **Pinning is a hard cutover.** If `~/.n8n/config` already holds a key and
   `N8N_ENCRYPTION_KEY` differs, n8n refuses to start (`instance-settings.ts`, "Mismatching
   encryption keys"). Every developer with a local instance would have to delete or edit
   that file first.

So no key is pinned and nothing secret is shared. The script reads the key this machine
already has, takes the tokens from the environment, and encrypts locally. The script is the
shareable artefact; the key, the tokens and the ciphertext never leave the machine. Token
*lengths* are reported, never values.

## The bias is the point

Every workflow uses the Anthropic chat model and touches Linear, and for every job where
n8n offers a choice, exactly one node was picked and used everywhere — If over Switch,
Filter over If-plus-NoOp, Loop Over Items over a Code loop, and **no Code node anywhere**.
The `CHOICES` table at the top of the runner records each pick and what it was chosen over.
**Adding a workflow means following that table rather than picking again**; the consistency
is what makes the estate usable as a fixture for anything that reasons about what a user
tends to reach for.

## Phases, and why the order matters

Data tables → credentials → workflows → executions → threads → activity. Each phase takes
real ids from the ones before it, so the parts cannot drift: activity entries cite the
execution ids that were actually inserted, threads reference workflows that exist, and the
data-table workflows point at tables that were really created. A hand-maintained set of
fixtures across six tables would have gone stale on the first edit.

The activity phase is skipped with a printed note on a build whose migrations do not include
`activity_event`, so the script is safe to run on master.

## Interaction with `seedInstance.mjs`

They do not collide. `seedInstance.mjs` clears on the prefix `[seed] ` (trailing space); this
script names its workflows `[seed-al] …` and matches its own rows on the `seedAl` id prefix.

Both are safe to re-run. Verified over three consecutive runs: the counts stay at 10
workflows, 2 credentials, 9 executions, 4 threads, 12 messages, 2 data tables and 30
activity entries, with no duplicated credential blocks on any node.
