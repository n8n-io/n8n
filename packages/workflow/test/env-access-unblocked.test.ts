/**
 * Regression test for GHC-8094
 * Bug: $env still errors out despite N8N_BLOCK_ENV_ACCESS_IN_NODE being set to false
 * https://github.com/n8n-io/n8n/issues/29603
 */

import { createEnvProvider, createEnvProviderState } from '../src/workflow-data-proxy-env-provider';

describe('GHC-8094: $env access when unblocked', () => {
	const originalEnv = process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE;

	afterEach(() => {
		// Restore original value
		if (originalEnv === undefined) {
			delete process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE;
		} else {
			process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = originalEnv;
		}
	});

	it('should allow $env access when N8N_BLOCK_ENV_ACCESS_IN_NODE is set to false', () => {
		// Setup: Set env var to false (unblocked)
		process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = 'false';
		process.env.TEST_VAR = 'test_value';

		// Create env provider with current state
		const envProvider = createEnvProvider(0, 0, createEnvProviderState());

		// Should NOT throw an error
		expect(() => envProvider.TEST_VAR).not.toThrow();
		expect(envProvider.TEST_VAR).toBe('test_value');
	});

	it('should show correct error message format when env is blocked', () => {
		// Setup: Block env access (default behavior)
		process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = 'true';

		const envProvider = createEnvProvider(1, 2, createEnvProviderState());

		// Should throw with specific error message
		expect(() => envProvider.SOME_VAR).toThrow('access to env vars denied');
	});

	it('should not cache env provider state across multiple calls', () => {
		// First: Block env access
		process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = 'true';
		const blockedProvider = createEnvProvider(0, 0, createEnvProviderState());

		expect(() => blockedProvider.TEST_VAR).toThrow('access to env vars denied');

		// Then: Unblock env access (simulating restart with new config)
		process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = 'false';
		process.env.TEST_VAR = 'new_value';
		const unblockedProvider = createEnvProvider(0, 0, createEnvProviderState());

		// The new provider should NOT use cached state
		// GHC-8094: This test would fail if state is cached at module level
		expect(() => unblockedProvider.TEST_VAR).not.toThrow();
		expect(unblockedProvider.TEST_VAR).toBe('new_value');
	});
});
