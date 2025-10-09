import { test, expect } from '../../fixtures/base';

test.describe('Manual partial execution', () => {
	test('should not execute parent nodes with no run data', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('manual-partial-execution.json');
		await n8n.canvas.clickZoomToFitButton();

		await n8n.canvas.openNode('Edit Fields');

		await n8n.ndv.clickExecuteStep();

		await n8n.ndv.close();

		await n8n.canvas.openNode('Webhook1');

		await expect(n8n.ndv.getNodeRunSuccessIndicator()).toBeHidden();
		await expect(n8n.ndv.getNodeRunTooltipIndicator()).toBeHidden();
		await expect(n8n.ndv.outputPanel.getRunSelector()).toBeHidden();
	});

	test.describe('partial execution v2', () => {
		test('should execute from the first dirty node up to the current node', async ({ n8n }) => {
			const nodeNames = ['A', 'B', 'C'];

			await n8n.navigate.toWorkflow('new');
			await n8n.partialExecutionComposer.enablePartialExecutionV2();
			await n8n.start.fromImportedWorkflow('Test_workflow_partial_execution_v2.json');
			await n8n.canvas.clickZoomToFitButton();

			await n8n.partialExecutionComposer.executeFullWorkflowAndVerifySuccess(nodeNames);

			const beforeText = await n8n.partialExecutionComposer.captureNodeOutputData('A');

			await n8n.partialExecutionComposer.modifyNodeToTriggerStaleState('B');

			await n8n.partialExecutionComposer.verifyNodeStatesAfterChange(['A', 'C'], ['B']);

			await n8n.partialExecutionComposer.performPartialExecutionAndVerifySuccess('C', nodeNames);

			await n8n.partialExecutionComposer.openNodeForDataVerification('A');

			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toHaveText(beforeText);
		});
	});
});
