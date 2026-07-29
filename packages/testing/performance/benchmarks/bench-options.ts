import type { BenchOptions } from 'vitest';

/**
 * Shared tinybench tuning for every `bench()` call.
 *
 * In Vitest 4 these knobs are per-benchmark options (3rd arg to `bench()`),
 * not `test.benchmark` config — setting them there is a silent no-op.
 */
export const BENCH_OPTIONS: BenchOptions = {
	// Run each benchmark longer for more stable results (default 500ms) — ~2x more samples.
	time: 1000,
	// Ensure JIT compilation is complete before measuring (default 5 iterations).
	warmupIterations: 100,
	// Longer warmup for stability (default 100ms).
	warmupTime: 500,
};
