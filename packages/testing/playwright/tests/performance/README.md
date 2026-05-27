# Performance Testing Helper

A simple toolkit for measuring and asserting performance in Playwright tests.

## Quick Start

### "I just want to measure how long something takes"
```typescript
const duration = await measurePerformance(page, 'open-node', async () => {
  await n8n.canvas.openNode('Code');
});
console.log(`Opening node took ${duration.toFixed(1)}ms`);
```

### "I want to ensure an action completes within a time limit"
```typescript
const openNodeDuration = await measurePerformance(page, 'open-node', async () => {
  await n8n.canvas.openNode('Code');
});
expect(openNodeDuration).toBeLessThan(2000); // Must complete in under 2 seconds
```

### "I want to measure the same action multiple times"
```typescript
const stats = [];
for (let i = 0; i < 20; i++) {
  const duration = await measurePerformance(page, `open-node-${i}`, async () => {
    await n8n.canvas.openNode('Code');
  });
	await n8n.ndv.clickBackToCanvasButton();
  stats.push(duration);
}
const average = stats.reduce((a, b) => a + b, 0) / stats.length;
console.log(`Average: ${average.toFixed(1)}ms`);
expect(average).toBeLessThan(2000);
```

### "I want to set performance budgets for different actions"
```typescript
const budgets = {
  triggerWorkflow: 8000,  // 8 seconds
  openLargeNode: 2500,   // 2.5 seconds
};

// Measure workflow execution
const triggerDuration = await measurePerformance(page, 'trigger-workflow', async () => {
  await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');
});
expect(triggerDuration).toBeLessThan(budgets.triggerWorkflow);

// Measure node opening
const openDuration = await measurePerformance(page, 'open-large-node', async () => {
  await n8n.canvas.openNode('Code');
});
expect(openDuration).toBeLessThan(budgets.openLargeNode);
```

### "I want to test performance with different data sizes"
```typescript
const testData = [
  { size: 30000, budgets: { triggerWorkflow: 8000, openLargeNode: 2500 } },
  { size: 60000, budgets: { triggerWorkflow: 15000, openLargeNode: 6000 } },
];

testData.forEach(({ size, budgets }) => {
  test(`performance - ${size.toLocaleString()} items`, async ({ page }) => {
    // Setup test with specific data size
    await setupTest(size);

    // Measure against size-specific budgets
    const duration = await measurePerformance(page, 'trigger-workflow', async () => {
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful')
    });
    expect(duration).toBeLessThan(budgets.triggerWorkflow);
  });
});
```

### "I want to see all performance metrics from my test"
```typescript
// After running various performance measurements...
const allMetrics = await getAllPerformanceMetrics(page);
console.log('All performance metrics:', allMetrics);
// Output: { 'open-node': 1234.5, 'save-workflow': 567.8, ... }
```

### "I want to attach performance results to my test report"
```typescript
const allMetrics = await getAllPerformanceMetrics(page);
await test.info().attach('performance-metrics', {
  body: JSON.stringify({
    dataSize: 30000,
    metrics: allMetrics,
    budgets: { triggerWorkflow: 8000, openLargeNode: 2500 },
    passed: {
      triggerWorkflow: allMetrics['trigger-workflow'] < 8000,
      openNode: allMetrics['open-large-node'] < 2500,
    }
  }, null, 2),
  contentType: 'application/json',
});
```

### "I want to measure how much memory a module adds to the instance"
Idle heap baselines are collected by the `memory-consumption-*.spec.ts` files via the
shared `runMemoryBaseline()` helper. Each spec disables one or more modules through
`N8N_DISABLED_MODULES` and stabilises memory post-GC, so the diff between specs
reveals a module's footprint.

```typescript
// memory-consumption-no-mcp-only.spec.ts
import { runMemoryBaseline } from './memory-baseline';
import { test } from '../../fixtures/base';

test.use({
  capability: {
    services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
    env: { N8N_DISABLED_MODULES: 'mcp' },
  },
});

runMemoryBaseline({ name: 'no-mcp-only', owner: 'AI' });
```

