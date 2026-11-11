import { baseConfig } from '@n8n/oxlint-config/base';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [baseConfig],
	options: { typeAware: true },
	rules: {
		'import-x-alias/no-extraneous-dependencies': 'error',
		'n8n-local-rules/no-dynamic-regexp': 'error',
		complexity: ['error', 23],
		'id-denylist': 'off',
		'no-fallthrough': 'off',
		'no-useless-escape': 'off',
		'no-extra-boolean-cast': 'off',
		'no-case-declarations': 'off',
		'no-prototype-builtins': 'off',
		'typescript/no-base-to-string': 'off',
		'typescript/no-deprecated': 'off',
		'typescript/no-redundant-type-constituents': 'off',
		'typescript/prefer-optional-chain': 'off',
		'typescript/return-await': ['error', 'always'],
		'typescript/no-duplicate-type-constituents': 'off',
	},
	overrides: [
		{
			files: ['src/telemetry-helpers.ts'],
			rules: {
				'no-unsafe-optional-chaining': 'off',
			},
		},
		{
			files: ['**/*.test.ts'],
			rules: {
				'prefer-const': 'off',
				'typescript/no-unused-expressions': 'off',
				'typescript/no-explicit-any': 'off',
				'typescript/no-unsafe-member-access': 'off',
				'typescript/no-unsafe-assignment': 'off',
				'typescript/no-unsafe-return': 'off',
				'typescript/ban-ts-comment': 'off',
				'n8n-local-rules/no-dynamic-regexp': 'off',
			},
		},
	],
});
