import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(baseConfig, {
	ignores: ['coverage/**'],
}, {
	rules: {
		// Test infrastructure — no dependency on n8n-workflow where error classes live
		'n8n-local-rules/no-plain-errors': 'off',
		'@typescript-eslint/naming-convention': [
			'error',
			// Allow kebab-case for rule IDs in config objects
			{
				selector: 'objectLiteralProperty',
				format: null,
				filter: {
					regex: '^[a-z]+-[a-z-]+$', // kebab-case pattern
					match: true,
				},
			},
		],
	},
});
