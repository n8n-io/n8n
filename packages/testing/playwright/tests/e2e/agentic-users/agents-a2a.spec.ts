import type { APIResponse, Page } from '@playwright/test';
import { nanoid } from 'nanoid';

import { test, expect } from './fixtures';

/**
 * Server-internal URL for external agent delegation.
 * callExternalAgent runs inside the container where n8n listens on :5678.
 * The host-mapped port (backendUrl) is NOT reachable from inside the container.
 */
function getServerInternalUrl(backendUrl: string): string {
	if (backendUrl.includes(':5678')) return backendUrl;
	return 'http://localhost:5678';
}

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
			streaming: true,
			pushNotifications: false,
			multiTurn: true,
		});

		// Interfaces — must point to the task endpoint
		expect(card.interfaces).toHaveLength(1);
		expect(card.interfaces[0].type).toBe('http+json');
		expect(card.interfaces[0].url).toContain(`/api/v1/agents/${agent.id}/task`);

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

/** Parse SSE text into an array of event objects */
function parseSseEvents(text: string): Array<Record<string, unknown>> {
	return text
		.split('\n')
		.filter((line) => line.startsWith('data: '))
		.map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>);
}

test.describe('Agent Task Streaming', () => {
	test('should stream task steps as SSE events', async ({
		agent,
		agentProject,
		anthropicCredential,
		api,
		backendUrl,
		ownerApiKey,
	}) => {
		test.skip(!anthropicCredential, 'TEST_CREDENTIAL_ANTHROPIC not set — skipping LLM tests');
		test.setTimeout(180_000);

		await api.projects.addUserToProject(agentProject.id, agent.id, 'project:editor');

		const workflowName = `Stream E2E Workflow ${nanoid(8)}`;
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
									value: 'Streamed result',
									type: 'string',
								},
							],
						},
					},
				},
			],
			connections: {
				'When clicking "Test workflow"': {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
			},
		});

		await api.workflows.transfer(workflow.id, agentProject.id);

		// Use native fetch with Accept: text/event-stream to get SSE
		const response = await fetch(`${backendUrl}/rest/agents/${agent.id}/task`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'text/event-stream',
				'x-n8n-api-key': ownerApiKey.rawApiKey,
			},
			body: JSON.stringify({
				prompt: `Execute the workflow named "${workflowName}" and report the result.`,
			}),
		});

		expect(response.ok).toBe(true);
		expect(response.headers.get('content-type')).toContain('text/event-stream');

		const body = await response.text();
		const events = parseSseEvents(body);

		// Log events for visibility
		// eslint-disable-next-line no-console
		console.log('\n--- SSE Stream Events ---');
		for (const event of events) {
			// eslint-disable-next-line no-console
			console.log(`  ${String(event.type)}: ${JSON.stringify(event)}`);
		}
		// eslint-disable-next-line no-console
		console.log('--- End Stream ---\n');

		// Must have at least a step + observation + done
		expect(events.length).toBeGreaterThanOrEqual(3);

		// First event should be a step
		expect(events[0].type).toBe('step');

		// Last event should be the done signal
		const doneEvent = events[events.length - 1];
		expect(doneEvent.type).toBe('done');
		expect(doneEvent.status).toBe('completed');
		expect(doneEvent.summary).toBeTruthy();

		// Should contain a workflow execution step
		const workflowStep = events.find((e) => e.type === 'step' && e.action === 'execute_workflow');
		expect(workflowStep).toBeTruthy();
		expect(workflowStep!.workflowName).toBe(workflowName);

		// Should contain an observation after the workflow step
		const observation = events.find(
			(e) => e.type === 'observation' && e.action === 'execute_workflow',
		);
		expect(observation).toBeTruthy();
		expect(observation!.result).toBe('success');
	});

	test('should fall back to JSON response without Accept header', async ({
		agent,
		agentProject,
		anthropicCredential,
		api,
		externalRequest,
	}) => {
		test.skip(!anthropicCredential, 'TEST_CREDENTIAL_ANTHROPIC not set — skipping LLM tests');
		test.setTimeout(180_000);

		await api.projects.addUserToProject(agentProject.id, agent.id, 'project:editor');

		const workflowName = `Fallback E2E Workflow ${nanoid(8)}`;
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
									value: 'JSON result',
									type: 'string',
								},
							],
						},
					},
				},
			],
			connections: {
				'When clicking "Test workflow"': {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
			},
		});

		await api.workflows.transfer(workflow.id, agentProject.id);

		// Standard request without Accept: text/event-stream — should get JSON
		const response = await externalRequest.post(`/rest/agents/${agent.id}/task`, {
			data: {
				prompt: `Execute the workflow named "${workflowName}" and report the result.`,
			},
			timeout: 60_000,
		});

		expect(response.ok()).toBe(true);

		const task = await unwrap<{
			status: string;
			summary: string;
			steps: Array<{ action: string; workflowName?: string; result?: string }>;
		}>(response);

		// Should be a normal JSON response, not SSE
		expect(task.status).toBe('completed');
		expect(task.steps.length).toBeGreaterThan(0);
	});
});

