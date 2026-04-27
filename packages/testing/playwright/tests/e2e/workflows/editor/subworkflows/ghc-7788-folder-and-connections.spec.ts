/**
 * Regression tests for GHC-7788
 * @see https://linear.app/n8n/issue/GHC-7788
 * Bug: Convert to sub-workflow:
 *  1. Child workflow not placed in parent folder
 *  2. Internal node connections lost
 */

import { test, expect } from '../../../../../fixtures/base';
import { nanoid } from 'nanoid';

test.describe(
	'GHC-7788: Convert to sub-workflow folder and connections regression',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should create sub-workflow in the same folder as parent workflow', async ({ n8n }) => {
			// GHC-7788 regression test: sub-workflow should be created in the same folder as parent

			// Create a project and folder structure
			const { id: projectId } = await n8n.api.projects.createProject();
			const folder = await n8n.api.projects.createFolder(projectId, `Test Folder ${nanoid()}`);

			// Import a workflow into the folder
			await n8n.start.fromImportedWorkflow('Subworkflow-extraction-folder-test.json', {
				projectId,
				folderId: folder.id,
			});

			// Verify we're in the folder
			await n8n.navigate.toFolder(folder.id, projectId);
			const parentWorkflowName = n8n.workflowDocumentStore.workflowName;

			// Select nodes to extract (Set Step 1, Set Step 2, Set Step 3)
			await n8n.canvas.nodeByName('Set Step 1').click();
			await n8n.canvas.extendSelectionWithArrows('right'); // Selects Set Step 2
			await n8n.canvas.extendSelectionWithArrows('right'); // Selects Set Step 3

			// Convert to sub-workflow
			await n8n.canvas.openCanvasContextMenu();
			await n8n.canvas.clickContextMenuAction('Convert 3 nodes to sub-workflow');
			await n8n.canvas.convertToSubworkflowModal.waitForModal();

			const subWorkflowName = `Sub ${nanoid()}`;
			await n8n.canvas.convertToSubworkflowModal.getRoot().getByRole('textbox').fill(subWorkflowName);
			await n8n.canvas.convertToSubworkflowModal.clickSubmitButton();
			await n8n.canvas.convertToSubworkflowModal.waitForClose();

			// Go back to the folder view to check where the sub-workflow was created
			await n8n.navigate.toFolder(folder.id, projectId);

			// REGRESSION: The sub-workflow should be visible in the same folder as the parent
			// This assertion will FAIL on current code (bug present)
			await expect(n8n.workflows.cards.getWorkflow(subWorkflowName)).toBeVisible({
				timeout: 5000,
			});

			// Also verify it's not at the project root
			await n8n.navigate.toProject(projectId);
			await expect(n8n.workflows.cards.getWorkflow(subWorkflowName)).toBeHidden();
		});

		test('should preserve internal node connections in extracted sub-workflow', async ({
			n8n,
		}) => {
			// GHC-7788 regression test: internal connections should be preserved in sub-workflow

			// Create workflow with connected nodes
			await n8n.start.fromImportedWorkflow('Subworkflow-extraction-folder-test.json');

			// Verify initial connections exist
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4); // Trigger + 3 Set nodes

			// Select all three Set nodes
			await n8n.canvas.nodeByName('Set Step 1').click();
			await n8n.canvas.extendSelectionWithArrows('right'); // Set Step 2
			await n8n.canvas.extendSelectionWithArrows('right'); // Set Step 3

			// Convert to sub-workflow
			await n8n.canvas.openCanvasContextMenu();
			await n8n.canvas.clickContextMenuAction('Convert 3 nodes to sub-workflow');
			await n8n.canvas.convertToSubworkflowModal.waitForModal();

			const subWorkflowName = `My Sub ${nanoid()}`;
			await n8n.canvas.convertToSubworkflowModal.getRoot().getByRole('textbox').fill(subWorkflowName);
			await n8n.canvas.convertToSubworkflowModal.clickSubmitButton();
			await n8n.canvas.convertToSubworkflowModal.waitForClose();

			// Open the created sub-workflow by clicking the Execute Workflow node
			const executeWorkflowNodeName = `Call ${subWorkflowName}`;
			await n8n.canvas.openNode(executeWorkflowNodeName);

			// Click the "Open workflow" link in the NDV
			await n8n.ndv.getByText('Open workflow').click();

			// Wait for the sub-workflow to load
			await n8n.canvas.waitForCanvasReady();

			// REGRESSION: Verify connections are preserved
			// The sub-workflow should have:
			// - Start (trigger) node
			// - Set Step 1
			// - Set Step 2
			// - Set Step 3
			// - Return node (if present)

			// Verify all nodes are present
			await expect(n8n.canvas.nodeByName('Start')).toBeVisible();
			await expect(n8n.canvas.nodeByName('Set Step 1')).toBeVisible();
			await expect(n8n.canvas.nodeByName('Set Step 2')).toBeVisible();
			await expect(n8n.canvas.nodeByName('Set Step 3')).toBeVisible();

			// REGRESSION: Verify the connections between nodes exist
			// This can be checked by verifying edge elements or by checking node positions
			// and connection data

			// Get the connection from Set Step 1 to Set Step 2
			const setStep1 = n8n.canvas.nodeByName('Set Step 1');
			const setStep2 = n8n.canvas.nodeByName('Set Step 2');
			const setStep3 = n8n.canvas.nodeByName('Set Step 3');

			// Verify connections exist by checking if edges are rendered
			// The canvas should have edges connecting: Start -> Set Step 1 -> Set Step 2 -> Set Step 3
			const edges = n8n.canvas.getCanvasEdges();

			// This assertion will FAIL if connections are missing (bug present)
			// We should have at least 3 edges for the chain
			await expect(edges).not.toHaveCount(0);

			// More specific: should have edges for the linear chain
			// Start -> Set Step 1, Set Step 1 -> Set Step 2, Set Step 2 -> Set Step 3
			await expect(edges).toHaveCount(3, { timeout: 5000 });
		});
	},
);
