import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/**/*.test.ts'],
		exclude: [],
		globals: true,
		alias: [{ find: /^@\/(.*)/, replacement: 'src/$1' }],
	},
});
