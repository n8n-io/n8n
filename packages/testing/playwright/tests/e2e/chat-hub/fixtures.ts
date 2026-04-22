import type { Project } from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';

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
