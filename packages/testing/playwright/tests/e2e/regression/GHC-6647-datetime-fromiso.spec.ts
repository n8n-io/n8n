import { test, expect } from '../../../fixtures/base';

test.describe(
	'GHC-6647 DateTime.fromISO() inconsistency',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should correctly format datetime with DateTime.fromISO() in full workflow execution', async ({
			n8n,
		}) => {
			// Import the test workflow with pinned data containing an ISO date string
			await n8n.start.fromImportedWorkflow('GHC-6647-datetime-fromiso.json');

			// Execute the full workflow
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			// Open the Set node to check the output
			await n8n.canvas.openNode('Set Timestamp');

			// Regression test: ensure DateTime.fromISO() works correctly during full workflow execution
			// The timestamp field is at column index 3 (id=0, name=1, updatedAt=2, timestamp=3)
			const timestampCell = n8n.ndv.outputPanel.getTbodyCell(0, 3);

			// Should NOT contain "Invalid DateTime"
			await expect(timestampCell).not.toContainText('Invalid DateTime');

			// Should contain a properly formatted date
			await expect(timestampCell).toContainText('23/10/2025');
		});

		test('should correctly format datetime when executing single step in NDV', async ({ n8n }) => {
			// Import the test workflow with pinned data containing an ISO date string
			await n8n.start.fromImportedWorkflow('GHC-6647-datetime-fromiso.json');

			// Open the Set node without executing the full workflow
			await n8n.canvas.openNode('Set Timestamp');

			// Execute just this step
			await n8n.ndv.execute();
			await n8n.notifications.quickCloseAll();

			// When executing just the step, DateTime.fromISO works correctly
			// The timestamp field is at column index 3 (id=0, name=1, updatedAt=2, timestamp=3)
			const timestampCell = n8n.ndv.outputPanel.getTbodyCell(0, 3);
			await expect(timestampCell).not.toContainText('Invalid DateTime');

			// Verify the date is properly formatted (dd/MM/yyyy HH:mm:ss)
			// Expected format: 23/10/2025 22:07:38
			await expect(timestampCell).toContainText('23/10/2025');
		});

		test('should demonstrate workaround using .toDateTime() works in both contexts', async ({
			n8n,
		}) => {
			// Import the test workflow
			await n8n.start.fromImportedWorkflow('GHC-6647-datetime-fromiso.json');

			// Execute the full workflow
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			// Open the Set node to check the output
			await n8n.canvas.openNode('Set Timestamp');

			// The workaround field using .toDateTime() should work correctly even in full workflow
			// timestampWithHelper is at column index 4 (id=0, name=1, updatedAt=2, timestamp=3, timestampWithHelper=4)
			const timestampWithHelperCell = n8n.ndv.outputPanel.getTbodyCell(0, 4);

			// Check that timestampWithHelper field (using .toDateTime()) has the correct value
			await expect(timestampWithHelperCell).toContainText('23/10/2025');
		});
	},
);
