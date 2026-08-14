import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(
	baseConfig,
	{ ignores: ['dist/**', 'coverage/**'] },
	{
		// Test fixtures use file paths, spec names and line numbers as object keys
		// (the impact-map shape is `file → { line → specs }`) — these are data, not
		// identifiers, so the naming-convention rule doesn't apply.
		files: ['**/*.test.ts'],
		rules: { '@typescript-eslint/naming-convention': 'off' },
	},
);
