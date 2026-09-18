import type { Response } from '@playwright/test';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';
import type { n8nPage } from '../../../pages/n8nPage';

const SLACK_NODE_TYPE = 'n8n-nodes-base.slack';
const SLACK_NODE_NAME = 'Slack';
const SLACK_NODE_ACTION = 'Get a channel';

// The module loads only when the licence is present at boot, hence @licensed.
test.use({
	capability: {
		env: {
			N8N_ENABLED_MODULES: 'type-availability-policies',
		},
	},
});

function workflowWithTriggerOnly(): Partial<IWorkflowBase> {
	return {
		name: `Policy violations ${nanoid(8)}`,
		active: false,
		nodes: [
			{
				id: nanoid(),
				name: 'When clicking Execute workflow',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
	};
}

async function denyType(n8n: n8nPage, nodeType: string): Promise<void> {
	await n8n.api.nodeTypePolicies.putInstancePolicy({
		rules: [{ id: `deny-${nodeType}`, action: 'deny', selector: { kind: 'name', value: nodeType } }],
		defaultAction: 'allow',
	});
}

/**
 * The E2E controller answers the licence check from a feature map that every reset
 * clears, so the feature is enabled here, before the first policy request.
 */
async function openWorkflowUnderDeny(n8n: n8nPage, nodeType: string): Promise<string> {
	await n8n.api.enableFeature('nodeTypePolicies');
	const workflow = await n8n.api.workflows.createWorkflow(workflowWithTriggerOnly());
	await denyType(n8n, nodeType);
	await n8n.start.fromExistingWorkflow(workflow.id);
	return workflow.id;
}

/**
 * A save is refused only when it adds a denied type: the check grandfathers every type
 * the stored workflow already has. The node is added after the rule exists, so the
 * autosave that follows is the refused request.
 */
async function addDeniedNodeAndSave(n8n: n8nPage): Promise<Response> {
	const saved = n8n.canvas.waitForSaveWorkflowCompleted({ timeout: 15_000 });
	await n8n.canvas.addNode(SLACK_NODE_NAME, { action: SLACK_NODE_ACTION, closeNDV: true });
	return await saved;
}

test.describe(
	'Policy violations @licensed',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		test.afterEach(async ({ n8n }) => {
			await n8n.api.nodeTypePolicies.clearInstancePolicy();
		});

		test('a save refused by policy shows the refusal', async ({ n8n }) => {
			await openWorkflowUnderDeny(n8n, SLACK_NODE_TYPE);

			const response = await addDeniedNodeAndSave(n8n);

			expect(response.status()).toBe(403);
			await expect(n8n.notifications.getNotificationByContent(SLACK_NODE_TYPE)).toBeVisible();
		});
	},
);
