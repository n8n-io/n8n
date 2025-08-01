import { test, expect } from '../../fixtures/base';

test.describe
	.serial('Environment Feature Flags', () => {
		test('should set feature flags at runtime and load it back in envFeatureFlags from backend settings', async ({
			api,
		}) => {
			// Set feature flags using the E2E API
			const setResponse = await api.setEnvFeatureFlags({
				N8N_ENV_FEAT_TEST: 'true',
			});

			// Verify the API response structure
			expect(setResponse.data.success).toBe(true);
			expect(setResponse.data.message).toBe('Environment feature flags updated');

			// Verify the flags are returned in the response
			expect(setResponse.data.flags).toBeInstanceOf(Object);
			expect(setResponse.data.flags['N8N_ENV_FEAT_TEST']).toBe('true');

			// Get the current environment feature flags immediately after setting
			const currentFlags = await api.getEnvFeatureFlags();

			// Verify the flags are available
			expect(currentFlags).toBeInstanceOf(Object);
			expect(currentFlags.data['N8N_ENV_FEAT_TEST']).toBe('true');
		});

		test('should reset feature flags at runtime', async ({ api }) => {
			// Set feature flags initially using the E2E API
			const setResponse1 = await api.setEnvFeatureFlags({
				N8N_ENV_FEAT_TEST: 'true',
			});

			// Verify the API response
			expect(setResponse1.data.success).toBe(true);
			expect(setResponse1.data.flags['N8N_ENV_FEAT_TEST']).toBe('true');

			// Clear feature flags using the E2E API
			const clearResponse = await api.clearEnvFeatureFlags();

			// Verify the API response
			expect(clearResponse.data.success).toBe(true);

			// Verify the flags are cleared
			expect(clearResponse.data.flags).toBeInstanceOf(Object);
			expect(clearResponse.data.flags['N8N_ENV_FEAT_TEST']).toBeUndefined();

			// Get the current environment feature flags to verify they're cleared
			const currentFlags = await api.getEnvFeatureFlags();

			// Verify the flags are cleared
			expect(currentFlags).toBeInstanceOf(Object);
			expect(currentFlags.data['N8N_ENV_FEAT_TEST']).toBeUndefined();
		});
	});
