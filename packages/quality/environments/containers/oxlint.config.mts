import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	overrides: [
		{
			files: ['services/keycloak.ts'],
			jsPlugins: ['@n8n/eslint-config/plugin'],
			rules: { 'n8n-local-rules/no-uncentralized-http': 'off' },
		},
	],
});
