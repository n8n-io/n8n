import { nodesConfig } from '@n8n/oxlint-config/nodes';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [nodesConfig],
	options: { typeAware: true },
	jsPlugins: [
		{
			name: '@n8n/community-nodes',
			specifier: '@n8n/eslint-plugin-community-nodes',
		},
	],
	ignorePatterns: [
		'scenarios/**',
		'scripts/**',
		'nodes/Databricks/eslint-user-agent-restriction.mjs',
		'nodes/Kafka/eslint-import-restrictions.mjs',
	],
	rules: {
		'@n8n/community-nodes/credential-documentation-url': ['error', { allowSlugs: true }],
		'@n8n/community-nodes/no-builder-hint-leakage': 'error',
		'n8n-local-rules/require-escaped-query-values': 'error',
	},
	overrides: [
		{
			files: ['nodes/**/*.ts', 'credentials/**/*.ts', 'utils/**/*.ts', 'test/**/*.ts'],
			rules: {
				'import-x-alias/no-extraneous-dependencies': 'warn',
				'n8n-local-rules/no-dynamic-regexp': 'off',
				'no-constant-condition': 'warn',
				'no-control-regex': 'warn',
				'no-dupe-else-if': 'warn',
				'no-ex-assign': 'warn',
				'no-fallthrough': 'warn',
				'typescript/ban-ts-comment': 'off',
				'typescript/no-deprecated': 'warn',
				'typescript/prefer-promise-reject-errors': 'warn',
				// The residual ESLint pass enforces these rules on the same paths.
				'import/no-duplicates': 'off',
				'no-self-assign': 'off',
				'no-unsafe-optional-chaining': 'off',
			},
		},
		{
			files: ['nodes/**/*.ts'],
			excludeFiles: [
				'**/*.test.ts',
				'**/test/**',
				'**/tests/**',
				'**/__test__/**',
				'**/__tests__/**',
			],
			rules: { 'n8n-local-rules/no-dynamic-regexp': 'error' },
		},
		{
			files: ['nodes/**/*.ts'],
			rules: { 'n8n-nodes-base/node-filename-against-convention': 'off' },
		},
		{
			files: ['**/*.test.ts', '**/test/**/*.ts'],
			rules: { 'n8n-local-rules/require-escaped-query-values': 'off' },
		},
	],
});
