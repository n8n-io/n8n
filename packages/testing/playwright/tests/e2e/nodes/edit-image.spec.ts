import { expect, test } from '../../../fixtures/base';

test.describe('Edit Image Node', () => {
	test('Can resize an image', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.importWorkflow('test_edit_image_resize.json', 'EditImage Resize');
		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(
			n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
		).toBeVisible({ timeout: 30000 });
	});

	test('Can chain all operations (blur, border, resize, rotate, crop, information)', async ({
		n8n,
	}) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.importWorkflow('test_edit_image_all_operations.json', 'EditImage All Ops');
		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(
			n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
		).toBeVisible({ timeout: 30000 });
	});

	test('Can convert image to BMP format', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.importWorkflow('test_edit_image_bmp.json', 'EditImage BMP');
		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(
			n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
		).toBeVisible({ timeout: 30000 });
	});
});
