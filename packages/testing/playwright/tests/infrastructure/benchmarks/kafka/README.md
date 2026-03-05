# Kafka Benchmarks

Two benchmark suites that measure n8n's Kafka trigger performance under different conditions.
Part of the `benchmarks/` framework — see sibling directories for other trigger types (e.g., webhook).

## Suites

### Load (`load.spec.ts`)

**Question: "Can n8n keep up with incoming Kafka traffic?"**

Measures per-execution latency (p50/p95/p99) and completion rate under realistic load patterns. Uses consumer group lag polling to track individual message consumption.

| Scenario | What it tests |
|----------|---------------|
| `10-nodes-1KB-10mps` | Baseline — sustain a modest steady stream |
| `30-nodes-10KB-100mps` | Scale pressure — larger workflows + heavier payloads at 10x rate |
| `60-nodes-1KB-preload-10k` | Burst capacity — drain a backlog with no pacing |
| `10-nodes-100KB-10mps` | Payload weight — does message size affect latency? |

### Throughput (`throughput.spec.ts`)

**Question: "What's the throughput ceiling and what degrades it?"**

Measures sustained exec/s and actions/s via VictoriaMetrics counters. Preloads all messages before activating the workflow to measure maximum drain rate. Collects Postgres and event loop diagnostics after each run.

ONE test file runs in ALL benchmark profiles automatically via Playwright projects. Adding a new profile or scenario auto-expands coverage.

| Scenario | What it tests |
|----------|---------------|
| `10/30/60-nodes-10KB-10kb-out-5k` | Node count scaling curve with realistic payload (10KB in + 10KB out per node) |
| `10-nodes-1KB-100kb-out-5k` | DB write pressure (heavy) — 100KB output per node |

### Queue Mode Load (`load-queue.spec.ts`)

**Question: "How does queue mode overhead compare to direct mode? How does worker scaling improve throughput?"**

Runs the same 4 scenarios from the direct-mode load suite but with n8n in queue mode (1 main + N workers). Worker count is controlled via the `KAFKA_LOAD_WORKERS` env var (default: 1).

| Workers | What it measures |
|---------|-----------------|
| 1 | Queue mode baseline — isolates Redis job queuing overhead vs direct mode |
| 2 | First scaling step — does a second worker help? |
| 4 | Mid-range scaling — diminishing returns? |
| 8 | High-end scaling — where does contention appear? |

## Benchmark Profiles

Throughput tests run in Playwright projects that represent real-world deployment configurations. Each profile provides the full container config (services, env vars, workers).

| Profile | Mode | Workers | Log | Pool | Concurrency | Save | Matches |
|---------|------|---------|-----|------|-------------|------|---------|
| `benchmark-direct` | Direct | 0 | info | 20 | N/A | all | Self-hosted single instance |
| `benchmark-queue` | Queue | 2 | info | 2 | 10 | all | Helm chart defaults |
| `benchmark-queue-tuned` | Queue | 2 | error | 20 | 20 | none | Optimized deployment |

**Adding a new profile** (e.g., multi-main): Add one entry to `BENCHMARK_PROFILES` in `playwright-projects.ts`. All 7 throughput scenarios auto-run in it.

**Adding a new scenario**: Add one entry to `scenarios/throughput-scenarios.ts`. It auto-runs in all 3 profiles.

**Key findings from benchmarking (10-nodes-1KB-5k noop, queue 2w):**

| Bottleneck | Impact | Fix |
|------------|--------|-----|
| Debug logging | ~50% throughput loss | `N8N_LOG_LEVEL=error` |
| Sequential Kafka dispatch | Consumer blocked on execution completion | `parallelProcessing: true` |
| PG execution writes | Queue Completed/s doubled (45→86 jobs/s) | `EXECUTIONS_DATA_SAVE_ON_SUCCESS=none` |

## Running

```bash
# Build docker image first
pnpm build:docker

# All benchmark profiles (direct + queue + queue-tuned)
pnpm --filter=n8n-playwright test:benchmark

# Specific profile
pnpm --filter=n8n-playwright test:benchmark --project="benchmark-direct:*"
pnpm --filter=n8n-playwright test:benchmark --project="benchmark-queue:*"
pnpm --filter=n8n-playwright test:benchmark --project="benchmark-queue-tuned:*"

# Specific scenario in specific profile
pnpm --filter=n8n-playwright test:benchmark --project="benchmark-queue:*" --grep "10-nodes-1KB-5k"

# Custom message count
BENCHMARK_MESSAGES=50000 pnpm --filter=n8n-playwright test:benchmark

# Custom worker count (queue profiles only)
KAFKA_LOAD_WORKERS=3 pnpm --filter=n8n-playwright test:benchmark --project="benchmark-queue:*"

# Load tests (latency/p50/p95 — separate suite)
pnpm --filter=n8n-playwright test:infrastructure --grep "10-nodes-1KB-10mps"

# Queue mode load — scaling curve
for w in 1 2 4 8; do
  KAFKA_LOAD_WORKERS=$w pnpm --filter=n8n-playwright test:infrastructure --grep "@kafka-load-queue"
done
```

## Results

A benchmark summary table prints at the end of every run and appears in the GitHub Actions job summary:

```
│ Trigger │ Suite      │ Scenario                 │ exec/s │ actions/s │   p50 │   p95 │   p99 │
├─────────┼────────────┼──────────────────────────┼────────┼───────────┼───────┼───────┼───────┤
│ kafka   │ load       │ 10-nodes-1KB-10mps       │   90.6 │         — │   3ms │   5ms │  13ms │
│ kafka   │ throughput │ 10-nodes-1KB-5k          │  142.8 │    1427.6 │     — │     — │     — │
```

- **exec/s**: Workflow executions per second
- **actions/s**: Total node executions per second (exec/s × node count)
- **p50/p95/p99**: Per-execution duration percentiles (load suite only)

Throughput tests also log Postgres diagnostics (tx/s, rows inserted/s, active connections) and Node.js event loop lag to the console for bottleneck analysis.

## Architecture

Both suites share the same container stack: n8n + Kafka + Postgres + postgres-exporter + VictoriaMetrics + Vector. Tests run sequentially (1 worker) to avoid resource contention. Each test creates unique topics and credentials via `nanoid()` for logical isolation.

Direct mode tests run on a single n8n process. Queue mode tests use 1 main + N workers, controlled via `KAFKA_LOAD_WORKERS` env var.

```
playwright-projects.ts (BENCHMARK_PROFILES — deployment configs)
    └── throughput.spec.ts (single test file, runs in all profiles)
         └── harness/ (test registration + diagnostics)
              └── scenarios/ (shared scenario definitions)
                   └── utils/ (throughput-helper, kafka-workflow-builder, etc.)
```

- **Profiles** define how to deploy n8n (workers, env vars, resources) — in `playwright-projects.ts`
- **Scenarios** define what to test (node count, message count, output size, timeouts)
- **Harnesses** register Playwright tests from scenarios and collect diagnostics
- **Spec** calls the harness — no per-deployment config needed
