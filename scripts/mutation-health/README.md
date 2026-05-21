# `scripts/mutation-health/`

Phase 1 substrate for [DEVP-176 Mutation Health Observability](https://linear.app/n8n/issue/DEVP-176/mutation-health-observability-stryker-rollout-ai-test-generation).

Holds:

- BigQuery schemas (`schema/`)
- Webhook payload emitter (`emit-payload.mjs`)
- Contracts for the n8n writer workflow that owns the actual BQ writes

The actual Stryker invocation is per-package (e.g. `pnpm --filter=n8n-workflow mutate src/cron.ts`). These scripts handle the observability path on top: turn a Stryker result into a BQ-ready payload.

## Architecture

```
[GHA nightly cron]
       │
       ├─► picker reads qa_mutation_health_ledger via QA BigQuery API
       │   selects one (test_file, source_file) pair (priority: new → red → stale)
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
| `n8n-telemetry.imported_n8n.qa_mutation_health_ledger` | State table. One row per `(test_file_path, source_file_path)` pair. Upserted on each run. | MERGE |
| `n8n-telemetry.imported_n8n.qa_performance_metrics` | Existing append-only events table. Mutation-health runs land with `benchmark_name='mutation_health'`. | INSERT |

Schemas:

- [`schema/qa_mutation_health_ledger.json`](schema/qa_mutation_health_ledger.json) — BQ schema JSON for the ledger
- [`schema/qa_performance_metrics-dimensions.md`](schema/qa_performance_metrics-dimensions.md) — dimensions JSON contract for the events table

## State transitions (the worklist picker enforces these)

| Trigger | `status` becomes |
| --- | --- |
| `(test_file, source_file)` pair first observed | `new`, `last_score=NULL` |
| Source file edited since `last_checked_sha` | `stale` |
| Test file edited since `last_checked_sha` | `stale` |
| > 8 weeks since `last_checked_at`, no file edits | `stale` |
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
      "test_file_path": "packages/workflow/test/cron.test.ts",
      "source_file_path": "packages/workflow/src/cron.ts",
      "package": "n8n-workflow",
      "last_score": 95.12,
      "threshold_at_run": 80,
      "last_checked_at": "2026-05-21T20:45:07.263Z",
      "last_checked_sha": "095239e175",
      "status": "green",
      "origin": "human-written",
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
        "test_file": "packages/workflow/test/cron.test.ts",
        "source_file": "packages/workflow/src/cron.ts",
        "sha": "095239e175",
        "status_after": "green",
        "threshold": 80,
        "mutants_killed": 39,
        "mutants_survived": 2,
        "mutants_no_coverage": 0,
        "mutants_timeout": 0,
        "origin": "human-written"
      }
    }
  ]
}
```

The writer workflow:

1. For each `events[]` row, INSERT into `qa_performance_metrics` (append-only).
2. For each `ledger[]` row, MERGE into `qa_mutation_health_ledger` on `(test_file_path, source_file_path)`.

GHA passes the webhook URL via `MUTATION_HEALTH_WEBHOOK` secret. The webhook is not authenticated beyond the secret URL (matches existing `qa_*` writer pattern); rotate the secret if leaked.

## Emitting a payload locally

```bash
# After running mutate.mjs:
pnpm --filter=n8n-workflow mutate src/cron.ts

# Emit the BQ payload:
node scripts/mutation-health/emit-payload.mjs \
  --summary packages/workflow/reports/mutation/summary.json \
  --package n8n-workflow \
  --test-file packages/workflow/test/cron.test.ts
# writes packages/workflow/reports/mutation/bq-payload.json
```

## What lives outside this package

- The picker (Task #9 of DEVP-176) — reads ledger via `QA BigQuery API`, applies priority, returns next pair to process
- The writer workflow (n8n internal Quality project) — owns BQ writes
- The nightly GHA workflow (Task #10 of DEVP-176) — orchestrates picker → mutate → emit → POST

## Phase 2/3 evolution

- Phase 2 adds dashboards over `qa_performance_metrics` filtered to `benchmark_name='mutation_health'`. No schema changes needed.
- Phase 3 adds AI generation. `attempts > 0` and `origin='ai-generated'` start being non-zero. No schema changes needed.
- If the events table later needs a dedicated home (richer queries, partitioning), promote at that point — not now.
