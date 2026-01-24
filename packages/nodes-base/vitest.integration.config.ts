import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest config for integration tests in nodes-base.
 *
 * These tests use testcontainers to spin up real services (Kafka, etc.)
 * and test node functionality against them.
 *
 * Container lifecycle is managed via test.extend fixtures for clean
 * setup/teardown per test file.
 *
 * Run with: pnpm test:integration:kafka
 */
export default defineConfig({
	resolve: {
		alias: {
			'@nodes-testing/': resolve(__dirname, '../testing/unit/') + '/',
			'@test/': resolve(__dirname, 'test/') + '/',
		},
	},
	test: {
		globals: true,
		environment: 'node',
		include: ['**/*.integration.test.ts'],
		testTimeout: 120_000, // Container startup can take time
		hookTimeout: 120_000,
		// Run sequentially to avoid container conflicts
		fileParallelism: false,
		sequence: {
			concurrent: false, // Run tests within a file sequentially
		},
		// Pool configuration for testcontainers
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
	},
});
