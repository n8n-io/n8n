# Metrics Reporter

Collects `attachMetric()` calls from Playwright tests and sends them as a single batched
payload to the unified QA metrics webhook at the end of the run.

See `.github/CI-TELEMETRY.md` for the full payload shape, ClickHouse schema, and adding
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

## Other Senders

`ci-metrics.ts` holds the payload context and the webhook send. The
accessibility reporter (`a11y-reporter.ts`) uses it to send a per-bucket axe
score under the `a11y-buckets` benchmark. Reuse it for a new reporter instead of
rebuilding the payload.

## Example Queries

The metrics are in the ClickHouse table `qa.performance_metrics`.

```sql
-- Throughput trend by node count
SELECT JSONExtractInt(dimensions, 'nodes') AS nodes, avg(value) AS avg_exec_per_sec
FROM qa.performance_metrics
WHERE metric_name = 'exec-per-sec'
  AND JSONExtractString(dimensions, 'trigger') = 'kafka'
  AND git_branch = 'master'
GROUP BY nodes ORDER BY nodes;

-- PR vs 30-day master baseline
-- Note: dimensions is JSON text; use JSONExtractString() to extract fields for grouping/joining
WITH pr AS (
  SELECT metric_name,
    JSONExtractString(dimensions, 'trigger') AS trigger,
    JSONExtractString(dimensions, 'mode') AS mode,
    avg(value) AS value
  FROM qa.performance_metrics WHERE git_pr = {pr_number:UInt32}
  GROUP BY metric_name, trigger, mode
),
baseline AS (
  SELECT metric_name,
    JSONExtractString(dimensions, 'trigger') AS trigger,
    JSONExtractString(dimensions, 'mode') AS mode,
    avg(value) AS value
  FROM qa.performance_metrics
  WHERE git_branch = 'master'
    AND timestamp >= now() - INTERVAL 30 DAY
  GROUP BY metric_name, trigger, mode
)
SELECT pr.metric_name, pr.trigger, pr.mode,
  pr.value AS pr_value, baseline.value AS baseline_value,
  round((pr.value - baseline.value) / baseline.value * 100, 1) AS delta_pct
FROM pr JOIN baseline USING (metric_name, trigger, mode)
ORDER BY abs(delta_pct) DESC;
```