test.describe('Agent Task Execution', () => {
	test('should execute a task via API key and get structured response', async ({
		agent,
		agentProject,
		anthropicCredential,
		api,
		externalRequest,
	}) => {
		test.skip(!anthropicCredential, 'TEST_CREDENTIAL_ANTHROPIC not set — skipping LLM tests');
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
			timeout: 60_000,
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

	test('should return error when no Anthropic credential is shared', async ({
		agent,
		externalRequest,
	}) => {
		// Agent has no Anthropic credential shared — should get a clear error
		const response = await externalRequest.post(`/rest/agents/${agent.id}/task`, {
			data: { prompt: 'Hello' },
		});

		expect(response.ok()).toBe(true);

		const task = await unwrap<{ status: string; message: string }>(response);

		expect(task.status).toBe('error');
		expect(task.message).toContain('No LLM API key available');
	});
});

// FIXME: Cross-instance delegation tests require container networking (localhost:5678)
test.describe.skip('Agent Cross-Instance Delegation', () => {
	test('should delegate to external agent via HTTP', async ({
		agent: agentA,
		agentProject,
		anthropicCredential,
		api,
		backendUrl,
		ownerApiKey,
		externalRequest,
	}) => {
		test.skip(!anthropicCredential, 'TEST_CREDENTIAL_ANTHROPIC not set — skipping LLM tests');
		test.setTimeout(180_000);

		// Create Agent B with a workflow
		const agentB = await api.agents.createAgent({
			firstName: `DocsBot-${nanoid(8)}`,
			description: 'Knowledge base manager',
			agentAccessLevel: 'external',
		});
		await api.projects.addUserToProject(agentProject.id, agentA.id, 'project:editor');
		await api.projects.addUserToProject(agentProject.id, agentB.id, 'project:editor');

		// Create a workflow for Agent B
		const workflowName = `DocsBot Workflow ${nanoid(8)}`;
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
									value: 'External delegation result',
									type: 'string',
								},
							],
						},
					},
				},
			],
			connections: {
				'When clicking "Test workflow"': {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
			},
		});
		await api.workflows.transfer(workflow.id, agentProject.id);

		// Dispatch to Agent A with Agent B as an external agent (same instance, different HTTP path)
		// externalAgents URL uses internal URL (reachable from inside the container)
		const internalUrl = getServerInternalUrl(backendUrl);
		const response = await externalRequest.post(`/rest/agents/${agentA.id}/task`, {
			data: {
				prompt: `Delegate to ${agentB.firstName} to run their workflow and report the result.`,
				externalAgents: [
					{
						name: agentB.firstName,
						description: 'Knowledge base manager',
						url: `${internalUrl}/rest/agents/${agentB.id}/task`,
						apiKey: ownerApiKey.rawApiKey,
					},
				],
			},
			timeout: 60_000,
		});

		expect(response.ok()).toBe(true);

		const task = await unwrap<{
			status: string;
			summary: string;
			steps: Array<{ action: string; workflowName?: string; toAgent?: string; result?: string }>;
		}>(response);

		// eslint-disable-next-line no-console
		console.log('\n--- Cross-Instance Delegation Result ---');
		// eslint-disable-next-line no-console
		console.log(`  Status: ${task.status}`);
		// eslint-disable-next-line no-console
		console.log(`  Summary: ${task.summary}`);
		// eslint-disable-next-line no-console
		console.log(`  Steps: ${JSON.stringify(task.steps)}`);
		// eslint-disable-next-line no-console
		console.log('--- End ---\n');

		expect(task.status).toBe('completed');
		const delegationStep = task.steps.find(
			(s) => s.action === 'send_message' && s.toAgent === agentB.firstName,
		);
		expect(delegationStep).toBeTruthy();
		expect(delegationStep!.result).toBe('success');
	});

	test('should stream SSE events with external: true for cross-instance delegation', async ({
		agent: agentA,
		agentProject,
		anthropicCredential,
		api,
		backendUrl,
		ownerApiKey,
	}) => {
		test.skip(!anthropicCredential, 'TEST_CREDENTIAL_ANTHROPIC not set — skipping LLM tests');
		test.setTimeout(180_000);

		const agentB = await api.agents.createAgent({
			firstName: `StreamBot-${nanoid(8)}`,
			description: 'Streaming delegation target',
			agentAccessLevel: 'external',
		});
		await api.projects.addUserToProject(agentProject.id, agentA.id, 'project:editor');
		await api.projects.addUserToProject(agentProject.id, agentB.id, 'project:editor');

		const workflowName = `StreamBot Workflow ${nanoid(8)}`;
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
									value: 'SSE external result',
									type: 'string',
								},
							],
						},
					},
				},
			],
			connections: {
				'When clicking "Test workflow"': {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
			},
		});
		await api.workflows.transfer(workflow.id, agentProject.id);

		// SSE request with external agents
		// externalAgents URL uses internal URL (reachable from inside the container)
		const sseInternalUrl = getServerInternalUrl(backendUrl);
		const response = await fetch(`${backendUrl}/rest/agents/${agentA.id}/task`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'text/event-stream',
				'x-n8n-api-key': ownerApiKey.rawApiKey,
			},
			body: JSON.stringify({
				prompt: `Delegate to ${agentB.firstName} to run their workflow and report the result.`,
				externalAgents: [
					{
						name: agentB.firstName,
						description: 'Streaming delegation target',
						url: `${sseInternalUrl}/rest/agents/${agentB.id}/task`,
						apiKey: ownerApiKey.rawApiKey,
					},
				],
			}),
		});

		expect(response.ok).toBe(true);
		expect(response.headers.get('content-type')).toContain('text/event-stream');

		const body = await response.text();
		const events = parseSseEvents(body);

		// eslint-disable-next-line no-console
		console.log('\n--- SSE External Delegation Events ---');
		for (const event of events) {
			// eslint-disable-next-line no-console
			console.log(`  ${String(event.type)}: ${JSON.stringify(event)}`);
		}
		// eslint-disable-next-line no-console
		console.log('--- End Stream ---\n');

		// Must have at least step + observation + done
		expect(events.length).toBeGreaterThanOrEqual(3);

		// Should contain a send_message step with external: true
		const delegationStep = events.find(
			(e) => e.type === 'step' && e.action === 'send_message' && e.external === true,
		);
		expect(delegationStep).toBeTruthy();

		// Should have an observation with external: true
		const observation = events.find(
			(e) => e.type === 'observation' && e.action === 'send_message' && e.external === true,
		);
		expect(observation).toBeTruthy();

		// Done event
		const doneEvent = events[events.length - 1];
		expect(doneEvent.type).toBe('done');
		expect(doneEvent.status).toBe('completed');
	});
});

