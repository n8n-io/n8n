import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: { include: ['images/**/*.test.ts'] },
});
