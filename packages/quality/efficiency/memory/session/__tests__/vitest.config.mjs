import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['memory/session/__tests__/*.test.mjs'],
		testTimeout: 20_000,
		hookTimeout: 20_000,
	},
});
