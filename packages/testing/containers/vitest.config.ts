import { defineConfig } from 'vitest/config';

// Unit tests for the pure helpers only. Anything that needs Docker stays out.
export default defineConfig({
	test: {
		include: ['**/*.test.ts'],
		exclude: ['**/node_modules/**'],
	},
});
