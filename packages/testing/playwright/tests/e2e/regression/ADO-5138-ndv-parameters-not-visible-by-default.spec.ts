import { test, expect } from '../../../fixtures/base';

test.describe(
	'ADO-5138 NDV Parameters Visibility',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test('should display parameters by default when NDV opens', async ({ n8n }) => {
			// Add a node with parameters
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Edit Fields (Set)', { closeNDV: false });

			// When NDV opens, parameters should be visible immediately
			await expect(n8n.ndv.container).toBeVisible();

			// The node parameters container should be visible
			const nodeParameters = n8n.ndv.getNodeParameters();
			await expect(nodeParameters).toBeVisible();

			// Parameters should be present and visible (not empty)
			// For Edit Fields node, we should see assignment collection parameters
			const assignmentCollection = n8n.ndv.getAssignmentCollectionDropArea();
			await expect(assignmentCollection).toBeVisible();
		});

		test('should display parameters for nodes with credentials when NDV opens', async ({
			n8n,
		}) => {
			// Add a node that requires credentials
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Notion', { action: 'Update a database page', closeNDV: false });

			// When NDV opens, parameters should be visible immediately
			await expect(n8n.ndv.container).toBeVisible();

			// The node parameters container should be visible
			const nodeParameters = n8n.ndv.getNodeParameters();
			await expect(nodeParameters).toBeVisible();

			// Credentials section should be visible
			const credentialsLabel = n8n.ndv.getCredentialsLabel();
			await expect(credentialsLabel).toBeVisible();

			// Parameters should be present (even if some require credentials)
			// At minimum, the parameters container should not be empty
			const parameterItems = nodeParameters.locator('.parameter-item');
			await expect(parameterItems.first()).toBeVisible();
		});

		test('should display parameters when switching between nodes', async ({ n8n }) => {
			// Add multiple nodes
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Edit Fields (Set)', { closeNDV: true });
			await n8n.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: true });

			// Open first node
			await n8n.canvas.openNode('Edit Fields (Set)');
			await expect(n8n.ndv.container).toBeVisible();
			await expect(n8n.ndv.getNodeParameters()).toBeVisible();

			// Close and open second node
			await n8n.ndv.close();
			await n8n.canvas.openNode('Code');
			await expect(n8n.ndv.container).toBeVisible();

			// Parameters should be visible immediately for the second node
			const nodeParameters = n8n.ndv.getNodeParameters();
			await expect(nodeParameters).toBeVisible();

			// Code node should have visible parameters
			const codeEditor = n8n.ndv.getCodeEditor();
			await expect(codeEditor).toBeVisible();
		});

		test('should display parameters when re-opening the same node', async ({ n8n }) => {
			// Add a node
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Edit Fields (Set)', { closeNDV: false });

			// Verify parameters are visible on first open
			await expect(n8n.ndv.container).toBeVisible();
			const nodeParameters = n8n.ndv.getNodeParameters();
			await expect(nodeParameters).toBeVisible();

			// Close the NDV
			await n8n.ndv.close();
			await expect(n8n.ndv.container).toBeHidden();

			// Re-open the same node
			await n8n.canvas.openNode('Edit Fields (Set)');
			await expect(n8n.ndv.container).toBeVisible();

			// Parameters should still be visible immediately
			await expect(nodeParameters).toBeVisible();
			const assignmentCollection = n8n.ndv.getAssignmentCollectionDropArea();
			await expect(assignmentCollection).toBeVisible();
		});
	},
);
