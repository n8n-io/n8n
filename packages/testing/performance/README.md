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
pnpm --filter=@n8n/performance bench          # Run benchmarks locally
pnpm --filter=@n8n/performance bench:baseline  # Save baseline for local comparison
pnpm --filter=@n8n/performance bench:ci        # Compare against local baseline (>10% = fail)
```

## CI Regression Detection

Benchmarks run automatically on PRs that touch `packages/testing/performance/**` or `packages/workflow/src/**`. Regression detection is handled by [CodSpeed](https://codspeed.io), which:

- **Counts CPU instructions** (via valgrind simulation) instead of measuring wall-clock time
- Produces **deterministic results** regardless of runner load or hardware
- **Comments on PRs** with benchmark results and regression warnings
- Tracks performance history on the [CodSpeed dashboard](https://codspeed.io)

You can also trigger benchmarks manually for any branch via **Actions > Test: Benchmarks > Run workflow**.

### How It Works

In CI, the `@codspeed/vitest-plugin` replaces vitest's benchmark runner. Instead of running thousands of iterations and measuring time, it runs each benchmark once under valgrind to count the exact number of CPU instructions executed. Same code = same instruction count, every time.

This means CI catches subtle regressions (~1-2%) that wall-clock timing on shared runners would miss due to noise.

### Local vs CI

| | Local (`bench`) | CI (CodSpeed) |
|---|---|---|
| **Measurement** | Wall-clock time (Hz, ms) | CPU instruction count |
| **Iterations** | Thousands | One |
| **Noise** | 15-30% variance | Near-zero variance |
| **Best for** | Quick sanity checks, comparing approaches | Automated regression detection |

Local benchmarks are useful for eyeballing performance during development but too noisy for automated regression gating. Use `bench:baseline` + `bench:ci` for local before/after comparisons on the same machine in the same session.

## Adding a Benchmark

### 1. Create a bench file

```typescript
// benchmarks/my-feature/thing.bench.ts
import { bench, describe } from 'vitest';

describe('My Feature', () => {
  bench('operation name', () => {
    // Code to measure - runs thousands of times locally, once in CI
    doTheThing();
  });
});
```

### 2. Add setup outside the bench function

```typescript
// Setup runs once, not measured
const data = createTestData();
const instance = new MyClass();

describe('My Feature', () => {
  bench('with small input', () => {
    instance.process(data.small);
  });

  bench('with large input', () => {
    instance.process(data.large);
  });
});
```

### 3. Add warmup if needed

```typescript
// Warmup ensures JIT compilation is done before measuring
for (let i = 0; i < 1000; i++) {
  instance.process(data.small);
}

describe('My Feature', () => {
  // Now benchmarks measure hot path, not JIT compilation
});
```

## Reading Local Results

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