Run a focused subset and compare `heap-used` (the only metric stable enough for
single-shot diffs — `heap-total` / `RSS` / `non-heap` are noisy):

```bash
pnpm test:performance --grep "no-mcp|memory"
```

Each spec emits `${name}-heap-used-baseline`, `${name}-rss-baseline`, etc. Add the
series to `.github/workflows/ci-pull-requests.yml` if you want it surfaced in PR
comments. Run twice and average to shake out variance before quoting numbers.

## Canvas benchmark suite (`tests/performance/canvas/`)

Measures n8n canvas rendering, interaction and execution-data display under
realistic high-node-count workflows (40 / 150 / 400 / 800 nodes), with pinned
data scenarios scaling up to ~10 MB.

### Run locally

```bash
# One-time: build the n8n docker image used by container-mode tests
pnpm build:docker

# Run the full canvas benchmark suite
pnpm --filter=n8n-playwright bench:canvas

# Run a single tier (fast iteration)
pnpm --filter=n8n-playwright bench:canvas:tier "@tier:S"

# Keep containers alive afterwards to inspect the UI manually
N8N_CONTAINERS_KEEPALIVE=true pnpm --filter=n8n-playwright bench:canvas:tier "@tier:M"
```

### View results locally

Three places to look, in order from quickest to most detailed:

**1. Terminal output (during the run).** Each tier prints a one-line summary:

```
[CANVAS LOAD M] cold=2345ms · server heap=145.2MB · browser heap=42.1MB · DOM=320 · layout=15.3ms
[CANVAS INTERACTIONS M] zoom p95=18.4ms · pan p95=22.1ms · drag=84ms · tidy=420ms
[CANVAS EXEC M heavy] exec=8432ms · render=1245ms · server heap=312.1MB · browser heap=98.4MB
```

**2. Playwright HTML report (after the run).** Every metric is stored as a
`metric:<name>` attachment on its test. Open the report with:

```bash
pnpm --filter=n8n-playwright bench:canvas:report
```

Click any test → "Attachments" → each metric attachment shows the JSON body
(`{"value": 2345, "unit": "ms", "dimensions": {"tier": "M"}}`).

**3. Sentinel check (optional, for catastrophic regressions).** The sentinel
script reads `test-results.json`, which the local default reporters don't
produce. To enable it, re-run with the JSON reporter appended and then run
the script:

```bash
PLAYWRIGHT_JSON_OUTPUT_NAME=test-results.json \
  pnpm --filter=n8n-playwright bench:canvas --reporter=html,list,json,./reporters/metrics-reporter.ts,./reporters/benchmark-summary-reporter.ts

pnpm --filter=n8n-playwright bench:canvas:sentinels
```

The sentinel prints a markdown table of every gated metric and exits 1 on a
breach. CI runs this automatically on nightly jobs — locally it's mostly
useful when you've made a change you suspect could cause a catastrophic
regression and want fast feedback before pushing.

> Currents.dev and the QA Metrics webhook only fire in CI (when
> `CURRENTS_RECORD_KEY` / `QA_METRICS_WEBHOOK_URL` are set). Locally the
> HTML attachments are the source of truth.

### Size tiers

| Tier | Nodes | Sticky notes | Use |
|------|------:|-------------:|-----|
| S    |   30  |       2      | Typical user workflow |
| M    |   80  |       4      | Large customer automation |
| L    |  200  |       8      | Power-user / orchestration |

Tier sizes are intentionally conservative. We started with S/M/L/XL = 40/150/400/800
but found that canvas-execution at 400+ nodes crashes the Chromium renderer
(V8 heap is hard-capped at 4 GB by pointer compression, and non-V8 memory pressure
from run-data fan-out across hundreds of executing nodes compounds it).
canvas-execution.spec.ts logs `[V8 <tier>] jsHeapSizeLimit: 4.00 GB` on each run
to make this visible — if a future Chromium release lifts the cap, the log will
surface it and we can revisit the ladder.

