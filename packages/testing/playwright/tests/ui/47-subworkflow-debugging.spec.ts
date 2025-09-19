import { test, expect } from '../../fixtures/base';

const WORKFLOW_FILE = 'Subworkflow-debugging-execute-workflow.json';

test.describe('Subworkflow debugging', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow(WORKFLOW_FILE);

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(11);
		await n8n.canvas.clickZoomToFitButton();

		await n8n.canvas.clickExecuteWorkflowButton();
	});

	test.describe('can inspect sub executed workflow', () => {
		test('(Run once with all items/ Wait for Sub-workflow completion) (default behavior)', async ({
			n8n,
		}) => {
			await n8n.canvas.openNode('Execute Workflow with param');

			await expect(n8n.ndv.outputPanel.getItemsCount()).toContainText('2 items, 1 sub-execution');
			await expect(n8n.ndv.outputPanel.getRelatedExecutionLink()).toContainText(
				'View sub-execution',
			);
			await expect(n8n.ndv.outputPanel.getRelatedExecutionLink()).toHaveAttribute('href', /.+/);

			await expect(n8n.ndv.outputPanel.getTableHeaders()).toHaveCount(2);
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toHaveText('world Natalie Moore');
		});

		test('(Run once for each item/ Wait for Sub-workflow completion) param1', async ({ n8n }) => {
			await n8n.canvas.openNode('Execute Workflow with param1');

			await expect(n8n.ndv.outputPanel.getItemsCount()).toContainText('2 items, 2 sub-execution');
			await expect(n8n.ndv.outputPanel.getRelatedExecutionLink()).not.toBeAttached();

			await expect(n8n.ndv.outputPanel.getTableHeaders()).toHaveCount(3);
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0).locator('a')).toHaveAttribute(
				'href',
				/.+/,
			);
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 1)).toHaveText('world Natalie Moore');
		});

		test('(Run once with all items/ Wait for Sub-workflow completion) param2', async ({ n8n }) => {
			await n8n.canvas.openNode('Execute Workflow with param2');

			await expect(n8n.ndv.outputPanel.getItemsCount()).not.toBeAttached();
			await expect(n8n.ndv.outputPanel.getRelatedExecutionLink()).toContainText(
				'View sub-execution',
			);
			await expect(n8n.ndv.outputPanel.getRelatedExecutionLink()).toHaveAttribute('href', /.+/);

			await expect(n8n.ndv.outputPanel.getRunSelectorInput()).toHaveValue(
				'2 of 2 (3 items, 1 sub-execution)',
			);
			await expect(n8n.ndv.outputPanel.getTableHeaders()).toHaveCount(6);
			await expect(n8n.ndv.outputPanel.getTableHeader(0)).toHaveText('uid');
			await expect(n8n.ndv.outputPanel.getTableRows()).toHaveCount(4);
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 1)).toContainText('Jon_Ebert@yahoo.com');

			await n8n.ndv.changeOutputRunSelector('1 of 2 (2 items, 1 sub-execution)');
			await expect(n8n.ndv.outputPanel.getRunSelectorInput()).toHaveValue(
				'1 of 2 (2 items, 1 sub-execution)',
			);
			await expect(n8n.ndv.outputPanel.getTableHeaders()).toHaveCount(6);
			await expect(n8n.ndv.outputPanel.getTableHeader(0)).toHaveText('uid');
			await expect(n8n.ndv.outputPanel.getTableRows()).toHaveCount(3);
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 1)).toContainText('Terry.Dach@hotmail.com');
		});

		test('(Run once for each item/ Wait for Sub-workflow completion) param3', async ({ n8n }) => {
			await n8n.canvas.openNode('Execute Workflow with param3');

			await expect(n8n.ndv.outputPanel.getRunSelectorInput()).toHaveValue(
				'2 of 2 (3 items, 3 sub-executions)',
			);
			await expect(n8n.ndv.outputPanel.getTableHeaders()).toHaveCount(7);
			await expect(n8n.ndv.outputPanel.getTableHeader(1)).toHaveText('uid');
			await expect(n8n.ndv.outputPanel.getTableRows()).toHaveCount(4);
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0).locator('a')).toHaveAttribute(
				'href',
				/.+/,
			);
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 2)).toContainText('Jon_Ebert@yahoo.com');

			await n8n.ndv.changeOutputRunSelector('1 of 2 (2 items, 2 sub-executions)');
			await expect(n8n.ndv.outputPanel.getRunSelectorInput()).toHaveValue(
				'1 of 2 (2 items, 2 sub-executions)',
			);
			await expect(n8n.ndv.outputPanel.getTableHeaders()).toHaveCount(7);
			await expect(n8n.ndv.outputPanel.getTableHeader(1)).toHaveText('uid');
			await expect(n8n.ndv.outputPanel.getTableRows()).toHaveCount(3);

			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0).locator('a')).toHaveAttribute(
				'href',
				/.+/,
			);
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 2)).toContainText('Terry.Dach@hotmail.com');
		});
	});
});
