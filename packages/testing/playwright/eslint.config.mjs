import { baseConfig } from '@n8n/eslint-config/base';
import playwrightPlugin from 'eslint-plugin-playwright';

export default [
	...baseConfig,
	playwrightPlugin.configs['flat/recommended'],
	{
		ignores: ['playwright-report/**/*'],
	},
	{
		rules: {
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/no-use-before-define': 'off',
			'@typescript-eslint/promise-function-async': 'off',
			'n8n-local-rules/no-uncaught-json-parse': 'off',
			'playwright/expect-expect': 'warn',
			'playwright/max-nested-describe': 'warn',
			'playwright/no-conditional-in-test': 'error',
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
];
