# Kafka Benchmarks

Two benchmark suites that measure n8n's Kafka trigger performance under different conditions.
Part of the `benchmarks/` framework — see sibling directories for other trigger types (e.g., webhook).

## Suites

### Load (`load.spec.ts`)

**Question: "Can n8n keep up with incoming Kafka traffic?"**

Measures per-execution latency (p50/p95/p99) and completion rate under realistic load patterns. Uses consumer group lag polling to track individual message consumption.

| Scenario | What it tests |
|----------|---------------|
| `steady: 30 nodes, 10KB, 100 msg/s` | Baseline pressure — sustainable rate with realistic payloads |
| `steady: 30 nodes, 10KB, 200 msg/s` | Approaching saturation — where does latency start degrading? |
| `steady: 30 nodes, 10KB, 300 msg/s` | Saturation — should overwhelm direct mode, stress queue modes |
| `burst: 60 nodes, 1KB, drain 10k backlog` | Burst capacity — drain a backlog with no pacing |

### Throughput (`throughput.spec.ts`)

**Question: "What's the throughput ceiling and what degrades it?"**

Measures sustained exec/s and actions/s via VictoriaMetrics counters. Preloads all messages before activating the workflow to measure maximum drain rate. Collects Postgres and event loop diagnostics after each run.

ONE test file runs in ALL benchmark profiles automatically via Playwright projects. Adding a new profile or scenario auto-expands coverage.

| Scenario | What it tests |
|----------|---------------|
| `node scaling: 10/30/60 nodes, 10KB, 10KB/node, 5k msgs` | Node count scaling curve with realistic payload (10KB in + 10KB out per node) |
| `DB pressure: 10 nodes, 1KB, 100KB/node, 5k msgs` | DB write pressure (heavy) — 100KB output per node |

## Benchmark Profiles

All benchmark tests (load + throughput) run in Playwright projects that represent real-world deployment configurations. Each profile provides the full container config (services, env vars, workers). One test file runs in ALL profiles automatically.

| Profile | Mode | Workers | Log | Pool | Concurrency | Save | Matches |
|---------|------|---------|-----|------|-------------|------|---------|
| `benchmark-direct` | Direct | 0 | info | 20 | N/A | all | Self-hosted single instance |
| `benchmark-queue` | Queue | 3 | info | default | default | all | Helm chart defaults |
| `benchmark-queue-tuned` | Queue | 3 | error | 30 | 20 | none | Optimized deployment |

Worker count is controlled via the `KAFKA_LOAD_WORKERS` env var (default: 3).

**Adding a new profile** (e.g., multi-main): Add one entry to `BENCHMARK_PROFILES` in `playwright-projects.ts`. All tests auto-run in it.

**Adding a new scenario**: Add a test to the relevant spec file. It auto-runs in all 3 profiles.

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
pnpm --filter=n8n-playwright test:benchmark --project="benchmark-queue:*" --grep "node scaling: 10 nodes"

# Custom message count
BENCHMARK_MESSAGES=50000 pnpm --filter=n8n-playwright test:benchmark

# Custom worker count (queue profiles only)
KAFKA_LOAD_WORKERS=3 pnpm --filter=n8n-playwright test:benchmark --project="benchmark-queue:*"

# Load tests only
pnpm --filter=n8n-playwright test:benchmark --grep "Kafka Load"

# Throughput tests only
pnpm --filter=n8n-playwright test:benchmark --grep "Kafka Throughput"
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

The benchmark framework uses a composable architecture with four layers:

```
Spec files (kafka/*.spec.ts)           ← wire driver + scenarios + config
    ↓ passes
Generic harnesses (harness/*.ts)       ← orchestrate: setup → generate → measure → report
    ↓ calls
TriggerDriver interface                ← encapsulates trigger-specific setup + load generation
    ↓ implemented by
kafka-driver.ts                        ← Kafka topic/cred creation, publishing, drain tracking
    ↓ uses
Shared building blocks                 ← workflow-builder, execution-sampler, diagnostics, throughput-measure
```

- **SUT** (`playwright-projects.ts`) — deployment profiles (workers, env vars, resources)
- **Generator** (`kafka-driver.ts`) — trigger-specific load production and completion tracking
- **Workflow** (`workflow-builder.ts`) — generic chain builder; any trigger node chains N nodes after it
- **Measure** (`throughput-measure.ts`, `execution-sampler.ts`, `diagnostics.ts`) — VictoriaMetrics counters, REST API latency sampling, system diagnostics

Adding a new trigger type (e.g., webhook) requires one driver file + one spec file.
The harnesses, measurement, and reporting work unchanged.

Both suites share the same container stack: n8n + Kafka + Postgres + postgres-exporter + VictoriaMetrics + Vector. Tests run sequentially (1 worker) to avoid resource contention. Each test creates unique topics and credentials via `nanoid()` for logical isolation.

Direct mode tests run on a single n8n process. Queue mode tests use 1 main + N workers, controlled via `KAFKA_LOAD_WORKERS` env var (default: 3).
