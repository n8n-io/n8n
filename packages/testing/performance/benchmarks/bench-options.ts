import { test } from 'vitest';
import type { BenchFn, BenchRunOptions } from 'vitest';

/** Shared tinybench tuning for every benchmark. */
const BENCH_OPTIONS: BenchRunOptions = {
	// Measure each benchmark for 1s for stable results.
	time: 1000,
	// Ensure JIT compilation is complete before measuring (default 16 iterations).
	warmupIterations: 100,
	// Longer warmup for stability (default 250ms).
	warmupTime: 500,
};

/**
 * Registers one test that runs one benchmark with the shared tuning.
 * The test timeout is off, as for Vitest 4 benchmarks: slow cases such as the
 * QuickJS cold start can exceed the 60s default.
 */
export function defineBench(name: string, fn: BenchFn): void {
	test(name, { timeout: 0 }, async ({ bench }) => {
		await bench(name, fn).run(BENCH_OPTIONS);
	});
}
