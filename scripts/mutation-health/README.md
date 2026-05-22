# `scripts/mutation-health/`

Phase 1 substrate for [DEVP-176 Mutation Health Observability](https://linear.app/n8n/issue/DEVP-176/mutation-health-observability-stryker-rollout-ai-test-generation).

## What is mutation testing?

Line coverage tells you which lines your tests **execute**. Mutation testing tells you which behavioural changes your tests **catch**. A file can have 100% line coverage and a 0% mutation score: every line runs during the test suite, but no test would fail if the code were silently broken.

### How it works

A mutation testing tool (n8n uses [Stryker](https://stryker-mutator.io/)) does this for each source file:

1. **Parse the source into an AST.**
2. **Generate small variants ("mutants")** by changing nodes in the AST. Examples:

   | Mutator | Original | Mutated |
   | --- | --- | --- |
   | Conditional | `if (item.mode === 'everyX')` | `if (true)`, `if (false)` |
   | Equality | `a === b` | `a !== b` |
   | Boundary | `value > 0` | `value >= 0` |
   | Arithmetic | `return a + b` | `return a - b` |
   | String literal | `'hello'` | `''`, `"Stryker was here!"` |
   | Block statement | `{ x(); return; }` | `{}` |
   | Conditional (ternary) | `cond ? a : b` | `a`, `b`, `cond ? a : a`, `cond ? b : b` |

   There are ~40 mutator categories. One source line typically produces several mutants.

3. **For each mutant, run the test suite against the mutated code.** One of these outcomes:

   | Outcome | Meaning |
   | --- | --- |
   | **Killed** | At least one test failed → tests caught the change. ✓ |
   | **Survived** | All tests passed → tests didn't catch the change. ✗ |
   | **NoCoverage** | No test even ran the mutated line. |
   | **Timeout** | Tests hung (counted as detected). |

4. **Mutation score** = `(killed + timeout) / (killed + timeout + survived + no_coverage)`. Higher = more load-bearing assertions.

### Line coverage vs mutation score — a real example

`packages/workflow/src/workflow-checksum.ts`:

- Line coverage: **87.09%**
- Mutation score: **38.64%**

Mutating `let hexString = ''` to `let hexString = "Stryker was here!"` survived the test suite. The tests assert that two similar workflows produce different checksums — but never pin the actual output format. Line coverage calls this fine; mutation testing flags it as assertion-light test theatre.

That divergence is exactly why this project exists.

---

## What's in this directory

| File | Purpose |
| --- | --- |
| `schema/qa_mutation_health_ledger.json` | BigQuery schema for the ledger state table |
| `schema/qa_performance_metrics-dimensions.md` | Dimensions JSON contract for the events table |
| `seed-ledger.mjs` | Enumerate `<pkg>/src/`, emit one ledger row per source file (status=new) |
| `pick-next.mjs` | Read a ledger snapshot, return the next source file to mutate |
| `fetch-ledger.mjs` | Pull the live ledger via the dedicated reader webhook (GET, no client-side SQL) |
| `emit-payload.mjs` | Turn a Stryker `summary.json` into a BQ-ready payload |
| `post-payload.mjs` | POST a payload to the writer webhook (skips cleanly if env unset) |

The Stryker run itself lives in `packages/workflow/scripts/mutate.mjs` and is invoked via `pnpm --filter=n8n-workflow mutate <src-file>`.

## End-to-end pipeline

```
[GHA nightly cron, .github/workflows/mutation-health-nightly.yml]
       │
       ├─► seed-ledger.mjs                  → ledger-seed.json (every src/ file as `new`)
       │
       ├─► post-payload.mjs                 → POST seed; writer MERGEs (idempotent — never clobbers existing scores)
       │
       ├─► fetch-ledger.mjs                 → live-ledger.json (current BQ state)
       │       │
       │       └─► GET reader webhook ──► [n8n: QA Mutation Health Reader] ──► SELECT from BQ ledger
       │
       ├─► pick-next.mjs                    → one source file
       │     priority: new → red → stale → skip green
       │     within new:        alphabetical
       │     within red/stale:  lowest score first
       │
       ├─► pnpm --filter=n8n-workflow mutate → summary.json
       │
       ├─► emit-payload.mjs                 → bq-payload.json
       │
       └─► post-payload.mjs                 → POST result; writer INSERTs event + MERGEs ledger row
                                              ↓
                              [n8n writer workflow: QA: Mutation Health Writer]
                                              ↓
                              ┌───────────────────────────────────┐
                              │ qa_mutation_health_ledger (MERGE) │
                              │ qa_performance_metrics  (INSERT)  │
                              └───────────────────────────────────┘
```

The writer workflow lives in n8n's internal Quality project. It's created and maintained outside this repo. This README documents the contract it implements.

## State transitions

| Trigger | Stored `status` |
| --- | --- |
| Source file first observed (seed insert) | `new`, `last_score=NULL` |
| Last run scored ≥ `threshold_at_run` | `green` |
| Last run scored < `threshold_at_run` | `red` |

Stored statuses are just three: `new`, `red`, `green`. The picker also computes a transient `stale` state at pick time — any `green` row whose `last_checked_at` is older than 4 weeks is treated as `stale` for that pick. No `last_checked_sha` is needed; no git history is consulted.

Picker priority: `new` → `red` → `stale` → skip fresh `green`.

- Within `new`: alphabetical (rows exit the bucket as they're scored)
- Within `red`: lowest score first (weakest tests revisited first)
- Within `stale`: oldest `last_checked_at` first (natural cycling of long-stable files)

If every row is green and fresh, the picker exits 0 with `{"picked": null, "reason": "all-green"}` — a healthy "nothing to do" state, not a failure.

## Webhook contracts

Two n8n workflows back the pipeline. Both live in the internal Quality project (`L8csxtEbFpFOWlf8`) and are created/maintained outside this repo. Both run unauthenticated (URL-as-secret pattern, matching existing `qa_*` workers).

| Endpoint | Method | Workflow | Purpose |
| --- | --- | --- | --- |
| `https://internal.users.n8n.cloud/webhook/mutation-health-writer` | POST | `QA: Mutation Health Writer` (`iYEBmBat8OscRTVq`) | INSERT events + MERGE ledger |
| `https://internal.users.n8n.cloud/webhook/mutation-health-ledger?package=<name>` | GET | `QA: Mutation Health Reader` (`ZmRsNUwvgfCSq0JI`) | Read current ledger state |

### Writer webhook

`POST https://internal.users.n8n.cloud/webhook/mutation-health-writer` with `Content-Type: application/json`:

```json
{
  "ledger": [
    {
      "source_file_path": "packages/workflow/src/cron.ts",
      "package": "n8n-workflow",
      "last_score": 95.12,
      "threshold_at_run": 80,
      "last_checked_at": "2026-05-22T10:03:55.660Z",
      "status": "green",
      "mutants_killed": 39,
      "mutants_survived": 2,
      "mutants_no_coverage": 0,
      "mutants_timeout": 0
    }
  ],
  "events": [
    {
      "benchmark_name": "mutation_health",
      "value": 95.12,
      "timestamp": "2026-05-22T10:03:55.660Z",
      "dimensions": {
        "package": "n8n-workflow",
        "source_file": "packages/workflow/src/cron.ts",
        "sha": "095239e175",
        "status_after": "green",
        "threshold": 80,
        "mutants_killed": 39,
        "mutants_survived": 2,
        "mutants_no_coverage": 0,
        "mutants_timeout": 0
      }
    }
  ]
}
```

Either array may be empty (seed POSTs send only `ledger`; manual smoke tests sometimes send only `events`).

The writer:

1. For each `events[]` row → `INSERT` into `qa_performance_metrics`.
2. For each `ledger[]` row → `MERGE` into `qa_mutation_health_ledger` on `source_file_path`. The MERGE skips updates when the incoming `status` is `new`, so seed payloads are idempotent (never clobber a real score back to `new`).

The webhook URL is delivered to GHA via the `MUTATION_HEALTH_WEBHOOK` repo secret. The secret URL itself is the only auth (matches existing `qa_*` writer pattern); rotate the secret if leaked.

### Reader webhook

`GET https://internal.users.n8n.cloud/webhook/mutation-health-ledger?package=<pkg>`:

```json
{
  "ledger": [
    {
      "source_file_path": "packages/workflow/src/cron.ts",
      "package": "n8n-workflow",
      "last_score": 95.12,
      "threshold_at_run": 80,
      "last_checked_at": "2026-05-22T10:03:55.660Z",
      "status": "green",
      "mutants_killed": 39,
      "mutants_survived": 2,
      "mutants_no_coverage": 0,
      "mutants_timeout": 0
    }
  ]
}
```

The `package` query param is validated server-side against the same pnpm-workspace allowlist regex used elsewhere in the pipeline; invalid input returns 500. No SQL is constructed or accepted on the client side — the SELECT is hardcoded in the workflow.

Unauthenticated — the URL is not a secret. The data isn't sensitive (file paths + integer scores), but treat the URL as low-trust: anyone with it can read all current ledger state for the queried package.

## Threshold (provisional)

Phase 1 runs use `STRYKER_THRESHOLD=80` as a placeholder. The threshold moves to evidence-based after ~4 weeks of Phase 1+2 data lands. Until then, treat `red`/`green` verdicts as preliminary.

## Local usage

```bash
# Run Stryker on one file (the inner loop — also invokable via /n8n:mutation-test skill)
pnpm --filter=n8n-workflow mutate src/cron.ts

# Seed the ledger for a package (idempotent — safe to re-run)
node scripts/mutation-health/seed-ledger.mjs --package-dir packages/workflow

# Pull current ledger from BQ
node scripts/mutation-health/fetch-ledger.mjs --package n8n-workflow --out /tmp/ledger.json

# Pick the next file to score
node scripts/mutation-health/pick-next.mjs --ledger-file /tmp/ledger.json

# Build a BQ payload from a Stryker run
node scripts/mutation-health/emit-payload.mjs \
  --summary packages/workflow/reports/mutation/summary.json \
  --package n8n-workflow

# POST (skips with notice if MUTATION_HEALTH_WEBHOOK is unset)
node scripts/mutation-health/post-payload.mjs \
  packages/workflow/reports/mutation/bq-payload.json
```

## Phase 2/3 evolution

- **Phase 2**: roll Stryker config out to other packages, BQ dashboards over `qa_performance_metrics` filtered to `benchmark_name='mutation_health'`. No schema changes needed.
- **Phase 3**: AI test generation. The ledger gets `attempts > 0`; AI test-file attribution lives in a separate `testgen_attempts` table — not in this ledger.
