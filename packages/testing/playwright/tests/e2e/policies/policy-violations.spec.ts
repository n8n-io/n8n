import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';
import type { n8nPage } from '../../../pages/n8nPage';

const SLACK_NODE_TYPE = 'n8n-nodes-base.slack';
const SLACK_NODE_NAME = 'Slack';

// The module loads only when the licence is present at boot, hence @licensed.
test.use({
	capability: {
		env: {
			N8N_ENABLED_MODULES: 'type-availability-policies',
		},
	},
});

function workflowWithSlackNode(): Partial<IWorkflowBase> {
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
			{
				id: nanoid(),
				name: SLACK_NODE_NAME,
				type: SLACK_NODE_TYPE,
				typeVersion: 2.2,
				position: [240, 0],
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
 * Seeds the workflow before the deny rule exists: a workflow whose node type is
 * already denied is refused on its first save, so there would be nothing to open.
 */
async function openRefusedWorkflow(n8n: n8nPage): Promise<string> {
	const workflow = await n8n.api.workflows.createWorkflow(workflowWithSlackNode());
	await denyType(n8n, SLACK_NODE_TYPE);
	await n8n.start.fromExistingWorkflow(workflow.id);
	return workflow.id;
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
			await openRefusedWorkflow(n8n);

			const saved = n8n.canvas.waitForSaveWorkflowCompleted();
			await n8n.canvasComposer.renameNodeViaShortcut(SLACK_NODE_NAME, `${SLACK_NODE_NAME} renamed`);
			const response = await saved;

			expect(response.status()).toBe(403);
			await expect(n8n.notifications.getNotificationByContent(SLACK_NODE_TYPE)).toBeVisible();
		});
	},
);