The real fix lives in the n8n frontend (per-node DOM cost reduction, Vue Flow
virtualization, chunked / debounced run-data application). When that lands, raise
the tier ceiling here.

### What it measures

| Spec file | Metrics emitted (per tier `S/M/L`) |
|-----------|------------------------------------|
| `canvas-load.spec.ts` | `canvas-cold-load-{tier}-ms`, `canvas-server-heap-{tier}-mb`, `canvas-server-rss-{tier}-mb`, `canvas-browser-heap-{tier}-mb`, `canvas-dom-nodes-{tier}`, `canvas-layout-duration-{tier}-ms`, `canvas-script-duration-{tier}-ms` |
| `canvas-interactions.spec.ts` | `canvas-zoom-frame-p95-{tier}-ms`, `canvas-pan-frame-p95-{tier}-ms`, `canvas-pan-longtask-count-{tier}`, `canvas-drag-response-{tier}-ms`, `canvas-move-multi-{tier}-ms`, `canvas-duplicate-{tier}-ms`, `canvas-ndv-open-{tier}-ms`, `canvas-tidy-up-{tier}-ms` |
| `canvas-execution.spec.ts` | `canvas-exec-{small,medium,heavy}-{tier}-ms`, `canvas-exec-render-{slug}-{tier}-ms`, `canvas-post-exec-{browser,server}-heap-{tier}-mb`, `canvas-exec-pin-bytes-{tier}-{slug}` |

Each measurement runs **3 iterations**: the first is warmup (JIT, container
warm) and discarded; the median of runs 2 and 3 is attached via `attachMetric`.

Browser-side metrics use Chromium CDP (`Performance.getMetrics` +
`HeapProfiler.collectGarbage`) — far more reliable than `performance.memory`.
Frame stats use a RAF loop wrapped around the interaction plus
`PerformanceObserver({ type: 'longtask' })` for main-thread blocking.

### Storage and regression detection

- **Trend dashboards**: `attachMetric` routes to Currents.dev project `O9BJaN`
  and the QA metrics webhook. The metric series listed in
  `ci-pull-requests.yml` are surfaced in the PR-comment diff against the
  14-day rolling baseline (same channel as `memory-heap-used-baseline`).
- **Catastrophic sentinel**: `scripts/canvas-perf-sentinels.mjs` runs after
  the nightly job, parses `test-results.json`, and fails the job on hard
  breaches (cold load > 30s at M, pan p95 > 100ms, etc.). Thresholds live at
  the top of the script and are intentionally loose — wall-clock variance
  in browser e2e is 15–30%, so soft regressions are caught by trends, not
  gates.

### When it runs

- **Nightly**: `0 0 * * *` via `test-e2e-performance-reusable.yml` —
  full coverage including XL tier, sentinel script gates the job.
- **PR opt-in**: add the `run-perf-tests` label to a PR to trigger the
  `e2e-performance` job. XL tier auto-skipped on PR runs to bound CI time;
  sentinel skipped (PR comment surfaces deltas instead).

### Workflow shape

The generator (`fixtures/generate-workflow.ts`) builds a deterministic linear
chain of mixed node types (Set 30%, HTTP 20%, IF 15%, Switch 10%, Code 10%,
Merge 10%, DateTime 5%) plus sticky notes. Each tier always produces the same
workflow JSON byte-for-byte across runs. Pin data is realistic
customer/order-record JSON with deterministic seeded fillers; sizes are
clamped server-side to stay under the 12 MB `MAX_PINNED_DATA_SIZE` ceiling.

## API Reference

### `measurePerformance(page, actionName, actionFn)`
Measures the duration of an async action using the Performance API.
- **Returns:** `Promise<number>` - Duration in milliseconds

### `getAllPerformanceMetrics(page)`
Retrieves all performance measurements from the current page.
- **Returns:** `Promise<Record<string, number>>` - Map of action names to durations

## Tips

- Use unique names for measurements in loops (e.g., `open-node-${i}`) to avoid conflicts
- Set realistic budgets - add some buffer to account for variance
- Consider different budgets for different data sizes or environments
