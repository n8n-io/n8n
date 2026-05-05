# Benchmarks

Question-driven performance specs for n8n. Each spec answers ONE scaling question — its filename and `describe()` title state the question, and the assertions / printed metrics prove the answer.

## Specs

Each spec self-declares its container topology via `test.use({ capability })` and runs in the single `benchmarking:infrastructure` Playwright project.

### Kafka triggers (`kafka/`)

| Spec | Question |
|------|----------|
| `single-instance-ceiling.spec.ts` | How much can we process on a single instance? |
| `queue-mode-sustained-rate.spec.ts` | Can queue mode sustain 250 msg/s steady? |
| `node-count-scaling.spec.ts` | How does throughput scale with workflow complexity? |
| `output-size-impact.spec.ts` | What is the impact of node output size on throughput? |
| `steady-rate-breaking-point.spec.ts` | At what input rate does the system fall behind? |
| `burst-drain-capacity.spec.ts` | How fast can we drain a backlog? |

### Webhook triggers (`webhook/`)

| Spec | Question |
|------|----------|
| `webhook-single-instance.spec.ts` | What is the single-instance webhook ingestion ceiling? |
| `webhook-main-scaling.spec.ts` | Does webhook ingestion scale linearly with main count? |

## Standard topology

Specs default to one of two shapes (both defined in `playwright-projects.ts`):

| Shape | Mains | Workers | Per-pod resources | Used by |
|-------|-------|---------|-------------------|---------|
| **Direct** | 1 | 0 | 4GB / 2 vCPU | `single-instance-ceiling`, `webhook-single-instance` |
| **Queue** | 1 | 3 | main 4GB/2 vCPU, worker 2GB/1 vCPU | All other specs |

Aligned with internal n8n production defaults: `STANDARD_QUEUE_ENV` mirrors connection-pool, lock-duration, and Bull/Redis tuning from real deployments.

## Running

```bash
# Build n8n image first (skip if you only changed test code).
pnpm build:docker

# Full suite — all 9 specs sequentially (each spawns its own container).
pnpm --filter=n8n-playwright test:benchmark

# One spec.
pnpm --filter=n8n-playwright test:benchmark single-instance-ceiling

# By question.
pnpm --filter=n8n-playwright test:benchmark --grep "single instance"

# Sweep envs across runs (e.g. multi-main scaling).
WEBHOOK_MAINS=1 pnpm --filter=n8n-playwright test:benchmark webhook-main-scaling
WEBHOOK_MAINS=2 pnpm --filter=n8n-playwright test:benchmark webhook-main-scaling
WEBHOOK_MAINS=3 pnpm --filter=n8n-playwright test:benchmark webhook-main-scaling
```

### Useful env overrides

| Variable | Default | Effect |
|----------|---------|--------|
| `WEBHOOK_MAINS` | 2 | Number of main pods for `webhook-main-scaling` — sweep across runs to gather a scaling curve |
| `N8N_CONTAINERS_KEEPALIVE` | unset | Keep containers alive after the run for debugging |

## Reading the results

Every run prints a per-test `[DIAG]` block and emits a Benchmark Summary table at the end of the run (also surfaced in GitHub Actions job summaries):

```
│ Trigger │ Suite │ Scenario                           │ exec/s │ tail/s │ p50   │ p99    │ req/s │ ev lag │ pg tx/s │
├─────────┼───────┼────────────────────────────────────┼────────┼────────┼───────┼────────┼───────┼────────┼─────────┤
│ kafka   │ other │ Kafka trigger + 1 noop, 1KB, 150k  │ 1336.0 │ 1391.5 │ —     │ —      │ —     │ 18ms   │ 11430   │
│ webhook │ other │ Async webhook + 1 noop, 1KB, 250c  │  442.0 │  453.2 │ 558ms │ 674ms  │ 442.0 │ 8ms    │ 6692    │
```

| Column | Meaning |
|--------|---------|
| `exec/s` | Workflow executions per second across the active window |
| `tail/s` | Throughput across the final 60s of the run — closest to the architectural ceiling |
| `actions/s` | `exec/s × nodeCount` — total node executions per second |
| `p50/p99` | Per-execution duration percentiles (when execution data is saved) |
| `req/s` | HTTP requests per second (webhook specs only) |
| `ev lag` | Node.js event loop lag (sum across mains/workers) |
| `pg tx/s` | Postgres `xact_commit` rate from postgres-exporter |
| `queue` | Bull jobs waiting (queue specs only) |

For deeper PG analysis, every spec also logs a top-N `pg_stat_statements` breakdown — useful for attributing TPS to specific queries (n8n vs autovacuum vs ORM overhead like `SET search_path`).

## CI

The full suite runs on `blacksmith-8vcpu-ubuntu-2204` runners via `.github/workflows/test-e2e-infrastructure-reusable.yml`. One container at a time (`workers: 1`); each spec brings its own topology.

## Architecture

```
Spec files (kafka/*.spec.ts, webhook/*.spec.ts)   ← question + topology + scenario
    ↓ uses
Harnesses (harness/*.ts)                          ← setup → load → measure → report
    ↓ orchestrates
TriggerDriver / setupWebhook                      ← trigger-specific load production
    ↓ uses
Shared building blocks                            ← workflow-builder, throughput-measure,
                                                    diagnostics, load-executors
```

| Concern | Location |
|---------|----------|
| Topology / env | `playwright-projects.ts` (`BENCHMARK_BASE_CONFIG`, `STANDARD_QUEUE_ENV`, `STANDARD_DIRECT_ENV`) |
| Workflow shape | `utils/benchmark/workflow-builder.ts` |
| Load patterns | `utils/benchmark/load-executors.ts` (preloaded, steady, staged) |
| Throughput math | `utils/benchmark/throughput-measure.ts` |
| Diagnostics | `utils/benchmark/diagnostics.ts`, `harness/orchestration.ts` |

Adding a new trigger type requires one driver + one or more spec files. The harnesses, measurement, and reporting are trigger-agnostic.

## Adding a spec

1. Pick a question that isn't already answered by an existing spec.
2. Create `kafka/<question>.spec.ts` or `webhook/<question>.spec.ts`.
3. Use `test.use({ capability: ... })` to declare the topology — start from `BENCHMARK_BASE_CONFIG` and layer on `workers`, `mains`, or env overrides.
4. Wire the trigger driver (`kafkaDriver` or `setupWebhook`) and a harness (`runLoadTest`, `runThroughputTest`, `runWebhookThroughputTest`).
5. Annotate with `{ type: 'question', description: '<slug>' }` so the question is searchable in test metadata.
