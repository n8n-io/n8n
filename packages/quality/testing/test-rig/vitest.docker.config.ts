import { defineConfig } from 'vitest/config';

// Each test starts its own n8n stack, so they run one at a time with long timeouts.
export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.docker.test.ts'],
		fileParallelism: false,
		testTimeout: 600_000,
		hookTimeout: 300_000,
	},
});
