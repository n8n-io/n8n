import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';

export default tseslint.config(
	globalIgnores([
		'node_modules/**',
		'dist/**',
		'eslint.config.mjs', // Ignore this config file itself
	]),
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2024,
			globals: globals.node,
			parserOptions: {
				projectService: true,
			},
		},
		rules: {
			'@typescript-eslint/naming-convention': [
				'error',
				// Default naming convention rules
				{
					selector: 'default',
					format: ['camelCase'],
				},
				{
					selector: 'variable',
					format: ['camelCase', 'snake_case', 'UPPER_CASE', 'PascalCase'],
				},
				{
					selector: 'property',
					format: ['camelCase', 'snake_case', 'UPPER_CASE'],
				},
				{
					selector: 'typeLike',
					format: ['PascalCase'],
				},
				// Allow underscore for unused parameters
				{
					selector: 'parameter',
					format: ['camelCase'],
					leadingUnderscore: 'allow',
					filter: {
						regex: '^_+$',
						match: true,
					},
				},
				// Add exception for Docker Compose labels
				{
					selector: 'objectLiteralProperty',
					format: null, // Allow any format
					filter: {
						regex: '^com\\.docker\\.',
						match: true,
					},
				},
			],
			// Allow unused variables that start with underscore
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
		},
	},
);
