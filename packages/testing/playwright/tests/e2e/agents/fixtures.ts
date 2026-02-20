import type { Project } from '@n8n/db';
import { request } from '@playwright/test';
import { nanoid } from 'nanoid';

import { test as base, expect as baseExpect } from '../../../fixtures/base';
import type { AgentResponse } from '../../../services/agent-api-helper';
import type { CredentialResponse } from '../../../services/credential-api-helper';
import type { ApiKey } from '../../../services/public-api-helper';

/**
 * Resolve test credentials from TEST_CREDENTIAL_<KEY> env vars.
 * e.g. TEST_CREDENTIAL_CURRENTS=xxx → { currents: 'xxx' }
 *      TEST_CREDENTIAL_LINEAR=yyy   → { linear: 'yyy' }
 *      TEST_CREDENTIAL_ANTHROPIC=sk-ant-... → { anthropic: 'sk-ant-...' }
 */
function resolveTestCredentials(): Record<string, string> {
	const prefix = 'TEST_CREDENTIAL_';
	const credentials: Record<string, string> = {};

	for (const [key, value] of Object.entries(process.env)) {
		if (key.startsWith(prefix) && value) {
			credentials[key.slice(prefix.length).toLowerCase()] = value;
		}
	}

	return credentials;
}

type AgentFixtures = {
	testCredentials: Record<string, string>;
	agent: AgentResponse;
	agentProject: Project;
	ownerApiKey: ApiKey;
	externalRequest: Awaited<ReturnType<typeof request.newContext>>;
	anthropicCredential: CredentialResponse | null;
};

export const test = base.extend<AgentFixtures>({
	testCredentials: async ({}, use) => {
		await use(resolveTestCredentials());
	},

	agent: async ({ api }, use) => {
		const agent = await api.agents.createAgent({
			firstName: `TestAgent-${nanoid(8)}`,
			description: 'E2E test agent for A2A compliance testing',
			agentAccessLevel: 'external',
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

	/**
	 * Creates an Anthropic credential in the agentProject so the agent can use it for LLM calls.
	 * Requires TEST_CREDENTIAL_ANTHROPIC env var. Returns null if not available.
	 */
	anthropicCredential: async ({ api, agentProject, testCredentials }, use) => {
		const anthropicKey = testCredentials.anthropic;
		if (!anthropicKey) {
			await use(null);
			return;
		}

		const credential = await api.credentials.createCredential({
			name: `Anthropic LLM ${nanoid(8)}`,
			type: 'anthropicApi',
			data: { apiKey: anthropicKey },
			projectId: agentProject.id,
		});

		await use(credential);
	},
});

export { baseExpect as expect, type AgentResponse };