test.describe('Agent Task via UI', () => {
	/**
	 * Opens the agent panel by dispatching pointer events directly to the card element.
	 * Canvas uses absolute positioning — force-clicking at coordinates can hit overlapping cards.
	 * dispatchEvent targets the DOM element directly, bypassing coordinate-based hit testing.
	 */
	async function openAgentPanel(page: Page, agentName: string) {
		const card = page.getByRole('button', { name: `Agent ${agentName}` });
		await expect(card).toBeVisible();
		await card.dispatchEvent('pointerdown', { bubbles: true });
		await card.dispatchEvent('pointerup', { bubbles: true });

		const panel = page.getByRole('complementary', { name: 'Agent details' });
		await expect(panel).toBeVisible();
		await expect(panel.getByRole('heading', { name: agentName })).toBeVisible();
		return panel;
	}

	test('should dispatch task from agent panel and see streaming result', async ({
		n8n,
		agent,
		agentProject,
		anthropicCredential,
		api,
	}) => {
		test.skip(!anthropicCredential, 'TEST_CREDENTIAL_ANTHROPIC not set — skipping LLM tests');
		test.setTimeout(180_000);

		// Setup: agent must be in the project that has the credential + workflow
		await api.projects.addUserToProject(agentProject.id, agent.id, 'project:editor');

		const workflowName = `UI E2E Workflow ${nanoid(8)}`;
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
									value: 'UI test result',
									type: 'string',
								},
							],
						},
					},
				},
			],
			connections: {
				'When clicking "Test workflow"': {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
			},
		});

		await api.workflows.transfer(workflow.id, agentProject.id);

		// Navigate to agents page and open the agent panel
		await n8n.navigate.toAgents();
		const panel = await openAgentPanel(n8n.page, agent.firstName);

		// Verify agent has access to the workflow and credential
		await expect(panel.getByText(workflowName)).toBeVisible();
		await expect(panel.getByText('anthropicApi')).toBeVisible();

		// Type a prompt and run task
		const taskInput = panel.getByRole('textbox');
		await taskInput.fill(`Execute the workflow named "${workflowName}" and report the result.`);

		const runButton = panel.getByRole('button', { name: 'Run Task' });
		await expect(runButton).toBeEnabled();
		await runButton.click();

		// Wait for streaming summary to appear (proves SSE round-trip through UI)
		const summaryCard = panel.locator('[class*="summaryCard"]');
		await expect(summaryCard).toBeVisible({ timeout: 60_000 });
		await expect(summaryCard).toContainText(/.+/);
	});

	test('should show LLM warning and disabled button when agent has no credential', async ({
		n8n,
		agent,
		api,
	}) => {
		// Put agent in a project so it has a stable canvas position, but no credential
		await api.enableProjectFeatures();
		await api.setMaxTeamProjectsQuota(-1);
		const project = await api.projects.createProject(`No LLM Project ${nanoid(8)}`);
		await api.projects.addUserToProject(project.id, agent.id, 'project:editor');

		await n8n.navigate.toAgents();
		const panel = await openAgentPanel(n8n.page, agent.firstName);

		// The LLM warning callout should be visible
		await expect(panel.getByText('No LLM credential found')).toBeVisible();

		// Run button should be disabled when no LLM is configured
		const runButton = panel.getByRole('button', { name: 'Run Task' });
		await expect(runButton).toBeDisabled();
	});

	test('should handle delegation to agent without LLM credentials gracefully', async ({
		n8n,
		agent,
		agentProject,
		anthropicCredential,
		api,
	}) => {
		test.skip(!anthropicCredential, 'TEST_CREDENTIAL_ANTHROPIC not set — skipping LLM tests');
		test.setTimeout(180_000);

		// Setup: QA agent with credentials in a project
		await api.projects.addUserToProject(agentProject.id, agent.id, 'project:editor');

		// Create a second agent WITHOUT credentials (no project, no LLM key)
		const noLlmAgent = await api.agents.createAgent({
			firstName: `NoLLM-${nanoid(8)}`,
			description: 'Agent with no LLM credential',
			agentAccessLevel: 'external',
		});

		// Navigate to agents and dispatch from the QA agent
		await n8n.navigate.toAgents();
		const panel = await openAgentPanel(n8n.page, agent.firstName);
		await expect(panel.getByText('anthropicApi')).toBeVisible();

		// Ask the agent to delegate to the no-LLM agent
		const taskInput = panel.getByRole('textbox');
		await taskInput.fill(
			`Send a message to agent "${noLlmAgent.firstName}" asking it to say hello. Report back what happened.`,
		);

		const runButton = panel.getByRole('button', { name: 'Run Task' });
		await runButton.click();

		// Should complete with a summary (not hang silently)
		const summaryCard = panel.locator('[class*="summaryCard"]');
		await expect(summaryCard).toBeVisible({ timeout: 120_000 });
		await expect(summaryCard).toContainText(/.+/);

		// The step list should show a delegation step to the no-LLM agent
		await expect(panel.getByText(`→ ${noLlmAgent.firstName}`)).toBeVisible();
	});

	test('should delegate across agents when both have valid credentials', async ({
		n8n,
		agent,
		agentProject,
		anthropicCredential,
		api,
	}) => {
		test.skip(!anthropicCredential, 'TEST_CREDENTIAL_ANTHROPIC not set — skipping LLM tests');
		test.setTimeout(180_000);

		// Setup: QA agent in the project with credential
		await api.projects.addUserToProject(agentProject.id, agent.id, 'project:editor');

		// Create a second agent (Communications) also with credential access
		const commsAgent = await api.agents.createAgent({
			firstName: `Comms-${nanoid(8)}`,
			description: 'Communications agent for cross-delegation test',
			agentAccessLevel: 'external',
		});
		await api.projects.addUserToProject(agentProject.id, commsAgent.id, 'project:editor');

		// Navigate to agents and dispatch from the QA agent
		await n8n.navigate.toAgents();
		const panel = await openAgentPanel(n8n.page, agent.firstName);
		await expect(panel.getByText('anthropicApi')).toBeVisible();

		// Ask the QA agent to delegate to Communications
		const taskInput = panel.getByRole('textbox');
		await taskInput.fill(
			`Send a message to agent "${commsAgent.firstName}" and ask it to respond with "Cross-delegation successful". Report its response.`,
		);

		const runButton = panel.getByRole('button', { name: 'Run Task' });
		await runButton.click();

		// Should complete with summary
		const summaryCard = panel.locator('[class*="summaryCard"]');
		await expect(summaryCard).toBeVisible({ timeout: 120_000 });
		await expect(summaryCard).toContainText(/.+/);

		// The step list should show delegation to the Comms agent
		await expect(panel.getByText(`→ ${commsAgent.firstName}`)).toBeVisible();
	});
});

