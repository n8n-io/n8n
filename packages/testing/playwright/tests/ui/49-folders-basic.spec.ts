import { test, expect } from '../../fixtures/base';

test.describe('Folders - Basic Operations', () => {
	test.beforeEach(async ({ api }) => {
		await api.enableFeature('sharing');
		await api.enableFeature('folders');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
		await api.setMaxTeamProjectsQuota(-1);
	});

	test('should create folder from the workflows page using addResource dropdown', async ({
		n8n,
	}) => {
		await n8n.start.fromNewProject();
		await n8n.workflows.addResource.folder();
		const folderName = 'My Test Folder';
		await n8n.modal.fillInput(folderName);
		await n8n.modal.clickButton('Create');

		await n8n.notifications.waitForNotification('Folder created');
		await expect(n8n.workflows.resourceCard.getFolderByName(folderName)).toBeVisible();
		await expect(n8n.workflows.resourceCard.getFolderCards()).toHaveCount(1);
	});
});
