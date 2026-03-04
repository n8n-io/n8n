# Kafka Load & Throughput Benchmarks

Two benchmark suites that measure n8n's Kafka trigger performance under different conditions.

## Suites

### Load (`kafka-load.spec.ts`)

**Question: "Can n8n keep up with incoming Kafka traffic?"**

Measures per-execution latency (p50/p95/p99) and completion rate under realistic load patterns. Uses consumer group lag polling to track individual message consumption.

| Scenario | What it tests |
|----------|---------------|
| `10-nodes-1KB-10mps` | Baseline — sustain a modest steady stream |
| `30-nodes-10KB-100mps` | Scale pressure — larger workflows + heavier payloads at 10x rate |
| `60-nodes-1KB-preload-10k` | Burst capacity — drain a backlog with no pacing |
| `10-nodes-100KB-10mps` | Payload weight — does message size affect latency or memory? |

### Throughput (`trigger-throughput.spec.ts`)

**Question: "What's the throughput ceiling and what degrades it?"**

Measures sustained exec/s and actions/s via VictoriaMetrics counters. Preloads all messages before activating the workflow to measure maximum drain rate.

| Scenario | What it tests |
|----------|---------------|
| `1-node-1KB-1k` | Pure trigger overhead — minimal workflow |
| `10/30/60-nodes-1KB-5k` | Node count scaling curve — where does throughput cliff? |
| `10-nodes-1KB-10kb-out-5k` | DB write pressure (moderate) — 10KB output per node |
| `10-nodes-1KB-100kb-out-5k` | DB write pressure (heavy) — 100KB output per node |

## Running

```bash
# Build docker image first
pnpm build:docker

# All infrastructure tests
pnpm --filter=n8n-playwright test:infrastructure

# Single scenario
pnpm --filter=n8n-playwright test:infrastructure --grep "10-nodes-1KB-10mps"

# Custom message count (throughput tests only)
BENCHMARK_MESSAGES=50000 pnpm --filter=n8n-playwright test:infrastructure
```

## Results

A benchmark summary table prints at the end of every run and appears in the GitHub Actions job summary:

```
│ Trigger │ Suite      │ Scenario                 │ exec/s │ actions/s │  p50 │  p95 │  p99 │ Heap Δ MB │
├─────────┼────────────┼──────────────────────────┼────────┼───────────┼──────┼──────┼──────┼───────────┤
│ kafka   │ load       │ 10-nodes-1KB-10mps       │   90.6 │         — │  3ms │  5ms │ 13ms │    +171.7 │
│ kafka   │ throughput │ 10-nodes-1KB-5k          │  142.8 │    1427.6 │    — │    — │    — │    +268.5 │
```

- **exec/s**: Workflow executions per second
- **actions/s**: Total node executions per second (exec/s * node count)
- **p50/p95/p99**: Per-execution duration percentiles (load suite only)
- **Heap Δ MB**: Heap memory change during the test

## Architecture

Both suites share the same container stack: Kafka + Postgres + VictoriaMetrics + Vector. Tests run sequentially (1 worker) to avoid resource contention. Each test creates unique topics and credentials via `nanoid()` for logical isolation.
