import { defineConfig } from 'vitest/config';

// Each test starts its own n8n stack, so they run one at a time with long timeouts.
// The containers package reads the image and any licence from the env when it loads.
// The fake licence lets the tests check that a single-main stack never receives it.
export default defineConfig({
	test: {
		env: {
			TEST_IMAGE_N8N: process.env.TEST_IMAGE_N8N ?? 'n8nio/n8n:2.42.2',
			N8N_LICENSE_CERT: 'test-rig-fake-licence-value',
			N8N_LICENSE_ACTIVATION_KEY: 'test-rig-fake-licence-key',
		},
		globals: true,
		environment: 'node',
		include: ['src/**/*.docker.test.ts'],
		fileParallelism: false,
		testTimeout: 600_000,
		hookTimeout: 300_000,
	},
});
