import { test as base, expect as baseExpect } from '../../../../fixtures/base';
import {
	InstanceAiDriver,
	type InstanceAiDriverConfig,
} from '../../../../utils/benchmark/instance-ai-driver';
import type { CredentialResponse } from '../../../../services/credential-api-helper';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'mock-anthropic-api-key';

type InstanceAiMemoryFixtures = {
	anthropicApiKey: string;
	anthropicCredential: CredentialResponse;
	instanceAiDriver: InstanceAiDriver;
	instanceAiProxySetup: undefined;
};

export const instanceAiTestConfig = {
	capability: {
		services: ['proxy'] as const,
		env: {
			TEST_ISOLATION: 'bench-mem-instanceai',
		},
	},
} as const;

export const test = base.extend<InstanceAiMemoryFixtures>({
	anthropicApiKey: async ({}, use) => {
		await use(ANTHROPIC_API_KEY);
	},

	instanceAiProxySetup: [
		async ({ services }, use) => {
			await services.proxy.clearAllExpectations();
			await services.proxy.loadExpectations('instance-ai-memory');

			await use(undefined);

			// In local dev, record new expectations for future replays
			if (!process.env.CI) {
				await services.proxy.recordExpectations('instance-ai-memory', {
					dedupe: true,
					transform: (expectation) => {
						const response = expectation.httpResponse as {
							headers?: Record<string, string[]>;
						};
						if (response?.headers) {
							delete response.headers['anthropic-organization-id'];
						}
						return expectation;
					},
				});
			}
		},
		{ auto: true },
	],

	anthropicCredential: async ({ n8n, anthropicApiKey }, use) => {
		const res = await n8n.api.credentials.createCredential({
			name: `Anthropic bench ${crypto.randomUUID().slice(0, 8)}`,
			type: 'anthropicApi',
			data: { apiKey: anthropicApiKey },
		});

		await use(res);

		await n8n.api.credentials.deleteCredential(res.id);
	},

	instanceAiDriver: async ({ n8n, backendUrl, services, anthropicCredential: _ }, use) => {
		const config: InstanceAiDriverConfig = {
			n8n,
			baseUrl: backendUrl,
			metrics: services.observability.metrics,
		};

		const driver = new InstanceAiDriver(config);

		await use(driver);

		// Cleanup: delete any threads created during the test
		await driver.deleteAllThreads();
	},
});

export const expect = baseExpect;
