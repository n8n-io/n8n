import { test, expect } from '../../fixtures/base';

test.describe('ADO-2230 NDV Pagination Reset', () => {
	test('should reset pagination if data size changes to less than current page', async ({
		n8n,
	}) => {
		await n8n.start.fromImportedWorkflow('NDV-debug-generate-data.json');

		await n8n.canvas.openNode('DebugHelper');
		await n8n.ndv.execute();
		await n8n.notifications.quickCloseAll();

		const outputPagination = n8n.ndv.getOutputPagination();
		await expect(outputPagination).toBeVisible();

		await expect(n8n.ndv.getOutputPaginationPages()).toHaveCount(5);

		await expect(n8n.ndv.getOutputTbodyCell(0, 0)).not.toBeEmpty();
		const firstPageContent = await n8n.ndv.getOutputPageContent(0, 0);

		await n8n.ndv.navigateToOutputPage(4);

		const fourthPageContent = await n8n.ndv.getOutputPageContent(0, 0);
		expect(fourthPageContent).not.toBe(firstPageContent);

		await n8n.ndv.setParameterInputValue('randomDataCount', '20');

		await n8n.ndv.execute();
		await n8n.notifications.quickCloseAll();

		await expect(n8n.ndv.getOutputPaginationPages()).toHaveCount(2);

		await expect(n8n.ndv.getOutputTbodyCell(0, 0)).not.toBeEmpty();
	});
});
