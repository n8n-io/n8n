import { createVitestConfig } from '@n8n/vitest-config/node';

// The runners load n8n-workflow from dist as CommonJS. One copy keeps one expression engine.
export default createVitestConfig(
	{
		include: ['src/**/*.test.ts'],
		exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
		setupFiles: ['./src/__tests__/setup-env.ts', './src/__tests__/setup-expression-engine.ts'],
	},
	{ pinCjs: ['n8n-workflow'] },
);
