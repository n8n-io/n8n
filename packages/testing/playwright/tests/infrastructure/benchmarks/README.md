# Benchmarks

Question-driven performance specs for n8n. Each spec answers ONE scaling question — its filename and `describe()` title state the question, and the assertions / printed metrics prove the answer.

## Specs

Each spec self-declares its container topology via `test.use({ capability: benchConfig(...) })` and runs in the single `benchmarking:infrastructure` Playwright project.

The suite is organised in three tiers — each tier asks a different *kind* of question:

### Peak — `1m direct, no workers`

The architectural ceiling. No queue tax, no worker dispatch. What's the absolute max?

| Trigger | Spec | Question |
|---------|------|----------|
| kafka | `single-instance-ceiling.spec.ts` | How much can we process on a single instance? |
| kafka | `steady-rate-breaking-point.spec.ts` | At what input rate does the system fall behind? |
| webhook | `webhook-single-instance.spec.ts` | What is the single-instance webhook ingestion ceiling? |

### Actual — `1m + 1w queue mode`

The real-world minimum HA topology. What does a basic production setup actually deliver?

| Trigger | Spec | Question |
|---------|------|----------|
| kafka | `queue-mode-sustained-rate.spec.ts` | Can queue mode sustain 250 msg/s steady? |
| kafka | `burst-drain-capacity.spec.ts` | How fast can we drain a backlog? |
| kafka | `node-count-scaling.spec.ts` | How does throughput scale with workflow complexity? |
| kafka | `output-size-impact.spec.ts` | What is the impact of node output size on throughput? |

### Scaling — `2m + 2w queue mode`

HA distribution check. Does doubling capacity ~double the actual baseline?

| Trigger | Spec | Question |
|---------|------|----------|
| webhook | `webhook-main-scaling.spec.ts` | Does webhook ingestion scale linearly with main count? |

### Cost — feature toggles on the actual baseline

What does turning on configuration X cost vs the baseline?

| Trigger | Spec | Question |
|---------|------|----------|
| webhook | `webhook-otel-overhead.spec.ts` | What is the runtime cost of enabling OTEL? |

Cost specs run the same workload as a baseline spec with one config knob flipped. Compare the `exec/s`/`p50` of a Cost spec against its baseline from the same CI run to read the cost. OTEL specs also attach `jaeger-traces.json` as a test artifact — replay locally for flamegraph inspection.

## Standard topology

| Tier | Mains | Workers | Per-pod resources |
|------|-------|---------|-------------------|
| **Peak** | 1 | 0 | 4GB / 2 vCPU |
| **Actual** | 1 | 1 | main 4GB/2 vCPU, worker 2GB/1 vCPU |
| **Scaling** | 2 | 2 | main 4GB/2 vCPU, worker 2GB/1 vCPU |
| **Cost** | matches the baseline | matches the baseline | matches the baseline |

All specs share a single env profile aligned with internal n8n production defaults — connection-pool, lock-duration, and Bull/Redis tuning from real deployments. See `BENCHMARK_CONFIG` in `playwright-projects.ts`.

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
```

Topology (mains/workers, kafka, custom env) is fixed per spec via
`benchConfig(...)` in the spec file. To explore a different topology, edit the
spec — there are no env overrides.

### Useful env overrides

| Variable | Default | Effect |
|----------|---------|--------|
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

For deeper PG analysis, every spec also logs a top-N `pg_stat_statements` breakdown ranked by total ms/s of work (calls/s × avg ms), plus a `[PG SATURATION]` block (total query CPU including planner overhead and the long tail, buffer hit ratio, bgwriter / WAL pressure, `pg_stat_io` per-backend-type IO) and a `[CONTAINERS]` block (per-container CPU/memory/IO from cAdvisor or `docker stats` sampler). Each run also attaches a `run-report.json` artifact with the full structured report — feedable directly to an LLM for bottleneck analysis.

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
| Topology / env | `playwright-projects.ts` (`BENCHMARK_CONFIG`, `benchConfig()`) |
| Workflow shape | `utils/benchmark/workflow-builder.ts` |
| Load patterns | `utils/benchmark/load-executors.ts` (preloaded, steady, staged) |
| Throughput math | `utils/benchmark/throughput-measure.ts` |
| Diagnostics | `utils/benchmark/diagnostics.ts`, `harness/orchestration.ts` |

Adding a new trigger type requires one driver + one or more spec files. The harnesses, measurement, and reporting are trigger-agnostic.

## Adding a spec

1. Pick a question that isn't already answered by an existing spec.
2. Decide which tier it belongs to: **Peak** (no workers), **Actual** (1m+1w), or **Scaling** (2m+2w).
3. Create `kafka/<question>.spec.ts` or `webhook/<question>.spec.ts`.
4. Use `test.use({ capability: benchConfig('<slug>', { ... }) })` with the topology for that tier:
   - Peak kafka: `benchConfig('<slug>', { kafka: true })`
   - Actual kafka: `benchConfig('<slug>', { kafka: true, workers: 1 })`
   - Actual webhook: `benchConfig('<slug>', { workers: 1 })`
   - Scaling: `benchConfig('<slug>', { mains: 2, workers: 2 })` (kafka adds `kafka: true`)
5. Wire the trigger driver (`kafkaDriver` or `setupWebhook`) and a harness (`runLoadTest` or `runWebhookThroughputTest`).
6. Annotate with `{ type: 'question', description: '<slug>' }` so the question is searchable in test metadata.
