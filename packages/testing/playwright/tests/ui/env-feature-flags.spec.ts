import { test, expect } from '../../fixtures/base';

test.describe
	.serial('Environment Feature Flags', () => {
		test('should set feature flags at runtime and load it back in envFeatureFlags from backend settings', async ({
			api,
		}) => {
			const setResponse = await api.setEnvFeatureFlags({
				N8N_ENV_FEAT_TEST: 'true',
			});

			expect(setResponse.data.success).toBe(true);
			expect(setResponse.data.message).toBe('Environment feature flags updated');

			expect(setResponse.data.flags).toBeInstanceOf(Object);
			expect(setResponse.data.flags['N8N_ENV_FEAT_TEST']).toBe('true');

			const currentFlags = await api.getEnvFeatureFlags();

			expect(currentFlags).toBeInstanceOf(Object);
			expect(currentFlags.data['N8N_ENV_FEAT_TEST']).toBe('true');
		});

		test('should reset feature flags at runtime', async ({ api }) => {
			const setResponse1 = await api.setEnvFeatureFlags({
				N8N_ENV_FEAT_TEST: 'true',
			});

			expect(setResponse1.data.success).toBe(true);
			expect(setResponse1.data.flags['N8N_ENV_FEAT_TEST']).toBe('true');

			const clearResponse = await api.clearEnvFeatureFlags();

			expect(clearResponse.data.success).toBe(true);

			expect(clearResponse.data.flags).toBeInstanceOf(Object);
			expect(clearResponse.data.flags['N8N_ENV_FEAT_TEST']).toBeUndefined();

			const currentFlags = await api.getEnvFeatureFlags();

			expect(currentFlags).toBeInstanceOf(Object);
			expect(currentFlags.data['N8N_ENV_FEAT_TEST']).toBeUndefined();
		});
	});
