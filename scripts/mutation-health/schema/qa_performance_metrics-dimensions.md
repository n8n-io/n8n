# `qa_performance_metrics` — mutation-health event contract

Mutation-health runs append append-only events to the existing
`n8n-telemetry.imported_n8n.qa_performance_metrics` table so the historical
time-series of scores per file is queryable without introducing a new events
table.

The table's existing columns are reused:

| Column | Value for mutation-health events |
| --- | --- |
| `benchmark_name` | `"mutation_health"` |
| `value` | Mutation score as a percentage (0-100, float). Same number that lands in `qa_mutation_health_ledger.last_score`. |
| `timestamp` | Run completion timestamp (UTC). |
| `dimensions` | JSON document with the fields below. |

## Required `dimensions` fields

| Field | Type | Notes |
| --- | --- | --- |
| `package` | string | pnpm workspace package name, e.g. `"n8n-workflow"`. |
| `source_file` | string | Source file path relative to repo root (the file Stryker mutated). |
| `sha` | string | Git SHA at run time. |
| `status_after` | string | The ledger status the row transitions to: `"green"` or `"red"`. (`"new"`/`"stale"` are only set by the picker, not by run emission.) |
| `threshold` | number | Mutation-score threshold in effect at run time. Recorded per-event so historical verdicts stay interpretable as the threshold evolves. |
| `mutants_killed` | integer | |
| `mutants_survived` | integer | |
| `mutants_no_coverage` | integer | |
| `mutants_timeout` | integer | |

## Optional `dimensions` fields

| Field | Type | Notes |
| --- | --- | --- |
| `attempts` | integer | AI refinement iterations on this run (Phase 3). Omit for Phase 1. |
| `duration_ms` | integer | Wall-clock time of the Stryker invocation, if captured. |
| `runner` | string | GHA runner label that executed this run. |

## Example row

```json
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
```

## Why not a dedicated table

The QA Data Reconciliation work (2026-05-20) is reducing the `qa_*` table count from 16 to ~4. Adding 3 dedicated tables (`stryker_runs`, `stryker_file_scores`, `stryker_mutants`) for what is at most a few thousand events per week cuts against that direction. `qa_performance_metrics` already accepts arbitrary benchmark events with a `dimensions` JSON column — exactly the shape we need. If the events table later needs a dedicated home (richer queries, partitioning by `benchmark_name`), we can promote it then.

## Why a dedicated ledger table

The ledger (`qa_mutation_health_ledger`) is **state**, not events. It is upserted, not appended. The picker needs to read "what is the current status of every known source file" in one scan; an events-table aggregate over per-source latest rows would work but adds query cost to the hottest read path. A separate state table is the standard shape for this — events go to `qa_performance_metrics`, state lives in `qa_mutation_health_ledger`.
