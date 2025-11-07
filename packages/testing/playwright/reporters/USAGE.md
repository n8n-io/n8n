# Metrics Reporter Usage

Automatically collect performance metrics from Playwright tests and send them to a Webhook.

## Setup

```bash
export QA_PERFORMANCE_METRICS_WEBHOOK_URL=https://your-webhook-endpoint.com/metrics
export QA_PERFORMANCE_METRICS_WEBHOOK_USER=username
export QA_PERFORMANCE_METRICS_WEBHOOK_PASSWORD=password
```

## Attach Metrics in Tests

**Option 1: Helper function (recommended)**
```javascript
import { attachMetric } from '../../utils/performance-helper';

await attachMetric(testInfo, 'memory-usage', 1234567, 'bytes');
```

**Option 2: Direct attach**
```javascript
await testInfo.attach('metric:memory-usage', {
  body: JSON.stringify({ value: 1234567, unit: 'bytes' })
});
```

## What Gets Sent to BigQuery

```json
{
  "test_name": "My performance test",
  "metric_name": "memory-usage",
  "metric_value": 1234567,
  "metric_unit": "bytes",
  "git_commit": "abc123...",
  "git_branch": "main",
  "timestamp": "2025-08-29T..."
}
```

## Data Pipeline

**Playwright Test** → **n8n Webhook** → **BigQuery Table**

The n8n workflow that processes the metrics is here:
https://internal.users.n8n.cloud/workflow/zSRjEwfBfCNjGXK8

## BigQuery Schema

```json
{
  "fields": [
    {"name": "test_name", "type": "STRING", "mode": "REQUIRED"},
    {"name": "metric_name", "type": "STRING", "mode": "REQUIRED"},
    {"name": "metric_value", "type": "FLOAT", "mode": "REQUIRED"},
    {"name": "metric_unit", "type": "STRING", "mode": "REQUIRED"},
    {"name": "git_commit", "type": "STRING", "mode": "REQUIRED"},
    {"name": "git_branch", "type": "STRING", "mode": "REQUIRED"},
    {"name": "timestamp", "type": "TIMESTAMP", "mode": "REQUIRED"}
  ]
}
```

That's it! Metrics are automatically collected and sent when you attach them to tests.
