import { test, expect } from '../../fixtures/base';

test.describe('ADO-2362 ADO-2350 NDV Prevent clipping long parameters and scrolling to expression', () => {
	test('should show last parameters and open at scroll top of parameters', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test-workflow-with-long-parameters.json');

		await n8n.canvas.openNode('Schedule Trigger');

		await expect(n8n.ndv.getInlineExpressionEditorInput().first()).toBeVisible();

		await n8n.ndv.close();

		await n8n.canvas.openNode('Edit Fields1');

		await expect(n8n.ndv.getInputLabel().nth(0)).toContainText('Mode');
		await expect(n8n.ndv.getInputLabel().nth(0)).toBeVisible();

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveCount(2);

		await expect(n8n.ndv.getInlineExpressionEditorInput().nth(0)).toHaveText('should be visible!');
		await expect(n8n.ndv.getInlineExpressionEditorInput().nth(0)).toBeVisible();

		await expect(n8n.ndv.getInlineExpressionEditorInput().nth(1)).toHaveText('not visible');
		await expect(n8n.ndv.getInlineExpressionEditorInput().nth(1)).toBeVisible();

		await n8n.ndv.close();
		await n8n.canvas.openNode('Schedule Trigger');

		await expect(n8n.ndv.getNthParameter(0)).toContainText(
			'This workflow will run on the schedule ',
		);
		await expect(n8n.ndv.getInputLabel().nth(0)).toBeVisible();

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveCount(2);

		await expect(n8n.ndv.getInlineExpressionEditorInput().nth(0)).toHaveText('should be visible');
		await expect(n8n.ndv.getInlineExpressionEditorInput().nth(0)).toBeVisible();

		await expect(n8n.ndv.getInlineExpressionEditorInput().nth(1)).toHaveText('not visible');
		await expect(n8n.ndv.getInlineExpressionEditorInput().nth(1)).not.toBeInViewport();

		await n8n.ndv.close();
		await n8n.canvas.openNode('Slack');

		await expect(n8n.ndv.getCredentialsLabel()).toBeVisible();

		await expect(n8n.ndv.getInlineExpressionEditorInput().nth(0)).toHaveText('should be visible');
		await expect(n8n.ndv.getInlineExpressionEditorInput().nth(0)).toBeVisible();

		await expect(n8n.ndv.getInlineExpressionEditorInput().nth(1)).toHaveText('not visible');
		await expect(n8n.ndv.getInlineExpressionEditorInput().nth(1)).not.toBeInViewport();
	});

	test('NODE-1272 ensure expressions scrolled to top, not middle', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test-workflow-with-long-parameters.json');

		await n8n.canvas.openNode('With long expression');

		await expect(n8n.ndv.getInlineExpressionEditorInput().nth(0)).toBeVisible();

		const editor = n8n.ndv.getInlineExpressionEditorInput().nth(0);
		await expect(editor.locator('.cm-line').nth(0)).toHaveText('1 visible!');
		await expect(editor.locator('.cm-line').nth(0)).toBeVisible();
		await expect(editor.locator('.cm-line').nth(6)).toHaveText('7 not visible!');
		await expect(editor.locator('.cm-line').nth(6)).not.toBeInViewport();
	});
});
