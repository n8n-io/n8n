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
	triggerWorkflow: 8000, // 8 seconds
	openLargeNode: 2500, // 2.5 seconds
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
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');
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
	body: JSON.stringify(
		{
			dataSize: 30000,
			metrics: allMetrics,
			budgets: { triggerWorkflow: 8000, openLargeNode: 2500 },
			passed: {
				triggerWorkflow: allMetrics['trigger-workflow'] < 8000,
				openNode: allMetrics['open-large-node'] < 2500,
			},
		},
		null,
		2,
	),
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
realistic high-node-count workflows (30 / 80 / 200 nodes), with pinned data
scenarios scaling up to ~6 MB at the largest tier (see [Size tiers](#size-tiers)
for why we stop there).

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

**1. Terminal output (during the run).** Each test prints one structured block
at the end:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Canvas Load Benchmark — L tier
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Page
    Cold load           4844 ms
    DOM nodes           76,804
    Layout duration     0 ms
    Script duration     0 ms

  Memory
    Server heap      154.3 MB
    Server RSS       409.1 MB
    Browser heap     161.5 MB
```

…and similarly for canvas-interactions (frame stats + interaction timings) and
canvas-execution (V8 heap limit, per-scenario exec/render table, post-exec heap).

Formatting comes from `helpers/report.ts` — if you add a new spec, reuse
`formatReport(title, sections)` so the suite stays visually consistent.

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

| Tier | Nodes | Sticky notes | Use                        |
| ---- | ----: | -----------: | -------------------------- |
| S    |    30 |            2 | Typical user workflow      |
| M    |    80 |            4 | Large customer automation  |
| L    |   200 |            8 | Power-user / orchestration |

Tier sizes are intentionally conservative. We started with S/M/L/XL = 40/150/400/800
but found that canvas-execution at 400+ nodes crashes the Chromium renderer —
non-V8 renderer memory pressure from run-data fan-out across hundreds of executing
nodes, which raising the V8 heap doesn't fix. The browser runs at Chromium's
default launch with no heap flag, so the numbers stay representative of a real
user's browser. The reported `jsHeapSizeLimit` is ~4 GB — V8's pointer-compression
cage, which a prior `--max-old-space-size=8192` flag couldn't exceed anyway — and
canvas-execution.spec.ts logs it each run, so if a future Chromium release shifts
that ceiling the log surfaces it and we can revisit the ladder.

The real fix lives in the n8n frontend (per-node DOM cost reduction, Vue Flow
virtualization, chunked / debounced run-data application). When that lands, raise
the tier ceiling here.

### What it measures

| Spec file                     | Metrics emitted (per tier `S/M/L`)                                                                                                                                                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canvas-load.spec.ts`         | `canvas-cold-load-{tier}-ms`, `canvas-server-heap-{tier}-mb`, `canvas-server-rss-{tier}-mb`, `canvas-browser-heap-{tier}-mb`, `canvas-dom-nodes-{tier}`, `canvas-layout-duration-{tier}-ms`, `canvas-script-duration-{tier}-ms`                                 |
| `canvas-interactions.spec.ts` | `canvas-zoom-frame-p95-{tier}-ms`, `canvas-pan-frame-p95-{tier}-ms`, `canvas-pan-longtask-count-{tier}`, `canvas-drag-response-{tier}-ms`, `canvas-move-multi-{tier}-ms`, `canvas-duplicate-{tier}-ms`, `canvas-ndv-open-{tier}-ms`, `canvas-tidy-up-{tier}-ms`, `canvas-rerender-drag-{tier}`, `canvas-rerender-move-{tier}` |
| `canvas-execution.spec.ts`    | `canvas-exec-{small,medium,heavy}-{tier}-ms`, `canvas-exec-render-{slug}-{tier}-ms`, `canvas-rerender-exec-{slug}-{tier}`, `canvas-post-exec-{browser,server}-heap-{tier}-mb`, `canvas-exec-pin-bytes-{tier}-{slug}`                                            |

Iteration count is tuned per spec to balance precision vs. budget:

- `canvas-load.spec.ts` and `canvas-interactions.spec.ts`: **3 iterations** —
  first is warmup (JIT, container warm) and discarded; median of runs 2 and 3
  is attached.
- `canvas-execution.spec.ts`: **2 iterations** — 1 warmup + 1 measured. Each
  execution iteration is expensive (mounted canvas + workflow run + run-data
  rendering), and adding a third iteration accumulated enough browser state to
  destabilise L. See "Anti-flake" notes below.

Browser-side metrics use Chromium CDP (`Performance.getMetrics` +
`HeapProfiler.collectGarbage`) — far more reliable than `performance.memory`.
Frame stats use a RAF loop wrapped around the interaction plus
`PerformanceObserver({ type: 'longtask' })` for main-thread blocking.

#### Re-render counts

`canvas-rerender-*` metrics count how many Vue component re-renders an
interaction triggers — a complement to the wall-clock timings. Two interactions
that take the same time can differ wildly in re-render count, and a count that
balloons as a workflow grows is a reactivity-thrash signal (the canvas
re-rendering far more than the change required) that timing alone hides.

The count comes from a tiny, opt-in tracker in editor-ui
(`src/app/dev/render-tracker.ts`): a global mixin whose `beforeUpdate` hook —
which fires once per component re-render, never on the initial mount —
increments a counter exposed on `window.n8nRenderTracker`. It is gated
behind the `N8N_RENDER_TRACKING` localStorage flag and installs **nothing**
unless the flag is set, so it carries no cost for real users and none for the
other benchmark specs.

The `render-stats.ts` helper drives it: `enableRenderTracking(page)` sets the
flag via `addInitScript` **before** the first navigation (so the mixin is
installed on boot), then `startRenderTracking` / `readRenderStats` bracket the
measured action. Counting only happens inside that window, so the frame-stat
measurements (pan / zoom) aren't charged for it. `total` is the headline metric
(robust regardless of production name-mangling); the per-component breakdown
(top re-renderers after the heavy-concentrated execution) is logged in the
execution report for diagnosis.

### Storage and regression detection

- **Trend dashboards**: `attachMetric` routes to Currents.dev project `O9BJaN`
  and the QA metrics webhook. The metric series listed in
  `ci-pull-requests.yml` are surfaced in the PR-comment diff against the
  14-day rolling baseline (same channel as `memory-heap-used-baseline`).
- **Catastrophic sentinel**: `scripts/canvas-perf-sentinels.mjs` runs after
  the nightly job, parses `test-results.json`, and fails the job on hard
  breaches (cold load > 30s at M, pan p95 > 100ms, re-renders > 7k on the S
  heavy execution, etc.). Thresholds live at the top of the script and are
  intentionally loose — wall-clock variance in browser e2e is 15–30%, so soft
  regressions are caught by trends, not gates. The `canvas-rerender-*` gate is
  the exception: re-render counts are near-deterministic (driven by graph
  structure, not wall-clock), so its threshold sits ~2× the observed baseline
  rather than the ~10× the timing gates allow — only a reactivity loop / runaway
  re-render trips it. It's gated at S because that's the tier with a measured
  baseline and the one that always runs; add M/L once those are baselined.

### When it runs

- **Nightly**: `0 0 * * *` via `test-e2e-performance-reusable.yml` — full
  coverage of every tier × spec, sentinel script gates the job.
- **PR opt-in**: add the `run-perf-tests` label to a PR to trigger the
  `e2e-performance` job. Sentinel skipped (PR comment surfaces deltas instead).

### Workflow shape

The generator (`fixtures/generate-workflow.ts`) builds a deterministic linear
chain of mixed node types — **Set 50%, HTTP Request 25%, Code 10%, Merge 10%,
DateTime 5%** — plus sticky notes. Each tier always produces the same workflow
JSON byte-for-byte across runs.

**Only HTTP Request nodes carry pinned data** (otherwise they'd make real
network calls in CI). Set / Code / Merge / DateTime nodes execute their real
logic with minimal pass-through parameters, so the benchmark measures real
node-execution + canvas-rendering cost — not pinned-only fast-pathing. IF and
Switch were dropped from the cycle because their default empty conditions break
the linear chain (no working output to route to); they can be reintroduced once
the generator emits valid conditions.

Pin data is realistic customer / order-record JSON with deterministic seeded
fillers, distributed across HTTP nodes by scenario:

- `small-spread`: 10 KB per HTTP node
- `medium-cluster`: 100 KB on 30 % of HTTPs, 5 KB on the rest
- `heavy-concentrated`: 1 MB on a few HTTPs, 100 KB on more, 5 KB on the rest

Per-tier heavy budgets are capped in `HEAVY_BUDGET_BY_TIER` so the total stays
safely under the 12 MB `MAX_PINNED_DATA_SIZE` server ceiling (L heavy ≈ 6 MB).

### Anti-flake

Practical safeguards baked into the suite:

- **Default browser launch** (`playwright-projects.ts`): no V8 heap flag, memory
  pressure enabled — matching a real user's browser. The reported `jsHeapSizeLimit`
  is ~4 GB (V8's pointer-compression cage; the old `--max-old-space-size=8192`
  couldn't exceed it, so that flag was a no-op for the ceiling). The mount-once and
  GC-pulse safeguards below keep the tab within that envelope, and
  `canvas-execution.spec.ts` logs the actual limit so an accidental flag or future
  Chromium change is visible.
- **Mount-once per scenario** (canvas-execution): re-navigating between every
  iteration accumulated DOM / Pinia state and crashed the tab on L. The spec
  now mounts the canvas once per scenario and runs both iterations against it.
- **Browser-side GC pulse** between scenarios (`forceBrowserGc` in
  `helpers/post-exec-heap.ts`) to reclaim retained closures before the next
  mount.
- **`reducedMotion: 'reduce'`** so Vue Flow doesn't run any decorative
  transitions during measurement.
- **Server-side GC + heap stabilisation** (`getStableHeap`) before every
  reported heap value, with the GC log silenced (`{ logGC: false }`) so the
  output stays clean.

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
