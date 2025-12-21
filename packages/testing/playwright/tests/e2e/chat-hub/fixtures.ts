import { test as base, expect as baseExpect } from '../../../fixtures/base';
import type { CredentialResponse } from '../../../services/credential-api-helper';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'mock-anthropic-api-key';
const JINA_API_KEY = process.env.JINA_API_KEY ?? 'mock-jina-api-key';

type ChatHubFixtures = {
	anthropicCredential: CredentialResponse;
	anthropicApiKey: string;
	jinaCredential: CredentialResponse;
	jinaApiKey: string;
	chatHubProxySetup: undefined;
};

export const chatHubTestConfig = {
	timezoneId: 'America/New_York',
	addContainerCapability: {
		proxyServerEnabled: true,
		env: {
			N8N_COMMUNITY_PACKAGES_ENABLED: 'false', // To not generate API requests to staging server
		},
	},
} as const;

export const test = base.extend<ChatHubFixtures>({
	anthropicApiKey: async ({}, use) => {
		await use(ANTHROPIC_API_KEY);
	},

	jinaApiKey: async ({}, use) => {
		await use(JINA_API_KEY);
	},

	chatHubProxySetup: [
		async ({ proxyServer }, use) => {
			// Setup
			await proxyServer.clearAllExpectations();
			await proxyServer.loadExpectations('chat-hub', { strictBodyMatching: true });

			await use(undefined);

			// Teardown
			if (!process.env.CI) {
				await proxyServer.recordExpectations('chat-hub', {
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
			name: `Anthropic cred ${crypto.randomUUID().slice(0, 8)}`,
			type: 'anthropicApi',
			data: {
				apiKey: anthropicApiKey,
			},
		});

		await use(res);
	},

	jinaCredential: async ({ n8n, jinaApiKey }, use) => {
		const res = await n8n.api.credentials.createCredential({
			name: `Jina AI cred ${crypto.randomUUID().slice(0, 8)}`,
			type: 'jinaAiApi',
			data: {
				apiKey: jinaApiKey,
			},
		});

		await use(res);
	},
});

export const expect = baseExpect;
