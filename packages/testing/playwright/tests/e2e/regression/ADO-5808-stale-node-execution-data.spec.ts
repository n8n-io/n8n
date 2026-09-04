import { CODE_NODE_DISPLAY_NAME, CODE_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'ADO-5808 Node error reappears on replacing with different node',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should not show the deleted node execution data on a new node reusing its name', async ({
			n8n,
		}) => {
			await n8n.start.fromImportedWorkflow('ADO-5808-erroring-code-node.json');

			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.getNodeIssuesByName(CODE_NODE_DISPLAY_NAME)).toBeVisible();

			await n8n.canvas.deleteNodeByName(CODE_NODE_DISPLAY_NAME);

			// The freed name is handed back to the replacement node, which must not
			// inherit the deleted node's run data.
			await n8n.canvas.addNode(CODE_NODE_NAME, { action: CODE_NODE_DISPLAY_NAME });
			await n8n.ndv.close();

			await expect(n8n.canvas.getNodeIssuesByName(CODE_NODE_DISPLAY_NAME)).toBeHidden();

			await n8n.canvas.openNode(CODE_NODE_DISPLAY_NAME);
			await expect(n8n.ndv.getNodeRunErrorMessage()).toBeHidden();
		});
	},
);
