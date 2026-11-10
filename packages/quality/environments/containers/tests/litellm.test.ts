import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { describe, expect, test, vi } from 'vitest';

const startContainer = vi.hoisted(() => vi.fn());

vi.mock('testcontainers', () => {
	class GenericContainer {
		protected hostConfig: { PortBindings?: Record<string, unknown> } = {};
		constructor(readonly image: string) {}
		withNetwork() {
			return this;
		}
		withNetworkAliases() {
			return this;
		}
		withExposedPorts() {
			return this;
		}
		withCopyContentToContainer() {
			return this;
		}
		withEnvironment() {
			return this;
		}
		withCommand() {
			return this;
		}
		withWaitStrategy() {
			return this;
		}
		withStartupTimeout() {
			return this;
		}
		withLabels() {
			return this;
		}
		withName() {
			return this;
		}
		withReuse() {
			return this;
		}
		withLogConsumer() {
			return this;
		}
		async start() {
			return await startContainer(this.image);
		}
	}
	const waitStrategy = { forStatusCode: () => waitStrategy };
	return {
		GenericContainer,
		Wait: { forHttp: () => waitStrategy, forListeningPorts: () => waitStrategy },
	};
});

import { buildLiteLlmSetup, liteLlm } from '../services/litellm';
import type { StartContext } from '../services/types';

function fakeContainer(image: string) {
	return { image, getMappedPort: () => 4000 } as unknown as StartedTestContainer;
}

describe('liteLlm.start', () => {
	test('registers the gateway before the front door starts, so the stack can stop it', async () => {
		startContainer.mockImplementation(async (image: string) => {
			if (image.startsWith('caddy')) throw new Error('front door failed');
			return fakeContainer(image);
		});
		const registered: StartedTestContainer[] = [];
		const ctx = {
			external: false,
			registerContainer: (container: StartedTestContainer) => registered.push(container),
		} as unknown as StartContext;

		await expect(liteLlm.start({} as StartedNetwork, 'n8n-test', undefined, ctx)).rejects.toThrow(
			'front door failed',
		);

		expect(registered).toHaveLength(1);
		expect(registered[0]).toMatchObject({ image: expect.stringContaining('litellm') });
	});

	test('registers both containers when both start', async () => {
		startContainer.mockImplementation(async (image: string) => fakeContainer(image));
		const registered: StartedTestContainer[] = [];
		const ctx = {
			external: false,
			registerContainer: (container: StartedTestContainer) => registered.push(container),
		} as unknown as StartContext;

		const result = await liteLlm.start({} as StartedNetwork, 'n8n-test', undefined, ctx);

		expect(registered).toHaveLength(2);
		expect(result.containers).toEqual(registered);
	});
});

const AZURE_ENV = {
	LITELLM_AZURE_API_BASE: 'https://example-resource.openai.azure.com',
	LITELLM_AZURE_DEPLOYMENT: 'gpt-test',
	LITELLM_AZURE_TENANT_ID: 'tenant-id',
	LITELLM_AZURE_CLIENT_ID: 'client-id',
	LITELLM_AZURE_CLIENT_SECRET: 'client-secret-value',
};

describe('buildLiteLlmSetup', () => {
	test('serves only the mock model when no Azure variable is set', () => {
		const setup = buildLiteLlmSetup({});

		expect(setup.models).toEqual(['mock-model']);
		expect(setup.environment).toEqual({});
		expect(JSON.parse(setup.config).model_list).toHaveLength(1);
	});

	test('adds the Azure deployment and keeps the secret out of the config', () => {
		const setup = buildLiteLlmSetup(AZURE_ENV);
		const azure = JSON.parse(setup.config).model_list[0];

		expect(setup.models).toEqual(['gpt-test', 'mock-model']);
		expect(azure.litellm_params).toMatchObject({
			model: 'azure/gpt-test',
			api_base: 'https://example-resource.openai.azure.com',
			api_version: '2025-03-01-preview',
			tenant_id: 'tenant-id',
			client_id: 'client-id',
			client_secret: 'os.environ/AZURE_CLIENT_SECRET',
		});
		expect(setup.config).not.toContain('client-secret-value');
		expect(setup.environment).toEqual({ AZURE_CLIENT_SECRET: 'client-secret-value' });
	});

	test('uses the API version from the environment when set', () => {
		const setup = buildLiteLlmSetup({ ...AZURE_ENV, LITELLM_AZURE_API_VERSION: '2025-04-01' });

		expect(JSON.parse(setup.config).model_list[0].litellm_params.api_version).toBe('2025-04-01');
	});

	test('names the missing variables when only some are set', () => {
		const { LITELLM_AZURE_CLIENT_SECRET: _, ...partial } = AZURE_ENV;

		expect(() => buildLiteLlmSetup({ ...partial, LITELLM_AZURE_TENANT_ID: ' ' })).toThrow(
			'Missing: LITELLM_AZURE_TENANT_ID, LITELLM_AZURE_CLIENT_SECRET',
		);
	});
});
