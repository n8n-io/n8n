import { defineConfig, globalIgnores } from 'eslint/config';
import pluginPlaywright from 'eslint-plugin-playwright';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(
	globalIgnores(['scripts/**/*.js']),
	nodeConfig,
	pluginPlaywright.configs['flat/recommended'],
	{
		rules: {
			// TODO: remove these rules
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/promise-function-async': 'off',
			'n8n-local-rules/no-uncaught-json-parse': 'off',
			'playwright/expect-expect': 'warn',
			'playwright/max-nested-describe': 'warn',
			'playwright/no-conditional-in-test': 'warn',
			'playwright/no-skipped-test': 'warn',
			'import-x/no-extraneous-dependencies': [
				'error',
				{
					devDependencies: ['**/tests/**', '**/e2e/**', '**/playwright/**'],
					optionalDependencies: false,
				},
			],
		},
	},
);
