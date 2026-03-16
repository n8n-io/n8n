# Metrics Reporter Usage

Automatically collect performance metrics from Playwright tests and send them to BigQuery via webhook.
All metrics from a run are batched and sent as a single payload at the end of the run.

## Setup

```bash
export QA_METRICS_WEBHOOK_URL=https://your-webhook-endpoint.com/metrics
export QA_METRICS_WEBHOOK_USER=username
export QA_METRICS_WEBHOOK_PASSWORD=password
```

## Attaching Metrics in Tests

```typescript
import { attachMetric } from '../../utils/performance-helper';

// Simple metric
await attachMetric(testInfo, 'memory-rss', 368.04, 'MB');

// With dimensions — separates the measurement from the scenario config
await attachMetric(testInfo, 'exec-per-sec', 245.3, 'exec/s', {
  trigger: 'kafka',
  nodes: 10,
  output: '100KB',
  messages: 5000,
  mode: 'queue',
});
```

**Rule:** `metric_name` is the measurement type (`exec-per-sec`, `memory-rss`, `duration-p95`).
Config goes in `dimensions`, never in the name. This enables querying across configurations.

## Benchmark Harnesses

Use the provided harnesses — they derive dimensions from typed options automatically:

```typescript
// Kafka throughput test
await runThroughputTest({
  handle, api, services, testInfo,
  nodeCount: 10,
  nodeOutputSize: '100KB',
  messageCount: 5000,
  timeoutMs: 600_000,
  // dimensions auto-derived: { trigger: 'kafka', nodes: 10, output: '100KB', messages: 5000, mode: '...' }
});

// Webhook throughput test
await runWebhookThroughputTest({
  handle, api, services, testInfo, baseUrl,
  nodeCount: 10,
  nodeOutputSize: '100KB',
  connections: 50,
  durationSeconds: 30,
  timeoutMs: 120_000,
  // dimensions auto-derived: { trigger: 'webhook', nodes: 10, output: '100KB', connections: 50, duration_s: 30, mode: '...' }
});
```

## BigQuery Schema (`qa_performance_metrics`)

```json
[
  { "name": "test_name",        "type": "STRING",    "mode": "REQUIRED" },
  { "name": "metric_name",      "type": "STRING",    "mode": "REQUIRED" },
  { "name": "metric_value",     "type": "FLOAT64",   "mode": "REQUIRED" },
  { "name": "metric_unit",      "type": "STRING",    "mode": "NULLABLE" },
  { "name": "dimensions",       "type": "JSON",      "mode": "NULLABLE" },
  { "name": "git_sha",          "type": "STRING",    "mode": "NULLABLE" },
  { "name": "git_branch",       "type": "STRING",    "mode": "NULLABLE" },
  { "name": "git_pr",           "type": "INT64",     "mode": "NULLABLE" },
  { "name": "ci_run_id",        "type": "STRING",    "mode": "NULLABLE" },
  { "name": "ci_workflow",      "type": "STRING",    "mode": "NULLABLE" },
  { "name": "ci_job",           "type": "STRING",    "mode": "NULLABLE" },
  { "name": "runner_provider",  "type": "STRING",    "mode": "NULLABLE" },
  { "name": "runner_cpu_cores", "type": "INT64",     "mode": "NULLABLE" },
  { "name": "runner_memory_gb", "type": "FLOAT64",   "mode": "NULLABLE" },
  { "name": "timestamp",        "type": "TIMESTAMP", "mode": "REQUIRED" }
]
```

## Example Queries

**Throughput across node counts (same trigger, same output size):**
```sql
SELECT
  INT64(JSON_VALUE(dimensions, '$.nodes')) AS nodes,
  AVG(metric_value) AS avg_exec_per_sec
FROM imported_n8n.qa_performance_metrics
WHERE metric_name = 'exec-per-sec'
  AND JSON_VALUE(dimensions, '$.trigger') = 'kafka'
  AND JSON_VALUE(dimensions, '$.output') = '100KB'
  AND git_branch = 'master'
GROUP BY nodes ORDER BY nodes
```

**PR regression check (current PR vs 30-day master baseline):**
```sql
WITH pr AS (
  SELECT metric_name, dimensions, AVG(metric_value) AS value
  FROM imported_n8n.qa_performance_metrics
  WHERE git_pr = @pr_number GROUP BY metric_name, dimensions
),
baseline AS (
  SELECT metric_name, dimensions, AVG(metric_value) AS value
  FROM imported_n8n.qa_performance_metrics
  WHERE git_branch = 'master'
    AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  GROUP BY metric_name, dimensions
)
SELECT
  pr.metric_name,
  pr.dimensions,
  pr.value AS pr_value,
  baseline.value AS baseline_value,
  ROUND((pr.value - baseline.value) / baseline.value * 100, 1) AS delta_pct
FROM pr JOIN baseline USING (metric_name, dimensions)
ORDER BY ABS(delta_pct) DESC
```

## Data Pipeline

```
Playwright Test → attachMetric() → testInfo.attach('metric:...')
                                          ↓
                              MetricsReporter.onEnd()
                                          ↓
                              n8n Webhook (batched payload)
                                          ↓
                              BigQuery: qa_performance_metrics
```

The n8n workflow that processes metrics:
https://internal.users.n8n.cloud/workflow/zSRjEwfBfCNjGXK8
