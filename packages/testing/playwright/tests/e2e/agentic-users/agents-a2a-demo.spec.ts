/**
 * A2A Streaming Demo — Container Setup
 *
 * Spins up a container with agents + workflow, prints connection details
 * for the HTML streaming demo page (scripts/a2a-demo.html).
 *
 * Usage:
 *   N8N_CONTAINERS_KEEPALIVE=true \
 *     pnpm --filter=n8n-playwright test:container:sqlite \
 *     tests/e2e/agents/agents-a2a-demo.spec.ts --reporter=list 2>&1 | tail -40
 *
 * Then open scripts/a2a-demo.html and paste the printed values.
 * Cleanup: pnpm --filter n8n-containers stack:clean:all
 */
import { nanoid } from 'nanoid';

import { test, expect } from './fixtures';

const DIVIDER = '='.repeat(60);

test('A2A demo setup @keepalive', async ({ agent, agentProject, api, backendUrl, ownerApiKey }) => {
	// Add agent to project
	await api.projects.addUserToProject(agentProject.id, agent.id, 'project:editor');

	// Create workflow
	const workflowName = `Demo Workflow ${nanoid(8)}`;
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
								name: 'greeting',
								value: 'Hello from the A2A streaming demo!',
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

	// Verify agent sees the workflow
	const capabilities = await api.agents.getCapabilities(agent.id);
	expect(capabilities.workflows.some((w) => w.name === workflowName)).toBe(true);

	/* eslint-disable no-console */
	console.log(`\n${DIVIDER}`);
	console.log('  A2A STREAMING DEMO — READY');
	console.log(DIVIDER);
	console.log(`  Backend URL:  ${backendUrl}`);
	console.log(`  Agent ID:     ${agent.id}`);
	console.log(`  Agent Name:   ${agent.firstName}`);
	console.log(`  API Key:      ${ownerApiKey.rawApiKey}`);
	console.log(`  Workflow:     ${workflowName}`);
	console.log(DIVIDER);
	console.log('  Open scripts/a2a-demo.html in your browser');
	console.log('  Paste Backend URL, Agent ID, and API Key');
	console.log(DIVIDER);
	console.log('  Cleanup: pnpm --filter n8n-containers stack:clean:all');
	console.log(`${DIVIDER}\n`);
	/* eslint-enable no-console */
});
