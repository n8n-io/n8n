import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'NDV Paired Items',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		// TODO(CET-1206): engine v2 does not add the links that a Code node leaves out of its output, so the editor cannot pair the items behind it.
		test('maps paired input and output items @engine:v2-pending', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('multi-branch-data-transform.json');
			await n8n.canvas.clickZoomToFitButton();

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await n8n.canvas.openNode('Sort');

			await expect(n8n.ndv.inputPanel.get()).toContainText('6 items');
			await expect(n8n.ndv.outputPanel.get()).toContainText('6 items');

			await n8n.ndv.inputPanel.switchDisplayMode('table');
			await n8n.ndv.outputPanel.switchDisplayMode('table');

			// input to output
			const inputTableRow1 = n8n.ndv.inputPanel.getTableRow(1);
			await expect(inputTableRow1).toBeVisible();
			await expect(inputTableRow1).toHaveAttribute('data-test-id', 'hovering-item');

			// Move the cursor to simulate hover behavior
			await inputTableRow1.hover();
			await expect(n8n.ndv.outputPanel.getTableRow(4)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await n8n.ndv.inputPanel.getTableRow(2).hover();
			await expect(n8n.ndv.outputPanel.getTableRow(2)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await n8n.ndv.inputPanel.getTableRow(3).hover();
			await expect(n8n.ndv.outputPanel.getTableRow(6)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			// output to input
			await n8n.ndv.outputPanel.getTableRow(1).hover();
			await expect(n8n.ndv.inputPanel.getTableRow(4)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await n8n.ndv.outputPanel.getTableRow(4).hover();
			await expect(n8n.ndv.inputPanel.getTableRow(1)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await n8n.ndv.outputPanel.getTableRow(2).hover();
			await expect(n8n.ndv.inputPanel.getTableRow(2)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await n8n.ndv.outputPanel.getTableRow(6).hover();
			await expect(n8n.ndv.inputPanel.getTableRow(3)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await n8n.ndv.outputPanel.getTableRow(1).hover();
			await expect(n8n.ndv.inputPanel.getTableRow(4)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);
		});

		// Engine v2 runs a node that two branches feed once, so the node shows one run, not one for each branch.
		test('maps paired input and output items based on selected input node @engine:v1-only', async ({
			n8n,
		}) => {
			await n8n.start.fromImportedWorkflow('multi-branch-data-transform.json');
			await n8n.canvas.clickZoomToFitButton();
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
			await n8n.canvas.openNode('Set2');

			await expect(n8n.ndv.inputPanel.get()).toContainText('6 items');
			await expect(n8n.ndv.outputPanel.getRunSelectorInput()).toHaveValue('2 of 2 (6 items)');

			await n8n.ndv.inputPanel.switchDisplayMode('table');
			await n8n.ndv.outputPanel.switchDisplayMode('table');

			// Default hover state should have first item from input node highlighted
			const hoveringItem = n8n.ndv.inputPanel.getHoveringItems();
			await expect(hoveringItem).toContainText('1111');
			await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('1111');

			// Select different input node and check that the hover state is updated
			await n8n.ndv.selectInputNode('Set1');
			await expect(hoveringItem).toContainText('1000');

			// Hover on input item and verify output hover state
			await n8n.ndv.inputPanel.getTableCellByText('1000').hover();
			await expect(n8n.ndv.outputPanel.getHoveringItems()).toContainText('1000');
			await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('1000');

			// Switch back to Sort input
			await n8n.ndv.selectInputNode('Sort');
			await n8n.ndv.changeOutputRunSelector('1 of 2 (6 items)');

			await expect(hoveringItem).toContainText('1111');
			await n8n.ndv.inputPanel.getTableCellByText('1111').hover();
			await expect(n8n.ndv.outputPanel.getHoveringItems()).toContainText('1111');
			await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('1111');
		});

		// Engine v2 runs Set2 once, though two branches feed it. So Set3 shows one run, not two.
		test('maps paired input and output items based on selected run @engine:v1-only', async ({
			n8n,
		}) => {
			await n8n.start.fromImportedWorkflow('multi-branch-data-transform.json');
			await n8n.canvas.clickZoomToFitButton();
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
			await n8n.canvas.openNode('Set3');

			await n8n.ndv.inputPanel.switchDisplayMode('table');
			await n8n.ndv.outputPanel.switchDisplayMode('table');

			// Start from linked state
			await n8n.ndv.ensureOutputRunLinking(true);
			await n8n.ndv.inputPanel.getTbodyCell(0, 0).click(); // remove tooltip

			await expect(n8n.ndv.inputPanel.getRunSelectorInput()).toHaveValue('2 of 2 (6 items)');
			await expect(n8n.ndv.outputPanel.getRunSelectorInput()).toHaveValue('2 of 2 (6 items)');

			await n8n.ndv.changeOutputRunSelector('1 of 2 (6 items)');
			await expect(n8n.ndv.inputPanel.getRunSelectorInput()).toHaveValue('1 of 2 (6 items)');
			await expect(n8n.ndv.outputPanel.getRunSelectorInput()).toHaveValue('1 of 2 (6 items)');

			await expect(n8n.ndv.inputPanel.getTableRow(1)).toContainText('1111');
			await expect(n8n.ndv.inputPanel.getTableRow(1)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await expect(n8n.ndv.outputPanel.getTableRow(1)).toContainText('1111');
			await n8n.ndv.outputPanel.getTableRow(1).hover();

			await expect(n8n.ndv.outputPanel.getTableRow(3)).toContainText('4444');
			await n8n.ndv.outputPanel.getTableRow(3).hover();

			await expect(n8n.ndv.inputPanel.getTableRow(3)).toContainText('4444');
			await expect(n8n.ndv.inputPanel.getTableRow(3)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await n8n.ndv.changeOutputRunSelector('2 of 2 (6 items)');

			await expect(n8n.ndv.inputPanel.getTableRow(1)).toContainText('1000');
			await n8n.ndv.inputPanel.getTableRow(1).hover();

			await expect(n8n.ndv.outputPanel.getTableRow(1)).toContainText('1000');
			await expect(n8n.ndv.outputPanel.getTableRow(1)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await expect(n8n.ndv.outputPanel.getTableRow(3)).toContainText('2000');
			await n8n.ndv.outputPanel.getTableRow(3).hover();

			await expect(n8n.ndv.inputPanel.getTableRow(3)).toContainText('2000');
			await expect(n8n.ndv.inputPanel.getTableRow(3)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);
		});

		// Engine v2 runs a node that two branches feed once, so the node shows one run, not one for each branch.
		test('can pair items between input and output across branches and runs @engine:v1-only', async ({
			n8n,
		}) => {
			await n8n.start.fromImportedWorkflow('multi-branch-data-transform.json');
			await n8n.canvas.clickZoomToFitButton();
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
			await n8n.canvas.openNode('IF');

			await n8n.ndv.inputPanel.switchDisplayMode('table');
			await n8n.ndv.outputPanel.switchDisplayMode('table');

			// Switch to False Branch
			await n8n.ndv.outputPanel.getBranchTab('False Branch (2 items)').click();
			await expect(n8n.ndv.outputPanel.getTableRow(1)).toContainText('8888');
			await n8n.ndv.outputPanel.getTableRow(1).hover();

			await expect(n8n.ndv.inputPanel.getTableRow(5)).toContainText('8888');
			await expect(n8n.ndv.inputPanel.getTableRow(5)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await expect(n8n.ndv.outputPanel.getTableRow(2)).toContainText('9999');
			await n8n.ndv.outputPanel.getTableRow(2).hover();

			await expect(n8n.ndv.inputPanel.getTableRow(6)).toContainText('9999');
			await expect(n8n.ndv.inputPanel.getTableRow(6)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await n8n.ndv.close();

			await n8n.canvas.openNode('Set5');

			// Switch to True Branch for input
			await n8n.ndv.inputPanel.getBranchTab('True Branch').click();

			await n8n.ndv.changeOutputRunSelector('(2 items)');
			await expect(n8n.ndv.outputPanel.getTableRow(1)).toContainText('8888');
			await n8n.ndv.outputPanel.getTableRow(1).hover();

			// Should not have matching hover state when branches don't match
			const hoveringItems = n8n.ndv.inputPanel.getHoveringItems();
			await expect(hoveringItems).toHaveCount(0);

			await expect(n8n.ndv.inputPanel.getTableRow(1)).toContainText('1111');
			await n8n.ndv.inputPanel.getTableRow(1).hover();
			const outputHoveringItems = n8n.ndv.outputPanel.getHoveringItems();
			await expect(outputHoveringItems).toHaveCount(0);

			// Switch to False Branch
			await n8n.ndv.inputPanel.getBranchTab('False Branch').click();
			await expect(n8n.ndv.inputPanel.getTableRow(1)).toContainText('8888');
			await n8n.ndv.inputPanel.getTableRow(1).hover();

			await n8n.ndv.changeOutputRunSelector('(4 items)');
			await expect(n8n.ndv.outputPanel.getTableRow(1)).toContainText('1111');
			await n8n.ndv.outputPanel.getTableRow(1).hover();

			await n8n.ndv.changeOutputRunSelector('(2 items)');
			await expect(n8n.ndv.inputPanel.getTableRow(1)).toContainText('8888');
			await n8n.ndv.inputPanel.getTableRow(1).hover();
			await expect(n8n.ndv.outputPanel.getHoveringItems()).toContainText('8888');
		});

		// TODO(CET-1206): engine v2 does not add the links that a Code node leaves out of its output.
		test('should auto-fix pairedItem when multiple inputs create single output @engine:v2-pending', async ({
			n8n,
		}) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_ndv_paired_item_single_output.json');
			await n8n.canvas.openNode('Use paired item');
			await n8n.ndv.execute();

			await expect(n8n.ndv.getNodeRunErrorMessage()).toBeHidden();
			await expect(n8n.ndv.outputPanel.get()).toContainText('Jay Gatsby');
		});

		test('can resolve expression with paired item in multi-input node @engine:v2', async ({
			n8n,
		}) => {
			await n8n.start.fromImportedWorkflow('expression_with_paired_item_in_multi_input_node.json');

			await n8n.canvas.clickZoomToFitButton();

			const PINNED_DATA = [
				{
					id: 'abc',
					historyId: 'def',
					messages: [
						{
							id: 'abc',
						},
					],
				},
				{
					id: 'abc',
					historyId: 'def',
					messages: [
						{
							id: 'abc',
						},
						{
							id: 'abc',
						},
						{
							id: 'abc',
						},
					],
				},
				{
					id: 'abc',
					historyId: 'def',
					messages: [
						{
							id: 'abc',
						},
					],
				},
			];

			await n8n.canvas.openNode('Get thread details1');
			await n8n.ndv.setPinnedData(PINNED_DATA);
			await n8n.ndv.close();

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
			await n8n.canvas.openNode('Switch1');
			await n8n.ndv.execute();

			await expect(n8n.ndv.getParameterExpressionPreviewOutput()).toContainText('1');

			await n8n.ndv.getInlineExpressionEditorInput().click();
			await expect(n8n.ndv.getInlineExpressionEditorPreview()).toContainText('1');

			// Select next item
			await n8n.ndv.expressionSelectNextItem();
			await expect(n8n.ndv.getInlineExpressionEditorPreview()).toContainText('3');

			// Select next item again
			await n8n.ndv.expressionSelectNextItem();
			await expect(n8n.ndv.getInlineExpressionEditorPreview()).toContainText('1');

			// Next button should be disabled
			await expect(n8n.ndv.getInlineExpressionEditorItemNextButton()).toBeDisabled();
		});
	},
);