test.describe('Public API Endpoints (/api/v1/)', () => {
	test('should return A2A card via GET /api/v1/agents/:id/card', async ({
		agent,
		api,
		ownerApiKey,
	}) => {
		const card = await api.agents.getCardViaPublicApi(agent.id, ownerApiKey.rawApiKey);

		expect(card.id).toBe(agent.id);
		expect(card.name).toBe(agent.firstName);
		expect(card.provider.name).toBe('n8n');
		expect(card.interfaces).toHaveLength(1);
		expect(card.interfaces[0].type).toBe('http+json');
		expect(card.interfaces[0].url).toContain('/api/v1/agents/');
		expect(card.interfaces[0].url).toContain('/task');
	});

	test('should return error for non-existent agent card via public API', async ({
		api,
		ownerApiKey,
	}) => {
		const response = await api.agents.getCardViaPublicApiRaw(
			'non-existent-id',
			ownerApiKey.rawApiKey,
		);

		// Public API may return 400 (invalid ID format) or 404 (not found)
		expect(response.ok()).toBe(false);
	});

	test('should execute task via POST /api/v1/agents/:id/task and get JSON result', async ({
		agent,
		agentProject,
		anthropicCredential,
		api,
		ownerApiKey,
	}) => {
		test.skip(!anthropicCredential, 'TEST_CREDENTIAL_ANTHROPIC not set — skipping LLM tests');
		test.setTimeout(180_000);

		await api.projects.addUserToProject(agentProject.id, agent.id, 'project:editor');

		const workflowName = `PublicAPI E2E Workflow ${nanoid(8)}`;
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
									value: 'Public API result',
									type: 'string',
								},
							],
						},
					},
				},
			],
			connections: {
				'When clicking "Test workflow"': {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
			},
		});

		await api.workflows.transfer(workflow.id, agentProject.id);

		const task = await api.agents.dispatchTaskViaPublicApi(
			agent.id,
			`Execute the workflow named "${workflowName}" and report the result.`,
			ownerApiKey.rawApiKey,
		);

		expect(task.status).toBe('completed');
		expect(task).toHaveProperty('steps');
		expect(task).toHaveProperty('summary');
	});

	test('should stream SSE via POST /api/v1/agents/:id/task with Accept header', async ({
		agent,
		agentProject,
		anthropicCredential,
		api,
		backendUrl,
		ownerApiKey,
	}) => {
		test.skip(!anthropicCredential, 'TEST_CREDENTIAL_ANTHROPIC not set — skipping LLM tests');
		test.setTimeout(180_000);

		await api.projects.addUserToProject(agentProject.id, agent.id, 'project:editor');

		const workflowName = `PublicAPI SSE Workflow ${nanoid(8)}`;
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
									value: 'Public SSE result',
									type: 'string',
								},
							],
						},
					},
				},
			],
			connections: {
				'When clicking "Test workflow"': {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
			},
		});

		await api.workflows.transfer(workflow.id, agentProject.id);

		const response = await fetch(`${backendUrl}/api/v1/agents/${agent.id}/task`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'text/event-stream',
				'x-n8n-api-key': ownerApiKey.rawApiKey,
			},
			body: JSON.stringify({
				prompt: `Execute the workflow named "${workflowName}" and report the result.`,
			}),
		});

		expect(response.ok).toBe(true);
		expect(response.headers.get('content-type')).toContain('text/event-stream');

		const body = await response.text();
		const events = parseSseEvents(body);

		expect(events.length).toBeGreaterThanOrEqual(3);
		expect(events[0].type).toBe('step');

		const doneEvent = events[events.length - 1];
		expect(doneEvent.type).toBe('done');
		expect(doneEvent.status).toBe('completed');
	});

	test('should have card interfaces URL pointing to /api/v1/', async ({
		agent,
		api,
		ownerApiKey,
	}) => {
		const card = await api.agents.getCardViaPublicApi(agent.id, ownerApiKey.rawApiKey);

		// The card URL should point to the public API, not /rest/
		expect(card.interfaces[0].url).toContain('/api/v1/');
		expect(card.interfaces[0].url).not.toContain('/rest/');
	});
});

