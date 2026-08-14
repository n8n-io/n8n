import type { Project } from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';

import { INSTANCE_OWNER_CREDENTIALS } from '../../../config/test-users';
import { test as base, expect as baseExpect } from '../../../fixtures/base';
import type { CredentialResponse } from '../../../services/credential-api-helper';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'mock-anthropic-api-key';
const JINA_API_KEY = process.env.JINA_API_KEY ?? 'mock-jina-api-key';

type ChatHubFixtures = {
	project: Project;
	anthropicCredential: CredentialResponse;
	anthropicApiKey: string;
	jinaCredential: CredentialResponse;
	jinaApiKey: string;
	chatHubProxySetup: undefined;
	chatHubEnabled: undefined;
	agentWorkflow: IWorkflowBase;
};

export const chatHubTestConfig = {
	timezoneId: 'America/New_York',
	capability: {
		services: ['proxy'],
		env: {
			N8N_COMMUNITY_PACKAGES_ENABLED: 'false',
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
		async ({ services }, use) => {
			// Setup
			await services.proxy.clearAllExpectations();
			await services.proxy.loadExpectations('chat-hub', { strictBodyMatching: true });

			// In replay (CI), make unmatched LLM calls fail loud with a clear
			// message instead of silently forwarding to the real Anthropic API
			// (which surfaces as a cryptic "invalid x-api-key"). Skip when
			// recording (!CI), which needs fall-through to capture live responses.
			if (process.env.CI) {
				await services.proxy.failOnUnmatched(['/v1/messages']);
			}

			await use(undefined);

			// Teardown
			if (!process.env.CI) {
				await services.proxy.recordExpectations('chat-hub', {
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

	chatHubEnabled: [
		async ({ n8n }, use) => {
			// Toggling chat hub requires the chatHub:manage scope, which only owners
			// and admins have. The test user may be a member/chat user, so drive this
			// through a dedicated owner context instead of n8n.api.
			const ownerApi = await n8n.api.createApiForUser(INSTANCE_OWNER_CREDENTIALS);
			const setEnabled = async (enabled: boolean) => {
				const response = await ownerApi.request.put('/rest/chat/enabled', { data: { enabled } });
				if (!response.ok()) {
					throw new Error(
						`Failed to set Chat Hub enabled=${enabled}: ${response.status()} ${await response.text()}`,
					);
				}
			};

			// Chat Hub is disabled by default; turn it on for these tests.
			await setEnabled(true);

			await use(undefined);

			// Restore the default (disabled) state so a shared instance isn't left enabled.
			await setEnabled(false);
			await ownerApi.request.dispose();
		},
		{ auto: true },
	],

	project: async ({ n8n }, use) => {
		const project = await n8n.api.projects.createProject('ChatHub test project');

		await use(project);

		await n8n.api.projects.deleteProject(project.id);
	},

	agentWorkflow: async ({ n8n, anthropicCredential, project: _ }, use) => {
		const res = await n8n.api.workflows.importWorkflowFromFile('chat-hub-workflow-agent.json', {
			transform: (workflow) => {
				const anthropicNode = workflow.nodes?.find((n) => n.type.includes('lmChatAnthropic'));

				anthropicNode!.credentials!.anthropicApi = anthropicCredential;

				return workflow;
			},
		});

		await use(res.createdWorkflow);

		await n8n.api.workflows.archive(res.workflowId);
		await n8n.api.workflows.delete(res.workflowId);
	},

	anthropicCredential: async ({ n8n, anthropicApiKey, project: _ }, use) => {
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

	jinaCredential: async ({ n8n, jinaApiKey }, use) => {
		const res = await n8n.api.credentials.createCredential({
			name: `Jina AI cred ${crypto.randomUUID().slice(0, 8)}`,
			type: 'jinaAiApi',
			data: {
				apiKey: jinaApiKey,
			},
		});

		await use(res);

		await n8n.api.credentials.deleteCredential(res.id);
	},
});

export const expect = baseExpect;
