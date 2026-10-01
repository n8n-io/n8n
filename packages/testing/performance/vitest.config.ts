import { defineConfig } from 'vitest/config';

// CodSpeed is disabled: @codspeed/vitest-plugin does not support Vitest 5 yet.
export default defineConfig({
	test: {
		benchmark: {
			include: ['benchmarks/**/*.bench.ts'],
		},
	},
});
