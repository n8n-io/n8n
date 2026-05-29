import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

// A deprecated node can only exist in a workflow created before the node was
// deprecated. The backend blocks creating such workflows, so disable that guard
// for this test to seed the fixture. The editor's frozen-node behaviour is
// driven by the node description and is independent of this flag.
test.use({ capability: { env: { N8N_DEPRECATED_NODES_BLOCK: 'false' } } });

const TRIGGER_NAME = 'Manual Trigger';
const FUNCTION_NODE_NAME = 'Function';

/**
 * Builds a saved workflow containing a manual trigger connected to a legacy
 * (deprecated) Function node, seeded via the API (importing/pasting a deprecated
 * node in the editor would replace it with its successor instead).
 */
function createDeprecatedFunctionWorkflow(): Partial<IWorkflowBase> {
	return {
		name: `Deprecated Function node ${nanoid()}`,
		nodes: [
			{
				id: nanoid(),
				name: TRIGGER_NAME,
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: nanoid(),
				name: FUNCTION_NODE_NAME,
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [300, 0],
				parameters: { functionCode: 'return items;' },
			},
		],
		connections: {
			[TRIGGER_NAME]: {
				main: [[{ node: FUNCTION_NODE_NAME, type: 'main', index: 0 }]],
			},
		},
		active: false,
	};
}

test.describe(
	'Deprecated nodes',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should freeze a saved deprecated node with a read-only NDV and deprecation notice', async ({
			api,
			n8n,
		}) => {
			await n8n.start.fromHome();

			const { workflowId } = await api.workflows.createWorkflowFromDefinition(
				createDeprecatedFunctionWorkflow(),
				{ makeUnique: false },
			);

			await n8n.navigate.toWorkflow(workflowId);

			// Canvas: the frozen deprecated node shows the deprecated status indicator
			await expect(n8n.canvas.getNodeDeprecatedStatusIndicator(FUNCTION_NODE_NAME)).toBeVisible();

			// NDV: opening the node surfaces the deprecation notice
			await n8n.canvas.openNode(FUNCTION_NODE_NAME);
			await expect(n8n.ndv.getDeprecatedNotice()).toBeVisible();

			// NDV is read-only: the code editor is not editable
			await expect(n8n.ndv.getParameterEditor('functionCode')).toHaveAttribute(
				'contenteditable',
				'false',
			);
		});
	},
);
