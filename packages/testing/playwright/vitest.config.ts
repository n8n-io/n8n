import { defineConfig } from 'vitest/config';

// Unit tests for coverage, framework, and reporter code. Keep the list explicit so
// Vitest never picks up Playwright specs under tests/.
export default defineConfig({
	test: {
		include: [
			'scripts/**/*.test.ts',
			'fixtures/**/*.test.ts',
			'reporters/**/*.test.ts',
			'utils/**/*.test.ts',
			'tests/framework/telemetry.test.ts',
			'tests/framework/telemetry-integration.test.ts',
			'*.test.ts',
		],
	},
});
