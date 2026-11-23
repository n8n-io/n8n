import { createVitestConfig } from '@n8n/vitest-config/node';

// The runners load n8n-workflow from dist as CommonJS. One copy keeps one expression engine.
export default createVitestConfig(
	{
		include: ['src/**/*.integration.test.ts'],
		setupFiles: ['./src/__tests__/setup-env.ts', './src/__tests__/setup-expression-engine.ts'],
		// One property run holds many cases and the shrink that follows a failure.
		testTimeout: 60 * 60_000,
		hookTimeout: 180_000,
		// A failing seed must fail the same way again, not pass on a retry.
		retry: 0,
		// One Postgres container and one engine runtime for each worker: run one file at a time.
		fileParallelism: false,
	},
	{ pinCjs: ['n8n-workflow'] },
);
