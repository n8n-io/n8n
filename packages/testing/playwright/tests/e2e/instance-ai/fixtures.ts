import { test as base, expect as baseExpect } from '../../../fixtures/base';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'mock-anthropic-api-key';

type InstanceAiSmokeFixtures = {
	instanceAiProxySetup: undefined;
};

export const instanceAiTestConfig = {
	timezoneId: 'America/New_York',
	capability: {
		services: ['proxy'],
		env: {
			// Enable Instance AI with Anthropic model (proxy intercepts real API calls)
			N8N_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-5',
			N8N_INSTANCE_AI_MODEL_API_KEY: ANTHROPIC_API_KEY,
			N8N_COMMUNITY_PACKAGES_ENABLED: 'false',
		},
	},
} as const;

export const test = base.extend<InstanceAiSmokeFixtures>({
	instanceAiProxySetup: [
		async ({ services }, use) => {
			await services.proxy.clearAllExpectations();
			await services.proxy.loadExpectations('instance-ai');

			await use(undefined);

			// Record new expectations when running locally (not in CI)
			if (!process.env.CI) {
				await services.proxy.recordExpectations('instance-ai', {
					dedupe: true,
					transform: (expectation) => {
						const response = expectation.httpResponse as {
							headers?: Record<string, string[]>;
						};

						if (response?.headers) {
							// Strip sensitive headers from recordings
							delete response.headers['anthropic-organization-id'];
						}

						return expectation;
					},
				});
			}
		},
		{ auto: true },
	],
});

export const expect = baseExpect;
