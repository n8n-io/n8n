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
| kafka | `single-instance-ceiling-lazy-cache.spec.ts` | How much can lazy expression isolates process? |
| kafka | `steady-rate-breaking-point.spec.ts` | At what input rate does the system fall behind? |
| webhook | `webhook-single-instance.spec.ts` | What is the single-instance webhook ingestion ceiling? |
| webhook | `webhook-single-instance-lazy-cache.spec.ts` | What is the lazy expression-isolate webhook ceiling? |

### Actual — `1m + 1wp + 1w queue mode`

The production-canonical queue-mode topology: dedicated `n8n webhook` proc fronted by Caddy path-routing, with one worker draining the queue. What does a real production setup actually deliver?

| Trigger | Spec | Question |
|---------|------|----------|
| webhook | `webhook-dedicated-proc-baseline.spec.ts` | What is the webhook ingestion ceiling with a dedicated webhook proc? |
| kafka | `queue-mode-sustained-rate.spec.ts` | Can queue mode sustain 15 msg/s steady? |
| kafka | `burst-drain-capacity.spec.ts` | How fast can we drain a backlog? |
| kafka | `node-count-scaling.spec.ts` | How does burst throughput scale with workflow complexity? |
| kafka | `output-size-impact.spec.ts` | What is the impact of node output size on throughput? |

### Scaling — proc-axis and worker-axis at production topology

How does the production topology scale when you add a webhook proc, a worker, or both?

| Trigger | Spec | Topology | Question |
|---------|------|----------|----------|
| webhook | `webhook-dedicated-proc-2wp-1w.spec.ts` | 1m + 2wp + 1w | Does doubling webhook procs (workers fixed) increase ingestion throughput? |
| webhook | `webhook-dedicated-proc-2wp-2w.spec.ts` | 1m + 2wp + 2w | What is the joint scale-up of doubling both webhook procs and workers? |

### Cost — feature toggles on the actual baseline

What does turning on configuration X cost vs the baseline?

| Trigger | Spec | Question |
|---------|------|----------|
| webhook | `webhook-save-data-overhead.spec.ts` | What is the runtime cost of saving execution data on success? |

Cost specs run the same workload as the `Actual` baseline with one config knob flipped. Compare the `exec/s`/`p50` of a Cost spec against `webhook-dedicated-proc-baseline` from the same CI run to read the cost.

## Standard topology

| Tier | Mains | Webhook procs | Workers | Per-pod resources |
|------|-------|---------------|---------|-------------------|
| **Peak** | 1 | 0 | 0 | 4GB / 2 vCPU |
| **Actual** | 1 | 0–1 | 1 | main 4GB/2 vCPU, webhook 4GB/2 vCPU, worker 2GB/1 vCPU |
| **Scaling** | 1 | 2 | 1–2 | main 4GB/2 vCPU, webhook 4GB/2 vCPU, worker 2GB/1 vCPU |
| **Cost** | matches the baseline | matches the baseline | matches the baseline | matches the baseline |

Webhook-trigger specs in **Actual** and **Scaling** use the production-canonical topology (dedicated `n8n webhook` proc fronted by Caddy path-routing). Kafka-trigger specs in **Actual** use 1m + 1w queue mode (kafka doesn't ingress via HTTP — no dedicated webhook proc applicable).

All specs share a single env profile aligned with internal n8n production defaults — connection-pool, lock-duration, and Bull/Redis tuning from real deployments. See `BENCHMARK_CONFIG` in `playwright-projects.ts`.

### Runtime comparison profiles

The direct Kafka and webhook baselines run with two explicit VM expression-engine profiles and an execution engine v2 comparison:

| Profile | Execution engine | Expression engine | Lazy acquisition | Compile cache | Purpose |
|---------|------------------|-------------------|------------------|---------------|---------|
| `vm-eager` | v1 | VM | Off | Off | Tracks the current default execution path. |
| `vm-lazy-cache` | v1 | VM | On | On | Tracks the optimized no-expression execution path. |
| `engine-v2` | v2 | VM | Off | Off | Tracks the new workflow execution engine with the same expression settings as `vm-eager`. |
| `engine-v2-vm-lazy-cache` | v2 | VM | On | On | Measures the combined execution engine v2 and optimized expression-isolate path. |
| `engine-v2-split-db-vm-lazy-cache` | v2 | VM | On | On | Runs the data plane on a separate PostgreSQL server. |

Each metric records `execution_engine`, `expression_engine`, `expression_lazy_acquire`, `expression_compile_cache`, and `expression_profile` dimensions. The lazy and engine v2 comparison runs remain in benchmark telemetry and run-report artifacts, but do not feed the deployment sizing matrix while execution engine v1 with eager VM is the default runtime.

These NoOp workflows do not evaluate expressions. Lazy mode therefore avoids acquiring an isolate, so these comparisons primarily measure lazy acquisition. Use the expression-engine microbenchmarks to measure compile-cache behavior directly.

The engine v2 webhook comparison uses the same 120-second ingestion load as the v1 profiles. It does not wait for the accepted backlog to drain. Compare its tail execution rate and backlog growth instead of its completion ratio.

The engine v2 Kafka comparisons use observational completion floors: 95% for eager VM, 85% for lazy/cache, and 90% for the split-server profile. Current long runs can stop settling before full drain. The v1 baselines still require exact completion.

## Running

```bash
# Build n8n image first (skip if you only changed test code).
pnpm build:docker

# Full suite — all 21 specs sequentially (each spawns its own container).
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
│ kafka   │ other │ Kafka trigger + 1 noop, 1KB, 2k    │   27.0 │   33.8 │ —     │ —      │ —     │ 1ms    │ 530     │
│ webhook │ other │ Async webhook + 1 noop, 1KB, 5c    │   54.5 │   56.8 │ 95ms  │ 185ms  │  54.1 │ 1ms    │ 1103    │
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

Tail and staged rates require at least three distinct counter samples and 80% coverage of the requested window. Duplicate polls between VictoriaMetrics scrapes do not count as samples. A short or incomplete window omits the tail metric instead of reporting a whole-run fallback or zero. Kafka stage rates use the publisher's actual boundaries.

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
