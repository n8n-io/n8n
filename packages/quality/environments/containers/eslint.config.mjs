import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(backendConfig, {
	files: ['services/keycloak.ts'],
	// Test infrastructure that talks to a container it started itself,
	// so the guarded client buys nothing here.
	rules: {
		'n8n-local-rules/no-uncentralized-http': 'off',
	},
});
