import type { Project } from '@n8n/db';
import { request } from '@playwright/test';
import { nanoid } from 'nanoid';

import { test as base, expect as baseExpect } from '../../../fixtures/base';
import type { AgentResponse } from '../../../services/agent-api-helper';
import type { ApiKey } from '../../../services/public-api-helper';

const N8N_AGENT_LLM_API_KEY = process.env.N8N_AGENT_LLM_API_KEY ?? '';

type AgentFixtures = {
	agentLlmApiKey: string;
	agent: AgentResponse;
	agentProject: Project;
	ownerApiKey: ApiKey;
	externalRequest: Awaited<ReturnType<typeof request.newContext>>;
};

/**
 * Container config that passes the LLM API key to the n8n server.
 * The agents controller reads N8N_AGENT_LLM_API_KEY at module load time.
 */
export const agentTestConfig = {
	capability: {
		env: {
			N8N_AGENT_LLM_API_KEY,
			...(process.env.N8N_AGENT_LLM_BASE_URL && {
				N8N_AGENT_LLM_BASE_URL: process.env.N8N_AGENT_LLM_BASE_URL,
			}),
			...(process.env.N8N_AGENT_LLM_MODEL && {
				N8N_AGENT_LLM_MODEL: process.env.N8N_AGENT_LLM_MODEL,
			}),
		},
	},
} as const;

export const test = base.extend<AgentFixtures>({
	agentLlmApiKey: async ({}, use) => {
		await use(N8N_AGENT_LLM_API_KEY);
	},

	agent: async ({ api }, use) => {
		const agent = await api.agents.createAgent({
			firstName: `TestAgent-${nanoid(8)}`,
			description: 'E2E test agent for A2A compliance testing',
			agentAccessLevel: 'open',
		});

		await use(agent);
	},

	agentProject: async ({ api }, use) => {
		await api.enableProjectFeatures();
		await api.setMaxTeamProjectsQuota(-1);
		const project = await api.projects.createProject('Agent Test Project');

		await use(project);
	},

	ownerApiKey: async ({ api }, use) => {
		const apiKey = await api.publicApi.createApiKey(`Agent E2E Key ${nanoid(8)}`);

		await use(apiKey);
	},

	externalRequest: async ({ backendUrl, ownerApiKey }, use) => {
		const context = await request.newContext({
			baseURL: backendUrl,
			extraHTTPHeaders: {
				'x-n8n-api-key': ownerApiKey.rawApiKey,
			},
		});

		await use(context);

		await context.dispose();
	},
});

export { baseExpect as expect, type AgentResponse };
