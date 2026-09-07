import { test as base, expect as baseExpect } from '../../../../../fixtures/base';
import type { CredentialResponse } from '../../../../../services/credential-api-helper';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'mock-anthropic-api-key';

type ExecutionLogFixtures = {
	anthropicCredential: CredentialResponse;
	anthropicApiKey: string;
	proxySetup: undefined;
};

export const executionLogsTestConfig = {
	capability: {
		services: ['proxy'],
		env: {
			N8N_COMMUNITY_PACKAGES_ENABLED: 'false', // suppress extraneous HTTP requests
		},
	},
} as const;

export const test = base.extend<ExecutionLogFixtures>({
	anthropicApiKey: async ({}, use) => {
		await use(ANTHROPIC_API_KEY);
	},

	proxySetup: [
		async ({ services }, use) => {
			// Setup
			await services.proxy.clearAllExpectations();
			await services.proxy.loadExpectations('execution.logs', { strictBodyMatching: true });

			await use(undefined);

			// Teardown
			if (!process.env.CI) {
				await services.proxy.recordExpectations('execution.logs', {
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

		await n8n.api.credentials.deleteCredential(res.id);
	},
});

export const expect = baseExpect;
