import { test, expect } from '../../../fixtures/base';

test.describe(
	'GHC-7768: Floating nodes should be clickable in node details view',
	{
		annotation: [
			{ type: 'issue', description: 'https://github.com/n8n-io/n8n/issues/28607' },
			{ type: 'owner', description: 'Adore' },
		],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test('should navigate to next node by clicking floating node preview WITHOUT forcing', async ({
			n8n,
		}) => {
			// Import a workflow with connected nodes
			await n8n.start.fromImportedWorkflow('Floating_Nodes.json');

			// Open the first node
			await n8n.canvas.getCanvasNodes().first().dblclick();
			await expect(n8n.ndv.container).toBeVisible();

			// Verify output floating node is visible
			const outputFloatingNode = n8n.ndv.getFloatingNodeByPosition('outputMain');
			await expect(outputFloatingNode).toBeVisible();

			// Get the current node name before navigation
			const currentNodeName = await n8n.ndv.getNodeNameContainer().textContent();

			// CRITICAL: Click the floating node WITHOUT force: true
			// This should work naturally for users, but currently fails
			await outputFloatingNode.click();

			// Wait for navigation to complete
			await n8n.page.waitForTimeout(500);

			// Verify we navigated to a different node
			const newNodeName = await n8n.ndv.getNodeNameContainer().textContent();
			expect(newNodeName).not.toBe(currentNodeName);

			// Verify NDV is still open with the new node
			await expect(n8n.ndv.container).toBeVisible();
		});

		test('should navigate to previous node by clicking floating node preview WITHOUT forcing', async ({
			n8n,
		}) => {
			// Import a workflow with connected nodes
			await n8n.start.fromImportedWorkflow('Floating_Nodes.json');

			// Open a middle node that has both input and output connections
			await n8n.canvas.openNode('Merge');
			await expect(n8n.ndv.container).toBeVisible();

			// Verify input floating nodes are visible
			const inputFloatingNode = n8n.ndv.getFloatingNodeByPosition('inputMain');
			await expect(inputFloatingNode.first()).toBeVisible();

			// Get the current node name before navigation
			const currentNodeName = await n8n.ndv.getNodeNameContainer().textContent();

			// CRITICAL: Click the floating node WITHOUT force: true
			// This should work naturally for users, but currently fails
			await inputFloatingNode.first().click();

			// Wait for navigation to complete
			await n8n.page.waitForTimeout(500);

			// Verify we navigated to a different node
			const newNodeName = await n8n.ndv.getNodeNameContainer().textContent();
			expect(newNodeName).not.toBe(currentNodeName);

			// Verify NDV is still open with the new node
			await expect(n8n.ndv.container).toBeVisible();
		});

		test('should show hover state when hovering over floating node', async ({ n8n }) => {
			// Import a workflow with connected nodes
			await n8n.start.fromImportedWorkflow('Floating_Nodes.json');

			// Open the first node
			await n8n.canvas.getCanvasNodes().first().dblclick();
			await expect(n8n.ndv.container).toBeVisible();

			// Get the floating node
			const floatingNode = n8n.ndv.getFloatingNodeByPosition('outputMain');
			await expect(floatingNode).toBeVisible();

			// Hover over the floating node - should show visual feedback
			await floatingNode.hover();

			// Wait a moment for hover animation
			await n8n.page.waitForTimeout(300);

			// The node should remain visible and be in hover state
			await expect(floatingNode).toBeVisible();
		});
	},
);
