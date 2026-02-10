import type { APIResponse } from '@playwright/test';
import { nanoid } from 'nanoid';

import { test, expect, agentTestConfig } from './fixtures';

test.use(agentTestConfig);

/** Unwrap n8n's `{ data: T }` response envelope */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- generic provides call-site type narrowing
async function unwrap<T>(response: APIResponse): Promise<T> {
	const json = await response.json();
	return (json.data ?? json) as T;
}

test.describe('Agent CRUD', () => {
	test('should create an agent with description and access level', async ({ api }) => {
		const name = `CRUDAgent-${nanoid(8)}`;

		const agent = await api.agents.createAgent({
			firstName: name,
			description: 'Handles data processing tasks',
			agentAccessLevel: 'internal',
		});

		expect(agent.id).toBeTruthy();
		expect(agent.firstName).toBe(name);
		expect(agent.description).toBe('Handles data processing tasks');
		expect(agent.agentAccessLevel).toBe('internal');
		expect(agent.email).toContain('@internal.n8n.local');
	});

	test('should update an agent', async ({ agent, api }) => {
		const updated = await api.agents.updateAgent(agent.id, {
			firstName: `Updated-${nanoid(8)}`,
			description: 'Updated description',
			agentAccessLevel: 'closed',
		});

		expect(updated.description).toBe('Updated description');
		expect(updated.agentAccessLevel).toBe('closed');
	});

	test('should return 404 when updating non-existent agent', async ({ api }) => {
		const response = await api.agents.updateAgentRaw('non-existent-id', { firstName: 'Ghost' });

		expect(response.status()).toBe(404);
	});

	test('should get agent capabilities', async ({ agent, api }) => {
		const capabilities = await api.agents.getCapabilities(agent.id);

		expect(capabilities.agentId).toBe(agent.id);
		expect(capabilities.agentName).toContain(agent.firstName);
		expect(capabilities.description).toBe(agent.description);
		expect(capabilities.agentAccessLevel).toBe(agent.agentAccessLevel);
		expect(capabilities).toHaveProperty('workflows');
		expect(capabilities).toHaveProperty('credentials');
		expect(capabilities).toHaveProperty('projects');
	});
});

test.describe('Agent Card (A2A compliance)', () => {
	test('should return A2A-compliant agent card', async ({ agent, api }) => {
		const card = await api.agents.getCard(agent.id);

		// A2A required fields
		expect(card.id).toBe(agent.id);
		expect(card.name).toBe(agent.firstName);
		expect(card.provider).toEqual({
			name: 'n8n',
			description: agent.description,
		});

		// Capabilities declaration
		expect(card.capabilities).toEqual({
			streaming: false,
			pushNotifications: false,
			multiTurn: true,
		});

		// Interfaces — must point to the task endpoint
		expect(card.interfaces).toHaveLength(1);
		expect(card.interfaces[0].type).toBe('http+json');
		expect(card.interfaces[0].url).toContain(`/rest/agents/${agent.id}/task`);

		// Security schemes
		expect(card.securitySchemes.apiKey).toEqual({
			type: 'apiKey',
			name: 'x-n8n-api-key',
			in: 'header',
		});
		expect(card.security).toEqual([{ apiKey: [] }]);
	});

	test('should return 404 for non-existent agent card', async ({ api }) => {
		const response = await api.agents.getCardRaw('non-existent-id');

		expect(response.status()).toBe(404);
	});

	test('should return 404 for closed agent card', async ({ api }) => {
		const closedAgent = await api.agents.createAgent({
			firstName: `ClosedAgent-${nanoid(8)}`,
			agentAccessLevel: 'closed',
		});

		const response = await api.agents.getCardRaw(closedAgent.id);

		expect(response.status()).toBe(404);
	});

	test('should access agent card via API key auth', async ({ agent, externalRequest }) => {
		// externalRequest uses x-n8n-api-key header (no cookie auth)
		const response = await externalRequest.get(`/rest/agents/${agent.id}/card`);

		expect(response.ok()).toBe(true);

		const card = await unwrap<{ id: string }>(response);
		expect(card.id).toBe(agent.id);
	});
});

test.describe('Agent Task Execution', () => {
	test('should execute a task via API key and get structured response', async ({
		agent,
		agentProject,
		agentLlmApiKey,
		api,
		externalRequest,
	}) => {
		test.skip(!agentLlmApiKey, 'N8N_AGENT_LLM_API_KEY not set — skipping LLM tests');
		test.setTimeout(180_000); // LLM + workflow execution can be slow

		// Add agent to project so it can see the workflow
		await api.projects.addUserToProject(agentProject.id, agent.id, 'project:editor');

		// Create a simple Manual Trigger → Set workflow in the project
		const workflowName = `Agent E2E Workflow ${nanoid(8)}`;
		const workflow = await api.workflows.createWorkflow({
			name: workflowName,
			nodes: [
				{
					id: nanoid(),
					name: 'When clicking "Test workflow"',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [250, 300],
					parameters: {},
				},
				{
					id: nanoid(),
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [450, 300],
					parameters: {
						assignments: {
							assignments: [
								{
									id: nanoid(),
									name: 'result',
									value: 'Hello from agent workflow',
									type: 'string',
								},
							],
						},
					},
				},
			],
			connections: {
				'When clicking "Test workflow"': {
					main: [
						[
							{
								node: 'Set',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		});

		// Transfer workflow to the project
		await api.workflows.transfer(workflow.id, agentProject.id);

		// Dispatch task via API key auth (externalRequest has x-n8n-api-key header)
		const response = await externalRequest.post(`/rest/agents/${agent.id}/task`, {
			data: {
				prompt: `Execute the workflow named "${workflowName}" and report the result.`,
			},
		});

		expect(response.ok()).toBe(true);

		const task = await unwrap<{
			status: string;
			summary: string;
			steps: Array<{ action: string; workflowName?: string; result?: string }>;
		}>(response);

		expect(task.status).toBe('completed');
		expect(task).toHaveProperty('steps');
		expect(task).toHaveProperty('summary');
		expect(task.steps.length).toBeGreaterThan(0);

		// The agent should have executed the workflow
		const executionStep = task.steps.find((s) => s.action === 'execute_workflow');
		expect(executionStep).toBeTruthy();
		expect(executionStep!.workflowName).toBe(workflowName);
	});

	test('should return error when LLM key is not configured', async ({
		agent,
		agentLlmApiKey,
		externalRequest,
	}) => {
		test.skip(!!agentLlmApiKey, 'N8N_AGENT_LLM_API_KEY is set — this test only runs without it');

		const response = await externalRequest.post(`/rest/agents/${agent.id}/task`, {
			data: { prompt: 'Hello' },
		});

		expect(response.ok()).toBe(true);

		const task = await unwrap<{ status: string; message: string }>(response);

		expect(task.status).toBe('error');
		expect(task.message).toContain('N8N_AGENT_LLM_API_KEY');
	});
});
