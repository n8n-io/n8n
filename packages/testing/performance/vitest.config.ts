import codspeedPlugin from '@codspeed/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [process.env.CODSPEED ? codspeedPlugin() : null].filter(Boolean),
	test: {
		benchmark: {
			include: ['benchmarks/**/*.bench.ts'],
		},
	},
});
