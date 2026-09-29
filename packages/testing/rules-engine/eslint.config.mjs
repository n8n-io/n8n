import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	backendConfig,
	{
		ignores: ['coverage/**', 'dist/**'],
	},
	{
		rules: {
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'objectLiteralProperty',
					format: null,
					filter: {
						regex: '^[a-z]+-[a-z-]+$',
						match: true,
					},
				},
			],
		},
	},
);
