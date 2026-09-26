import { test } from 'vitest';
import type { BenchFn, BenchRunOptions } from 'vitest';

/**
 * Shared tinybench tuning for every benchmark.
 *
 * In Vitest 5 these knobs are run options: pass them to `bench().run()` or as
 * the last argument to `bench.compare()`. The per-benchmark options argument of
 * `bench(name, options, fn)` only takes lifecycle hooks.
 */
export const BENCH_OPTIONS: BenchRunOptions = {
	// Measure each benchmark for 1s for stable results. This is now the tinybench default; kept explicit.
	time: 1000,
	// Ensure JIT compilation is complete before measuring (default 16 iterations).
	warmupIterations: 100,
	// Longer warmup for stability (default 250ms).
	warmupTime: 500,
};

/**
 * Registers one test that runs one benchmark with the shared tuning.
 *
 * The test and the benchmark get the same name, so every name must be unique.
 * Each benchmark runs on its own, as `bench()` did in Vitest 4.
 *
 * The test timeout is off, as it was for Vitest 4 benchmarks. Slow cases (for
 * example the QuickJS cold start on a loaded machine) can exceed the 60s
 * default of the benchmark project.
 */
export function defineBench(name: string, fn: BenchFn): void {
	test(name, { timeout: 0 }, async ({ bench }) => {
		await bench(name, fn).run(BENCH_OPTIONS);
	});
}
