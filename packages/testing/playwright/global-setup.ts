import { expect, request } from '@playwright/test';

import { ApiHelpers } from './services/api-helper';

async function globalSetup() {
	console.log('🚀 Starting global setup...');

	// Check if N8N_BASE_URL is set
	const n8nBaseUrl = process.env.N8N_BASE_URL;
	if (!n8nBaseUrl) {
		console.log('⚠️  N8N_BASE_URL environment variable is not set, skipping database reset');
		return;
	}

	const resetE2eDb = process.env.RESET_E2E_DB;
	if (resetE2eDb !== 'true') {
		console.log('⚠️  RESET_E2E_DB is not set to "true", skipping database reset');
		return;
	}

	console.log(`🔄 Resetting database for ${n8nBaseUrl}...`);
	// Create standalone API request context
	const requestContext = await request.newContext({
		baseURL: n8nBaseUrl,
	});

	try {
		await expect
			.poll(
				async () => {
					const response = await requestContext.get('/rest/e2e/env-feature-flags');
					return response.status();
				},
				{ message: 'Waiting for n8n E2E routes to be ready', timeout: 20_000 },
			)
			.toBe(200);
		const api = new ApiHelpers(requestContext);
		await api.resetDatabase();
		console.log('✅ Database reset completed successfully');
	} catch (error) {
		console.error('❌ Failed to reset database:', error);
		throw error; // This will fail the entire test suite if database reset fails
	} finally {
		await requestContext.dispose();
	}

	console.log('🏁 Global setup completed');
}

// eslint-disable-next-line import-x/no-default-export
export default globalSetup;
