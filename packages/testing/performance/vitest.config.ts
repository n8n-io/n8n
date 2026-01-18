import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		benchmark: {
			include: ['benchmarks/**/*.bench.ts'],
			// Run each benchmark longer for more stable results
			// Default is 500ms - we use 1000ms for ~2x more samples
			time: 1000,
		},
	},
});
