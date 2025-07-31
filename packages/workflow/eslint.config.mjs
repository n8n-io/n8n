import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import unicornPlugin from 'eslint-plugin-unicorn';
import importPlugin from 'eslint-plugin-import-x';

export default tseslint.config(
	globalIgnores([
		'node_modules/**',
		'dist/**',
		'eslint.config.mjs',
	]),
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	importPlugin.flatConfigs.recommended,
	importPlugin.flatConfigs.typescript,
	{
		plugins: {
			unicorn: unicornPlugin,
		},
		languageOptions: {
			ecmaVersion: 2024,
			globals: globals.node,
			parserOptions: {
				projectService: true,
			},
		},
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
			complexity: ['error', 23],

			// Allow unused variables that start with underscore or common patterns
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^(_.*|e|error)$',
					varsIgnorePattern: '^(_.*|e|error)$',
					caughtErrorsIgnorePattern: '^(_.*|e|error)$',
					destructuredArrayIgnorePattern: '^_',
				},
			],

			// Allow namespaces (legacy code)
			'@typescript-eslint/no-namespace': 'off',

			// TODO: remove these
			'no-empty': 'warn',
			'id-denylist': 'warn',
			'no-fallthrough': 'warn',
			'no-useless-escape': 'warn',
			'import-x/order': 'warn',
			'no-extra-boolean-cast': 'warn',
			'no-case-declarations': 'warn',
			'no-prototype-builtins': 'warn',
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/no-base-to-string': 'warn',
			'@typescript-eslint/no-redundant-type-constituents': 'warn',
			'@typescript-eslint/prefer-nullish-coalescing': 'warn',
			'@typescript-eslint/prefer-optional-chain': 'warn',
			'@typescript-eslint/return-await': ['error', 'always'],
			'@typescript-eslint/no-empty-object-type': 'warn',
			'@typescript-eslint/no-unsafe-function-type': 'warn',
			'@typescript-eslint/no-duplicate-type-constituents': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
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
			'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
		},
	},
);
