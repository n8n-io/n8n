import { defineConfig } from 'vitest/config';

// Unit tests for the coverage pipeline scripts/fixtures only. Scoped tightly so
// vitest never picks up the Playwright e2e specs under tests/ (those are *.spec.ts
// run by Playwright, not vitest).
export default defineConfig({
	test: {
		include: ['scripts/**/*.test.ts', 'fixtures/**/*.test.ts', '*.test.ts'],
		exclude: ['tests/**'],
	},
});
