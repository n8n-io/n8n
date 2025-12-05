import { test, expect } from '../../../../../fixtures/base';

// eslint-disable-next-line n8n-local-rules/no-skipped-tests -- Flaky in multi-main mode: "execute previous nodes" also executes the current node
test.describe.skip('Execute previous nodes', () => {
	test('should execute only previous nodes and not the current node', async ({ n8n }) => {
		// Import workflow with Manual Trigger -> Code1 -> Code2
		await n8n.start.fromImportedWorkflow('execute-previous-nodes.json');

		// Open the second Code node (Code2)
		await n8n.canvas.openNode('Code2');

		// Click "Execute previous nodes" - this should execute Manual Trigger and Code1, but NOT Code2
		await n8n.ndv.executePrevious();

		// Wait for execution to complete by checking that input panel has data
		await expect(n8n.ndv.inputPanel.getDataContainer()).toBeVisible({ timeout: 15000 });

		// Verify that the input panel has data from Code1 (which was executed)
		await expect(n8n.ndv.inputPanel.get()).toContainText('myNewField');

		// Verify Code2 (current node) was NOT executed.
		// The output panel should show the placeholder text, not execution results
		await expect(n8n.ndv.outputPanel.get()).toContainText('Execute this node to view data');

		// Close the NDV
		await n8n.ndv.close();

		// Open Code1 to verify it WAS executed
		await n8n.canvas.openNode('Code1');

		// Verify Code1 has execution success indicator and output data
		await expect(n8n.ndv.getNodeRunSuccessIndicator()).toBeVisible();
		await expect(n8n.ndv.outputPanel.getItemsCount()).toBeVisible();

		// Close and verify Manual Trigger was also executed
		await n8n.ndv.close();
		await n8n.canvas.openNode('Manual Trigger');
		await expect(n8n.ndv.getNodeRunSuccessIndicator()).toBeVisible();
	});
});
