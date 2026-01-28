import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(baseConfig, {
	ignores: ['coverage/**'],
}, {
	rules: {
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