test.describe('Agent Card: requiredCredentials', () => {
	test('should include requiredCredentials in agent card when agent has credentials', async ({
		agent,
		agentProject,
		anthropicCredential,
		api,
		ownerApiKey,
	}) => {
		test.skip(!anthropicCredential, 'TEST_CREDENTIAL_ANTHROPIC not set — skipping');

		await api.projects.addUserToProject(agentProject.id, agent.id, 'project:editor');

		const card = await api.agents.getCardViaPublicApi(agent.id, ownerApiKey.rawApiKey);

		expect(card.requiredCredentials).toBeDefined();
		expect(card.requiredCredentials!.length).toBeGreaterThan(0);

		const anthropicEntry = card.requiredCredentials!.find((c) => c.type === 'anthropicApi');
		expect(anthropicEntry).toBeTruthy();
		expect(anthropicEntry!.description).toBeTruthy();
	});

	test('should return empty requiredCredentials when agent has no credentials', async ({
		api,
		ownerApiKey,
	}) => {
		// Create a fresh agent with no project membership (no credentials)
		const bareAgent = await api.agents.createAgent({
			firstName: `Bare-${nanoid(8)}`,
			agentAccessLevel: 'external',
		});

		const card = await api.agents.getCardViaPublicApi(bareAgent.id, ownerApiKey.rawApiKey);

		expect(card.requiredCredentials).toBeDefined();
		expect(card.requiredCredentials).toEqual([]);
	});
});

