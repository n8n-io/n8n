import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(baseConfig, {
	rules: {
		// Test infrastructure — plain errors are fine here
		'n8n-local-rules/no-plain-errors': 'off',
		'@typescript-eslint/naming-convention': [
			'error',
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
	},
});
