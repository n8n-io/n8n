import { resolve } from 'path';
import { mergeConfig } from 'vite';
import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';

// Avoid tests failing because of difference between local and GitHub actions timezone.
// Set before workers are forked so they inherit it.
process.env.TZ = 'UTC';

// Native expression engines need a process boundary for worker shutdown.
const FORKED_TESTS = ['nodes/Form/test/FormTriggerV2.webhook.test.ts'];

export default mergeConfig(
	createVitestConfigWithDecorators({
		// `vitest doctor` measured threads 18% faster than forks for this suite.
		pool: 'threads',
		globalSetup: ['./test/globalSetup.ts'],
		setupFiles: ['./test/setup.ts'],
		exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
		projects: [
			{
				extends: true,
				test: { name: 'default', exclude: FORKED_TESTS },
			},
			{
				extends: true,
				test: { name: 'expression-engines', include: FORKED_TESTS, pool: 'forks' },
			},
		],
	}),
	{
		resolve: {
			alias: {
				'@credentials': resolve(__dirname, 'credentials'),
				'@test': resolve(__dirname, 'test'),
				'@utils': resolve(__dirname, 'utils'),
				'@nodes-testing': resolve(__dirname, '../core/nodes-testing'),
			},
		},
		oxc: {
			// OXC's TS transform ignores tsconfig's `emitDecoratorMetadata` — enable it
			// explicitly so decorator metadata (`design:type` via `Reflect.getMetadata`)
			// is emitted for the handful of DI-decorated modules under test.
			decorator: {
				legacy: true,
				emitDecoratorMetadata: true,
			},
		},
	},
);
