# `scripts/mutation-health/`

Phase 1 substrate for [DEVP-176 Mutation Health Observability](https://linear.app/n8n/issue/DEVP-176/mutation-health-observability-stryker-rollout-ai-test-generation).

Holds:

- BigQuery schemas (`schema/`)
- Webhook payload emitter (`emit-payload.mjs`)
- Ledger seeder and worklist picker (`seed-ledger.mjs`, `pick-next.mjs`)
- Contracts for the n8n writer workflow that owns the actual BQ writes

The actual Stryker invocation is per-package (e.g. `pnpm --filter=n8n-workflow mutate src/cron.ts`). These scripts handle the observability path on top: turn a Stryker result into a BQ-ready payload, seed the ledger with every source file in a package, and pick the next source file to mutate.

## What the ledger measures

Mutation testing scores a **source file**'s tests by deliberately introducing bugs in the source and checking whether tests fail. A high score means the test suite catches synthetic bugs in that source; a low score means tests run but don't assert enough.

The ledger is keyed on `source_file_path`: **one row per source file**. Stryker pools assertions from every test that touches the source — there is no notion of "this score belongs to test file X." The test files themselves are not tracked; their attribution belongs in a separate `testgen_attempts` table if and when Phase 3 needs it.

## Architecture

```
[GHA nightly cron]
       │
       ├─► picker reads qa_mutation_health_ledger via QA BigQuery API
       │   selects one source file (priority: new → red → stale)
       │
       ├─► pnpm --filter=<pkg> mutate <source-file>
       │   writes packages/<pkg>/reports/mutation/summary.json
       │
       ├─► node scripts/mutation-health/emit-payload.mjs
       │   writes packages/<pkg>/reports/mutation/bq-payload.json
       │
       └─► curl --data @bq-payload.json $MUTATION_HEALTH_WEBHOOK
                  │
                  ▼
          [n8n writer workflow]  ──► MERGE into qa_mutation_health_ledger
                                 ──► INSERT into qa_performance_metrics
```

The writer workflow lives in n8n's internal Quality project (`YqhFpPRwn6UWfF4f`) — same place the existing `qa_*` writer workflows live. **It is created and maintained outside this repo.** This README documents the contract it implements.

## BigQuery surface

| Table | Purpose | Mode |
| --- | --- | --- |
| `n8n-telemetry.imported_n8n.qa_mutation_health_ledger` | State table. One row per `source_file_path`. Upserted on each run. | MERGE |
| `n8n-telemetry.imported_n8n.qa_performance_metrics` | Existing append-only events table. Mutation-health runs land with `benchmark_name='mutation_health'`. | INSERT |

Schemas:

- [`schema/qa_mutation_health_ledger.json`](schema/qa_mutation_health_ledger.json) — BQ schema JSON for the ledger
- [`schema/qa_performance_metrics-dimensions.md`](schema/qa_performance_metrics-dimensions.md) — dimensions JSON contract for the events table

## State transitions (the worklist picker enforces these)

| Trigger | `status` becomes |
| --- | --- |
| Source file first observed | `new`, `last_score=NULL` |
| Source file edited since `last_checked_sha` | `stale` |
| > 8 weeks since `last_checked_at`, no edits | `stale` |
| Last run scored ≥ `threshold_at_run` | `green` |
| Last run scored < `threshold_at_run` | `red` |

Worklist priority for the nightly cron: `new` → `red` → `stale` → skip `green`.

## Threshold (provisional)

Phase 1 runs use `STRYKER_THRESHOLD=80` as a placeholder. The threshold moves to evidence-based after ~4 weeks of Phase 1+2 data lands (see DEVP-176). Until then, treat any `red`/`green` verdict as preliminary.

## Webhook contract

The writer workflow accepts an HTTP POST with `Content-Type: application/json`, body shape:

```json
{
  "ledger": [
    {
      "source_file_path": "packages/workflow/src/cron.ts",
      "package": "n8n-workflow",
      "last_score": 95.12,
      "threshold_at_run": 80,
      "last_checked_at": "2026-05-21T20:45:07.263Z",
      "last_checked_sha": "095239e175",
      "status": "green",
      "attempts": 0,
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
      "timestamp": "2026-05-21T20:45:07.263Z",
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

The writer workflow:

1. For each `events[]` row, INSERT into `qa_performance_metrics` (append-only).
2. For each `ledger[]` row, MERGE into `qa_mutation_health_ledger` on `source_file_path`.

GHA passes the webhook URL via `MUTATION_HEALTH_WEBHOOK` secret. The webhook is not authenticated beyond the secret URL (matches existing `qa_*` writer pattern); rotate the secret if leaked.

## Local usage

```bash
# Seed the ledger once per package (enumerates src/, emits one row per file):
node scripts/mutation-health/seed-ledger.mjs --package-dir packages/workflow
# writes packages/workflow/reports/mutation/ledger-seed.json

# Pick the next source file from a ledger snapshot:
node scripts/mutation-health/pick-next.mjs --ledger-file packages/workflow/reports/mutation/ledger-seed.json
# prints a JSON row to stdout, e.g. {"source_file_path":"...","package":"...",...}

# Run Stryker on that file:
pnpm --filter=n8n-workflow mutate src/cron.ts

# Emit the BQ payload:
node scripts/mutation-health/emit-payload.mjs \
  --summary packages/workflow/reports/mutation/summary.json \
  --package n8n-workflow
# writes packages/workflow/reports/mutation/bq-payload.json
```

## Phase 2/3 evolution

- Phase 2 adds dashboards over `qa_performance_metrics` filtered to `benchmark_name='mutation_health'`. No schema changes needed.
- Phase 3 adds AI test generation. The ledger gets an `attempts > 0` signal; AI test-file attribution lives in a separate `testgen_attempts` table (not in this ledger).
- If the events table later needs a dedicated home (richer queries, partitioning), promote at that point — not now.
