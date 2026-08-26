import { request } from '@playwright/test';

import { INSTANCE_OWNER_CREDENTIALS } from './config/test-users';
import { ApiHelpers } from './services/api-helper';
import { getBackendUrl } from './utils/url-helper';

async function globalSetup() {
	console.log('🚀 Starting global setup...');

	// Check if backend URL is set (N8N_BACKEND_URL or N8N_BASE_URL)
	const n8nBaseUrl = getBackendUrl();
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
	// n8n serves /healthz before REST controllers mount, and a cold isolated boot
	// (fresh DB, all migrations) keeps that gap open for minutes — a fixed sleep
	// races it. Retry until the e2e controller answers.
	await new Promise((resolve) => setTimeout(resolve, 3000));
	// Create standalone API request context
	const requestContext = await request.newContext({
		baseURL: n8nBaseUrl,
	});

	try {
		const api = new ApiHelpers(requestContext);
		const deadline = Date.now() + 180_000;
		for (;;) {
			try {
				await api.resetDatabase();
				break;
			} catch (error) {
				if (Date.now() > deadline) throw error;
				await new Promise((resolve) => setTimeout(resolve, 3000));
			}
		}
		// The e2e controller AND /rest/settings mount in an early boot wave;
		// /rest/login mounts later, so gating on any early-wave route still races
		// the first test's signin. Gate on the thing tests actually need: a real
		// owner login with the same credentials the fixtures use.
		const loginDeadline = Date.now() + 180_000;
		for (;;) {
			const response = await requestContext.post('/rest/login', {
				data: {
					emailOrLdapLoginId: INSTANCE_OWNER_CREDENTIALS.email,
					password: INSTANCE_OWNER_CREDENTIALS.password,
				},
			});
			if (response.ok()) break;
			if (Date.now() > loginDeadline) {
				throw new Error(`n8n core REST not ready: /rest/login -> ${response.status()}`);
			}
			await new Promise((resolve) => setTimeout(resolve, 3000));
		}
		console.log('✅ Database reset completed successfully');
	} catch (error) {
		console.error('❌ Failed to reset database', error);
		throw error; // This will fail the entire test suite if database reset fails
	} finally {
		await requestContext.dispose();
	}

	console.log('🏁 Global setup completed');
}

// eslint-disable-next-line import-x/no-default-export
export default globalSetup;
