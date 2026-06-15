import { resolve } from 'path';
import { mergeConfig } from 'vitest/config';
import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';

export default mergeConfig(
	createVitestConfigWithDecorators({
		include: ['**/*.integration.test.ts'],
		testTimeout: 120_000,
		hookTimeout: 120_000,
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
		test: {
			fileParallelism: false,
			sequence: { concurrent: false },
			pool: 'forks',
			poolOptions: { forks: { singleFork: true } },
		},
	},
);
