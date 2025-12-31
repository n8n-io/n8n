import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		benchmark: {
			include: ['benchmarks/**/*.bench.ts'],
		},
	},
});
