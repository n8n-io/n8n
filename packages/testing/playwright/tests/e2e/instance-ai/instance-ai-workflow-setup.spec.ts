import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

// Stable names keep recorded traces deterministic across replays.
// The instance-ai reset fixture wipes all workflows before each test, so there
// is no cross-test bleed from using fixed names.
const B2_WORKFLOW_NAME = 'B2 Confirm Mode';
const B2_CREDENTIAL_NAME = 'B2 Confirm Slack';

function seededWorkflow(name: string, nodes: IWorkflowBase['nodes']): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes,
		connections: {
			'Manual Trigger': { main: [[{ node: nodes[1].name, type: 'main', index: 0 }]] },
		},
		settings: {},
	};
}

test.describe(
	'Instance AI workflow setup @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		// B1 — Build handoff smoke (AI-2392): the AI produces a workflow with a required
		// parameter left empty and the per-input issue indicator in the setup card does
		// not clear after the user fills the value in. Root cause: `workflowsStore.workflowObject`
		// holds a deep copy of the nodes (see `createWorkflowObject(..., copyData=true)`
		// in `workflows.store.ts`). `onParameterValueChanged` in `useSetupCardParameters`
		// only mutates the live Pinia node, so `ParameterInput`'s issue check — which
		// reads the node via `expressionLocalResolveCtx.workflow.getNode()` — keeps
		// seeing the stale (empty) parameters and keeps the red indicator on.
		test('should clear required-parameter issue indicator when the field is filled', async ({
			n8n,
		}) => {
			await n8n.navigate.toInstanceAi();

			// Ask for a workflow with an HTTP Request node whose required `url` is empty,
			// which produces a setup request with a parameter issue for `url`.
			await n8n.instanceAi.sendMessage(
				'Build a workflow with a manual trigger and an HTTP Request node. ' +
					'Leave the URL empty so I can fill it in afterwards. ' +
					'Open the setup after the workflow is built.',
			);

			await expect(n8n.instanceAi.getWorkflowSetupCard()).toBeVisible({ timeout: 120_000 });

			// The empty required `url` renders a visible issue indicator inside the card.
			await expect(n8n.instanceAi.getWorkflowSetupParameterIssues()).toBeVisible();

			// Fill the first (and only) visible parameter input with a valid value.
			await n8n.instanceAi.getWorkflowSetupParameterInput().fill('https://example.com');

			// After the fix, the issue indicator should unmount once the parameter is set.
			// Before the fix, it stays visible because the workflow object's deep-copied
			// node keeps returning the empty value to the issue checker.
			await expect(n8n.instanceAi.getWorkflowSetupParameterIssues()).toBeHidden({
				timeout: 5_000,
			});
		});

		// B2 — Confirm mode flow. Seed a workflow whose single credential-requiring node
		// can be auto-resolved (one matching credential in the project), so the setup
		// renders in confirm mode instead of the full wizard.
		test('should render confirm mode when a single valid credential auto-applies', async ({
			n8n,
		}) => {
			await n8n.api.credentials.createCredential({
				name: B2_CREDENTIAL_NAME,
				type: 'slackApi',
				data: { accessToken: 'xoxb-seed-confirm' },
			});

			const workflow = await n8n.api.workflows.createWorkflow(
				seededWorkflow(B2_WORKFLOW_NAME, [
					{
						id: 'trigger',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'slack',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.3,
						position: [220, 0],
						parameters: {
							resource: 'message',
							operation: 'post',
							select: 'channel',
							channelId: { __rl: true, value: 'C0000000000', mode: 'id' },
							text: 'hello from setup e2e',
						},
					},
				]),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(`Set up the workflow named "${B2_WORKFLOW_NAME}".`);

			await expect(n8n.instanceAi.getWorkflowSetupConfirmCard()).toBeVisible({
				timeout: 120_000,
			});
			await expect(n8n.instanceAi.getWorkflowSetupReviewDetailsLink()).toBeVisible();

			await n8n.instanceAi.getWorkflowSetupReviewDetailsLink().click();

			await expect(n8n.instanceAi.getWorkflowSetupCard()).toBeVisible();
			await expect(n8n.instanceAi.getWorkflowSetupConfirmCard()).toBeHidden();

			await n8n.instanceAi.getWorkflowSetupApplyButton().click();

			await expect(n8n.instanceAi.getWorkflowSetupAppliedState()).toBeVisible({
				timeout: 30_000,
			});

			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			const slackNode = persisted.nodes.find((n) => n.name === 'Slack');
			expect(slackNode?.credentials?.slackApi?.name).toBe(B2_CREDENTIAL_NAME);
		});

		test('should defer the whole setup when Later is clicked in confirm mode', async ({ n8n }) => {
			await n8n.api.credentials.createCredential({
				name: B2_CREDENTIAL_NAME,
				type: 'slackApi',
				data: { accessToken: 'xoxb-seed-confirm' },
			});

			const workflow = await n8n.api.workflows.createWorkflow(
				seededWorkflow(B2_WORKFLOW_NAME, [
					{
						id: 'trigger',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'slack',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.3,
						position: [220, 0],
						parameters: {
							resource: 'message',
							operation: 'post',
							select: 'channel',
							channelId: { __rl: true, value: 'C0000000000', mode: 'id' },
							text: 'hello from setup e2e',
						},
					},
				]),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(`Set up the workflow named "${B2_WORKFLOW_NAME}".`);

			await expect(n8n.instanceAi.getWorkflowSetupConfirmCard()).toBeVisible({
				timeout: 120_000,
			});

			await n8n.instanceAi.getWorkflowSetupLaterButton().click();

			await expect(n8n.instanceAi.getWorkflowSetupDeferredState()).toBeVisible({
				timeout: 30_000,
			});

			// Defer must not mutate the workflow — the node still carries no credential.
			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			const slackNode = persisted.nodes.find((n) => n.name === 'Slack');
			expect(slackNode?.credentials).toBeUndefined();
		});
	},
);
