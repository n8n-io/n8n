import { configDefaults, defineConfig } from 'vitest/config';
import path from 'path';

// Define aliases for internal package resolution
const alias = {
	'@credentials': path.resolve(__dirname, 'credentials'),
	'@test': path.resolve(__dirname, 'test'),
	'@utils': path.resolve(__dirname, 'utils'),
	'@nodes-testing': path.resolve(__dirname, '../core/nodes-testing'),
	'@': path.resolve(__dirname, '../core/src'),
	// Internal packages
	'@n8n/backend-common': path.resolve(__dirname, '../../packages/@n8n/backend-common/src/index.ts'),
	'@n8n/client-oauth2': path.resolve(__dirname, '../../packages/@n8n/client-oauth2/src/index.ts'),
	'@n8n/decorators': path.resolve(__dirname, '../../packages/@n8n/decorators/src/index.ts'),
	'@n8n/di': path.resolve(__dirname, '../../packages/@n8n/di/src/di.ts'),
	'@n8n/config': path.resolve(__dirname, '../../packages/@n8n/config/src/index.ts'),
	'@n8n/constants': path.resolve(__dirname, '../../packages/@n8n/constants/src/index.ts'),
	'@n8n/errors': path.resolve(__dirname, '../../packages/@n8n/errors/src/index.ts'),
	'@n8n/permissions': path.resolve(__dirname, '../../packages/@n8n/permissions/src/index.ts'),
	'n8n-workflow': path.resolve(__dirname, '../../packages/workflow/src/index.ts'),
};

console.log('DEBUG: n8n-workflow alias:', alias['n8n-workflow']);

export default defineConfig({
	resolve: {
		alias,
	},
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./test/setup.ts'],
		globalSetup: ['./test/globalSetup.ts'],
		env: {
			TZ: 'UTC',
		},
		server: {
			deps: {
				inline: [/@n8n\/.*/, 'n8n-workflow'],
			},
		},
		include: ['**/*.test.ts'],
		exclude: [...configDefaults.exclude, 'packages/template/*'],
	},
});
