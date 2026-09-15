import { backendConfig } from '@n8n/eslint-config/backend';
import playwrightPlugin from 'eslint-plugin-playwright';

export default [
	...backendConfig,
	playwrightPlugin.configs['flat/recommended'],
	{
		ignores: [
			'playwright-report/**/*',
			'ms-playwright-cache/**/*',
			// Downloaded browser bundles. Gitignored, but flat config does not read
			// .gitignore, and Chromium ships loose .js files under resources/.
			'.playwright-browsers/**/*',
			'coverage/**/*',
			'scripts/**/*',
			'janitor.config.mjs',
		],
	},
	{
		rules: {
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/no-use-before-define': 'off',
			'@typescript-eslint/promise-function-async': 'off',
			'playwright/expect-expect': 'warn',
			'playwright/max-nested-describe': 'warn',
			'playwright/no-conditional-in-test': 'error',
			'playwright/no-skipped-test': 'warn',
			// Allow any naming convention for TestRequirements object properties
			// This is specifically for workflow filenames and intercept keys that may not follow camelCase
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'default',
					format: ['camelCase'],
					leadingUnderscore: 'allow',
					trailingUnderscore: 'allow',
				},
				{
					selector: 'variable',
					format: ['camelCase', 'UPPER_CASE'],
				},
				{
					selector: 'typeLike',
					format: ['PascalCase'],
				},
				{
					selector: 'property',
					format: ['camelCase', 'snake_case', 'UPPER_CASE'],
					filter: {
						// Allow any format for properties in TestRequirements objects (workflow files, intercept keys, etc.)
						regex: '^(workflow|intercepts|storage|config)$',
						match: false,
					},
				},
				{
					selector: 'objectLiteralProperty',
					format: null, // Allow any format for object literal properties in TestRequirements
					filter: {
						// This allows workflow filenames and intercept keys to use any naming convention
						regex: '\\.(json|spec\\.ts)$|[a-zA-Z0-9_-]+',
						match: true,
					},
				},
			],
			'import-x/no-extraneous-dependencies': [
				'error',
				{
					devDependencies: ['**/tests/**', '**/e2e/**', '**/playwright/**'],
					optionalDependencies: false,
				},
			],
		},
	},
	{
		// Debt: the base layer enforces kebab-case filenames and this package has
		// 124 files that predate it. Rename them, then delete this block.
		rules: {
			'unicorn/filename-case': 'off',
		},
	},
];
