import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'NDV HTML display mode',
	{
		annotation: [{ type: 'owner', description: 'Context' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			// A Code node creates 30 items, more than one page, and the HTML node renders one heading for each
			await n8n.start.fromImportedWorkflow('Test_workflow_html_display_mode.json');
			await n8n.canvas.clickExecuteWorkflowButton();
			await n8n.canvas.openNode('HTML');
		});

		test('should select the HTML display mode and show the first item', async ({ n8n }) => {
			const { outputPanel } = n8n.ndv;

			await expect(outputPanel.getDisplayModeOption('html')).toBeVisible();
			await expect(outputPanel.getActiveDisplayMode()).toHaveText('HTML');
			await expect(outputPanel.getHtmlPreviewHeading('Item 1')).toBeVisible();
		});

		test('should show the HTML of the item that matches the search', async ({ n8n }) => {
			const { outputPanel } = n8n.ndv;

			await n8n.ndv.searchOutputData('Item 17');

			await expect(outputPanel.getActiveDisplayMode()).toHaveText('HTML');
			await expect(outputPanel.getHtmlPreviewHeading('Item 17')).toBeVisible();
		});

		test('should fall back to a built-in display mode on a node that does not generate HTML', async ({
			n8n,
		}) => {
			const { outputPanel } = n8n.ndv;
			await expect(outputPanel.getActiveDisplayMode()).toHaveText('HTML');

			await n8n.ndv.clickBackToCanvasButton();
			await n8n.canvas.openNode('Create items');

			await expect(outputPanel.getDisplayModeOption('html')).toHaveCount(0);
			await expect(outputPanel.getActiveDisplayMode()).toBeVisible();
			await expect(outputPanel.getActiveDisplayMode()).not.toHaveText('HTML');
			await expect(outputPanel.getNodeErrorMessageHeader()).toBeHidden();
		});
	},
);
