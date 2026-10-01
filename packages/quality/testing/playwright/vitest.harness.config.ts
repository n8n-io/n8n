import { defineConfig } from 'vitest/config';

// These consumers need Chromium. Keep them separate from browser-free unit jobs.
// eslint-disable-next-line import-x/no-default-export -- Vitest loads a default config export.
export default defineConfig({
	test: {
		include: ['tests/framework/harness-contract.test.ts'],
		fileParallelism: false,
	},
});
