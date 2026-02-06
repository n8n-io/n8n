import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		benchmark: {
			include: ['benchmarks/**/*.bench.ts'],
			// Run each benchmark longer for more stable results
			// Default is 500ms - we use 1000ms for ~2x more samples
			time: 1000,
			// Warmup: ensure JIT compilation is complete before measuring
			// Default is 5 iterations - we use 100 for more thorough warmup
			warmupIterations: 100,
			// Default warmup time is 100ms - we use 500ms for stability
			warmupTime: 500,
		},
	},
});
