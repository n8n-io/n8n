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
pnpm --filter=@n8n/performance bench:baseline # Save new baseline
pnpm --filter=@n8n/performance bench:ci       # CI check (fails if >10% slower)
```

## Adding a Benchmark

### 1. Create a bench file

```typescript
// benchmarks/my-feature/thing.bench.ts
import { bench, describe } from 'vitest';

describe('My Feature', () => {
  bench('operation name', () => {
    // Code to measure - runs thousands of times
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

## Regression Detection

Benchmarks are compared against a saved baseline:

- **>10% slower** = regression (CI fails)
- **>10% faster** = improvement (consider updating baseline)

### Local Workflow

```bash
# 1. Before making changes, save a baseline
pnpm --filter=@n8n/performance bench:baseline

# 2. Make your changes/refactors

# 3. Check for regressions
pnpm --filter=@n8n/performance bench:ci
```

### After Intentional Improvements

```bash
# Save new baseline to reflect the improvement
pnpm --filter=@n8n/performance bench:baseline
```

## Current Benchmarks

| Area | What it measures | Why it matters |
|------|------------------|----------------|
| Expression Engine | `={{ }}` evaluation speed | Runs for every node parameter |

## Current Status

This is a proof-of-concept for local regression detection.

### CI Integration (TODO)

Baselines are hardware-specific (an 8-core MacBook baseline is meaningless on a 2-core runner). CI needs its own baseline management:

- **Option A:** Store baselines as CI artifacts, restore before comparison
- **Option B:** External storage (S3, dedicated benchmark service)
- **Option C:** Compare against previous CI run on same runner type

## Known Limitations

- **Local noise**: Background processes affect results. Run multiple times to verify.
- **Baselines are machine-specific**: Cannot commit baselines to git - they must be generated on the same hardware they'll be compared against.

## Tips

1. **Keep benchmarks focused** - one thing per bench, not workflows
2. **Use realistic data sizes** - 100 items is typical, 10k is stress test
3. **Compare approaches** - benchmark both before deciding
4. **Don't over-benchmark** - only critical hot paths need this
