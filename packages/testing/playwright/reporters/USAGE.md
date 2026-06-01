# Metrics Reporter

Collects `attachMetric()` calls from Playwright tests and sends them as a single batched
payload to the unified QA metrics webhook at the end of the run.

See `.github/CI-TELEMETRY.md` for the full payload shape, BigQuery schema, and adding
new telemetry from scripts.

## Setup

```bash
export QA_METRICS_WEBHOOK_URL=https://your-webhook-endpoint.com/metrics
export QA_METRICS_WEBHOOK_USER=username
export QA_METRICS_WEBHOOK_PASSWORD=password
```

## Attaching Metrics

```typescript
import { attachMetric } from '../../utils/performance-helper';

// Simple metric
await attachMetric(testInfo, 'memory-rss', 368.04, 'MB');

// With dimensions — separates the measurement from the scenario config
await attachMetric(testInfo, 'exec-per-sec', 245.3, 'exec/s', {
  trigger: 'kafka',
  nodes: 10,
  output: '100KB',
});
```

`metric_name` is the measurement type. Config goes in `dimensions`, never baked into the name.

## Benchmark Harnesses

The harnesses derive dimensions automatically — prefer these over calling `attachMetric()` directly:

```typescript
await runThroughputTest({ handle, api, services, testInfo,
  trigger: 'kafka', nodeCount: 10, nodeOutputSize: '100KB',
  messageCount: 5000, timeoutMs: 600_000,
});

await runWebhookThroughputTest({ handle, api, services, testInfo, baseUrl,
  nodeCount: 10, nodeOutputSize: '100KB',
  connections: 50, durationSeconds: 30, timeoutMs: 120_000,
});
```

## Example Queries

```sql
-- Throughput trend by node count
SELECT INT64(JSON_VALUE(dimensions, '$.nodes')) AS nodes, AVG(value) AS avg_exec_per_sec
FROM qa_performance_metrics
WHERE metric_name = 'exec-per-sec'
  AND JSON_VALUE(dimensions, '$.trigger') = 'kafka'
  AND git_branch = 'master'
GROUP BY nodes ORDER BY nodes;

-- PR vs 30-day master baseline
-- Note: dimensions is a JSON column; use JSON_VALUE() to extract fields for grouping/joining
WITH pr AS (
  SELECT metric_name,
    JSON_VALUE(dimensions, '$.trigger') AS trigger,
    JSON_VALUE(dimensions, '$.mode') AS mode,
    AVG(value) AS value
  FROM qa_performance_metrics WHERE git_pr = @pr_number
  GROUP BY metric_name, trigger, mode
),
baseline AS (
  SELECT metric_name,
    JSON_VALUE(dimensions, '$.trigger') AS trigger,
    JSON_VALUE(dimensions, '$.mode') AS mode,
    AVG(value) AS value
  FROM qa_performance_metrics
  WHERE git_branch = 'master'
    AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  GROUP BY metric_name, trigger, mode
)
SELECT pr.metric_name, pr.trigger, pr.mode,
  pr.value AS pr_value, baseline.value AS baseline_value,
  ROUND((pr.value - baseline.value) / baseline.value * 100, 1) AS delta_pct
FROM pr JOIN baseline USING (metric_name, trigger, mode)
ORDER BY ABS(delta_pct) DESC;
```
