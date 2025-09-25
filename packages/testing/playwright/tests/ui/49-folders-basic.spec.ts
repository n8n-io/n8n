import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';

const FOLDER_NOTIFICATION = 'Folder created';

// I'm going to move this into a composer.. just not sure which one yet!
async function createFolder(n8n: n8nPage) {
	const folderName = 'My Test Folder';
	await n8n.workflows.addResource.folder();
	await n8n.modal.fillInput(folderName);
	await n8n.modal.clickButton('Create');
	await n8n.notifications.closeNotificationByText(FOLDER_NOTIFICATION);
	return folderName;
}

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
		const folderName = await createFolder(n8n);
		await expect(n8n.workflows.cards.getFolder(folderName)).toBeVisible();
		await expect(n8n.workflows.cards.getFolders()).toHaveCount(1);
	});

	test('should create folder from inside a folder', async ({ n8n }) => {
		await n8n.start.fromNewProject();
		const folderName = await createFolder(n8n);
		await n8n.workflows.cards.openFolder(folderName);
		const childFolderName = await createFolder(n8n);
		await expect(n8n.workflows.cards.getFolder(childFolderName)).toBeVisible();
	});
});
