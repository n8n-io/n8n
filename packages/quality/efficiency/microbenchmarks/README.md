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

CI benchmarks are paused. CI used [CodSpeed](https://codspeed.io), and `@codspeed/vitest-plugin` does not support Vitest 5 yet. Add the `performance` job back to `.github/workflows/ci-master.yml` when the plugin supports Vitest 5.

Until then, use `bench:baseline` + `bench:compare` for before/after comparisons on the same machine in the same session. Local results measure wall-clock time and have 15-30% variance.

## Adding a Benchmark

Use `defineBench` from `bench-options.ts`. It runs one benchmark with the shared tuning. Keep every benchmark name unique.

```typescript
// benchmarks/my-feature/thing.bench.ts
import { describe } from 'vitest';

import { defineBench } from '../bench-options';

// Setup runs once, not measured
const data = createTestData();

describe('My Feature', () => {
  defineBench('operation name', () => {
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
| Workflow graph traversal | `getChildNodes` / `getParentNodes` on branching graphs | Runs on every execution (`checkReadyForExecution`) and across the editor; must stay linear in graph size |


## Tips

1. **Keep benchmarks focused** - one thing per bench, not workflows
2. **Use realistic data sizes** - 100 items is typical, 10k is stress test
3. **Compare approaches** - benchmark both before deciding
4. **Don't over-benchmark** - only critical hot paths need this