test.describe('BYOK (Bring Your Own Key)', () => {
	test('should return error without BYOK key and no shared credential', async ({
		api,
		ownerApiKey,
	}) => {
		// Create agent with no credentials
		const bareAgent = await api.agents.createAgent({
			firstName: `NoCred-${nanoid(8)}`,
			agentAccessLevel: 'external',
		});

		const task = await api.agents.dispatchTaskViaPublicApi(
			bareAgent.id,
			'Hello',
			ownerApiKey.rawApiKey,
		);

		expect(task.status).toBe('error');
		expect(task.message).toContain('No LLM API key');
	});

	test('should succeed with BYOK key when agent has no shared credential', async ({
		api,
		ownerApiKey,
		testCredentials,
	}) => {
		test.skip(!testCredentials.anthropic, 'TEST_CREDENTIAL_ANTHROPIC not set — skipping LLM tests');
		test.setTimeout(180_000);

		// Create agent with no credentials but provide BYOK
		const bareAgent = await api.agents.createAgent({
			firstName: `BYOK-${nanoid(8)}`,
			agentAccessLevel: 'external',
		});

		const task = await api.agents.dispatchTaskWithByokViaPublicApi(
			bareAgent.id,
			'Just respond with "BYOK working" — do not execute any workflows.',
			{ anthropicApiKey: testCredentials.anthropic },
			ownerApiKey.rawApiKey,
		);

		expect(task.status).toBe('completed');
		expect(task.summary).toBeTruthy();
	});

	test('should work with BYOK via SSE streaming', async ({
		api,
		ownerApiKey,
		testCredentials,
		backendUrl,
	}) => {
		test.skip(!testCredentials.anthropic, 'TEST_CREDENTIAL_ANTHROPIC not set — skipping LLM tests');
		test.setTimeout(180_000);

		const bareAgent = await api.agents.createAgent({
			firstName: `BYOKStream-${nanoid(8)}`,
			agentAccessLevel: 'external',
		});

		const response = await fetch(`${backendUrl}/api/v1/agents/${bareAgent.id}/task`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'text/event-stream',
				'x-n8n-api-key': ownerApiKey.rawApiKey,
			},
			body: JSON.stringify({
				prompt: 'Just respond with "BYOK streaming works" — do not execute any workflows.',
				byokCredentials: { anthropicApiKey: testCredentials.anthropic },
			}),
		});

		expect(response.ok).toBe(true);
		expect(response.headers.get('content-type')).toContain('text/event-stream');

		const body = await response.text();
		const events = parseSseEvents(body);

		const doneEvent = events[events.length - 1];
		expect(doneEvent.type).toBe('done');
		expect(doneEvent.status).toBe('completed');
	});
});
