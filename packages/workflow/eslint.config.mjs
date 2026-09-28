import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(
	baseConfig,
	{
		rules: {
			'import-x/no-extraneous-dependencies': 'error',
			'n8n-local-rules/no-dynamic-regexp': 'error',
			complexity: ['error', 23],

			'id-denylist': 'warn',
			'no-fallthrough': 'warn',
			'no-useless-escape': 'warn',
			'no-extra-boolean-cast': 'warn',
			'no-case-declarations': 'warn',
			'no-prototype-builtins': 'warn',
			'@typescript-eslint/no-base-to-string': 'warn',
			'@typescript-eslint/no-redundant-type-constituents': 'warn',
			'@typescript-eslint/prefer-optional-chain': 'warn',
			'@typescript-eslint/return-await': ['error', 'always'],
			'@typescript-eslint/no-duplicate-type-constituents': 'warn',
		},
	},
	{
		files: ['**/*.test.ts'],
		rules: {
			// TODO: remove these
			'prefer-const': 'warn',
			'@typescript-eslint/no-unused-expressions': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/ban-ts-comment': 'off',
			'n8n-local-rules/no-dynamic-regexp': 'off',
		},
	},
);
