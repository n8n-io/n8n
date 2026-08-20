import codspeedPlugin from '@codspeed/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [process.env.CODSPEED ? codspeedPlugin() : null].filter(Boolean),
	test: {
		// The execution-engine benches import `n8n-core`, whose logger writes a
		// line per node. Set before any module loads, so the console I/O never
		// lands inside a measurement.
		env: { N8N_LOG_LEVEL: 'silent' },
		benchmark: {
			include: ['benchmarks/**/*.bench.ts'],
		},
	},
});
