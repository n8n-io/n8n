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
			await expect(outputPanel.getActiveDisplayMode()).toHaveAttribute(
				'data-test-id',
				'radio-button-html',
			);
			await expect(outputPanel.getHtmlPreviewHeading('Item 1')).toBeVisible();
			// The HTML view shows only the first item
			await expect(outputPanel.getHtmlPreviewHeadings()).toHaveCount(1);
		});

		test('should show the HTML of the item that matches the search', async ({ n8n }) => {
			const { outputPanel } = n8n.ndv;

			// Item 27 is on page 2, so this also checks that search covers every item, not only the visible page
			await n8n.ndv.searchOutputData('Item 27');

			await expect(outputPanel.getActiveDisplayMode()).toHaveAttribute(
				'data-test-id',
				'radio-button-html',
			);
			await expect(outputPanel.getHtmlPreviewHeading('Item 27')).toBeVisible();
			// The HTML view shows only the first item
			await expect(outputPanel.getHtmlPreviewHeadings()).toHaveCount(1);
		});

		test('should fall back to a built-in display mode on a node that does not generate HTML', async ({
			n8n,
		}) => {
			const { outputPanel } = n8n.ndv;
			await expect(outputPanel.getActiveDisplayMode()).toHaveAttribute(
				'data-test-id',
				'radio-button-html',
			);

			await n8n.ndv.clickBackToCanvasButton();
			await n8n.canvas.openNode('Create items');

			await expect(outputPanel.getDisplayModeOption('html')).toHaveCount(0);
			await expect(outputPanel.getActiveDisplayMode()).toBeVisible();
			await expect(outputPanel.getActiveDisplayMode()).not.toHaveAttribute(
				'data-test-id',
				'radio-button-html',
			);
			// Every built-in mode shows the field name, so this fails for a blank panel
			await expect(outputPanel.getItemsCountText('30 items')).toBeVisible();
			await expect(outputPanel.getDataContainer()).toContainText('name');
			await expect(outputPanel.getNodeErrorMessageHeader()).toBeHidden();
		});
	},
);
