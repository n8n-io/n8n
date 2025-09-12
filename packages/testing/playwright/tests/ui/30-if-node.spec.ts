import { IF_NODE_NAME } from '../../config/constants';
import { test, expect } from '../../fixtures/base';

const FILTER_PARAM_NAME = 'conditions';

test.describe('If Node (filter component)', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should be able to create and delete multiple conditions', async ({ n8n }) => {
		await n8n.canvas.addNode(IF_NODE_NAME, { closeNDV: false });

		// Default state
		await expect(n8n.ndv.getFilterComponent(FILTER_PARAM_NAME)).toBeVisible();
		await expect(n8n.ndv.getFilterConditions(FILTER_PARAM_NAME)).toHaveCount(1);
		await expect(
			n8n.ndv.getFilterConditionOperator(FILTER_PARAM_NAME).locator('input'),
		).toHaveValue('is equal to');

		// Add
		await n8n.ndv.addFilterCondition(FILTER_PARAM_NAME);
		await n8n.ndv.getFilterConditionLeft(FILTER_PARAM_NAME, 0).locator('input').fill('first left');
		await n8n.ndv.getFilterConditionLeft(FILTER_PARAM_NAME, 1).locator('input').fill('second left');
		await n8n.ndv.addFilterCondition(FILTER_PARAM_NAME);
		await expect(n8n.ndv.getFilterConditions(FILTER_PARAM_NAME)).toHaveCount(3);

		// Delete
		await n8n.ndv.removeFilterCondition(FILTER_PARAM_NAME, 0);
		await expect(n8n.ndv.getFilterConditions(FILTER_PARAM_NAME)).toHaveCount(2);
		await expect(n8n.ndv.getFilterConditionLeft(FILTER_PARAM_NAME, 0).locator('input')).toHaveValue(
			'second left',
		);
		await n8n.ndv.removeFilterCondition(FILTER_PARAM_NAME, 1);
		await expect(n8n.ndv.getFilterConditions(FILTER_PARAM_NAME)).toHaveCount(1);
	});

	test('should correctly evaluate conditions', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_filter.json');

		await n8n.canvas.clickExecuteWorkflowButton();

		await n8n.canvas.openNode('Then');
		await expect(n8n.ndv.outputPanel.get()).toContainText('3 items');
		await n8n.ndv.close();

		await n8n.canvas.openNode('Else');
		await expect(n8n.ndv.outputPanel.get()).toContainText('1 item');
	});
});
