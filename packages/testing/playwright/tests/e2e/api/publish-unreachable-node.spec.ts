import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const AGENT = '@n8n/n8n-nodes-langchain.agent';
const PARSER = '@n8n/n8n-nodes-langchain.outputParserAutofixing';

/**
 * A schedule trigger feeding a No-Op, plus an agent with an autofixing parser
 * attached. Neither the agent nor the parser has a language model, so both
 * declare an unmet required input.
 *
 * `reachable` decides whether the trigger feeds the agent. When it does not,
 * the agent and parser form an island: wired to each other, reached by nothing.
 */
function buildWorkflow(reachable: boolean): Partial<IWorkflowBase> {
	const nodes = [
		{
			id: nanoid(),
			name: 'Schedule Trigger',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1.2,
			position: [0, 0] as [number, number],
			parameters: { rule: { interval: [{ field: 'days' }] } },
		},
		{
			id: nanoid(),
			name: 'No Op',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [220, 0] as [number, number],
			parameters: {},
		},
		{
			id: nanoid(),
			name: 'Agent',
			type: AGENT,
			typeVersion: 2.2,
			position: [220, 260] as [number, number],
			parameters: { promptType: 'define', text: 'hello', hasOutputParser: true },
		},
		{
			id: nanoid(),
			name: 'Parser',
			type: PARSER,
			typeVersion: 1,
			position: [420, 420] as [number, number],
			parameters: {},
		},
	];

	const connections: IWorkflowBase['connections'] = {
		'Schedule Trigger': {
			main: [[{ node: reachable ? 'Agent' : 'No Op', type: 'main', index: 0 }]],
		},
		Parser: {
			ai_outputParser: [[{ node: 'Agent', type: 'ai_outputParser', index: 0 }]],
		},
	};

	return {
		name: `required input reachability ${nanoid()}`,
		nodes,
		connections,
		settings: { executionOrder: 'v1' },
	};
}

test.describe(
	'Publishing a workflow with unmet required inputs',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		const cleanupWorkflowIds: string[] = [];

		test.afterEach(async ({ api }) => {
			// The published case leaves a daily schedule active, which would keep
			// firing on a persistent stack.
			while (cleanupWorkflowIds.length > 0) {
				const workflowId = cleanupWorkflowIds.pop();
				try {
					await api.workflows.deactivate(workflowId!);
					await api.workflows.delete(workflowId!);
				} catch {
					// ignore potential errors in the cleanup process
				}
			}
		});

		test('publishes when the nodes with unmet inputs cannot be reached', async ({ api }) => {
			const created = await api.workflows.createWorkflow(buildWorkflow(false));
			cleanupWorkflowIds.push(created.id);

			const response = await api.workflows.activateRaw(created.id, created.versionId);

			expect(
				response.ok(),
				`publish was refused over nodes no run can reach: ${await response.text()}`,
			).toBe(true);

			// Activation lands through the publication outbox. Poll for it before the
			// teardown deactivates, so cleanup cannot race the publish.
			await expect
				.poll(async () => (await api.workflows.getPublicationStatus(created.id)).status, {
					timeout: 15_000,
				})
				.toBe('published');
		});

		test('refuses to publish when the same nodes are reachable', async ({ api }) => {
			const created = await api.workflows.createWorkflow(buildWorkflow(true));
			cleanupWorkflowIds.push(created.id);

			const response = await api.workflows.activateRaw(created.id, created.versionId);

			expect(response.ok()).toBe(false);
			expect(await response.text()).toContain('has no node connected to its required');
		});
	},
);
