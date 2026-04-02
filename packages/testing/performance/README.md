# Performance Benchmarks

Microbenchmarks for measuring and tracking performance of critical code paths.

## When to Use Benchmarks

**Good fit:**
- Hot paths executed thousands of times (expression evaluation, data transforms)
- Comparing implementation approaches (current vs proposed)
- Detecting regressions in critical code

**Not a good fit:**
- API endpoint latency (use load testing - k6, artillery)
- Database query performance (use query analysis tools)
- Frontend rendering (use browser profiling)
- One-off operations (startup time, migrations)

**Rule of thumb:** If it runs millions of times per day across all users, benchmark it.

## Commands

```bash
pnpm --filter=@n8n/performance bench          # Run benchmarks
pnpm --filter=@n8n/performance bench:baseline  # Save baseline for local comparison
pnpm --filter=@n8n/performance bench:compare   # Compare against baseline (>10% = fail)
```

## CI Regression Detection

Benchmarks run automatically on PRs that touch `packages/testing/performance/**` or `packages/workflow/src/**`. [CodSpeed](https://codspeed.io) counts CPU instructions instead of wall-clock time, producing deterministic results regardless of runner load. It comments on PRs with results and regression warnings.

You can also trigger benchmarks manually for any branch via **Actions > Test: Benchmarks > Run workflow**.

### Local vs CI

| | Local (`bench`) | CI |
|---|---|---|
| **Measurement** | Wall-clock time (Hz, ms) | CPU instruction count |
| **Noise** | 15-30% variance | Near-zero variance |
| **Best for** | Quick sanity checks, comparing approaches | Automated regression detection |

Local benchmarks are useful for eyeballing performance during development. Use `bench:baseline` + `bench:compare` for before/after comparisons on the same machine in the same session.

## Adding a Benchmark

```typescript
// benchmarks/my-feature/thing.bench.ts
import { bench, describe } from 'vitest';

// Setup runs once, not measured
const data = createTestData();

describe('My Feature', () => {
  bench('operation name', () => {
    doTheThing(data);
  });
});
```

## Reading Results

```
name                hz      min    max   mean    p99    rme   samples
my operation    20,000   0.04   0.20   0.05   0.10  ±0.5%   10000
```

| Column | Meaning |
|--------|---------|
| hz | Operations per second (higher = faster) |
| mean | Average time per operation in ms |
| p99 | 99th percentile - worst case latency |
| rme | Margin of error - lower = more reliable |
| samples | Number of iterations run |

## Current Benchmarks

| Area | What it measures | Why it matters |
|------|------------------|----------------|
| Expression Engine | `={{ }}` evaluation speed | Runs for every node parameter |


## Tips

1. **Keep benchmarks focused** - one thing per bench, not workflows
2. **Use realistic data sizes** - 100 items is typical, 10k is stress test
3. **Compare approaches** - benchmark both before deciding
4. **Don't over-benchmark** - only critical hot paths need this
