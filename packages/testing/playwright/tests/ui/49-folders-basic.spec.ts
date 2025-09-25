import { test, expect } from '../../fixtures/base';

test.describe('Folders - Basic Operations', () => {
	test('should create folder from the workflows page using addResource dropdown', async ({
		n8n,
	}) => {
		await n8n.start.fromNewProject();
		const folderName = await n8n.workflows.addFolder();
		await expect(n8n.workflows.cards.getFolder(folderName)).toBeVisible();
		await expect(n8n.workflows.cards.getFolders()).toHaveCount(1);
	});

	test('should create folder from inside a folder', async ({ n8n }) => {
		const projectId = await n8n.start.fromNewProject();
		const folder = await n8n.api.projects.createFolder(projectId);
		const folderName = folder.name;
		await n8n.workflows.cards.openFolder(folderName);
		const childFolderName = await n8n.workflows.addFolder();
		await expect(n8n.workflows.cards.getFolder(childFolderName)).toBeVisible();
	});

	test('should create a folder from breadcrumbs', async ({ n8n }) => {
		const projectId = await n8n.start.fromNewProject();
		const folder = await n8n.api.projects.createFolder(projectId);
		const folderName = folder.name;
		await n8n.workflows.cards.openFolder(folderName);
		// This opens the folder actions menu
		await n8n.workflows.getFolderBreadcrumbsActions().click();

		await n8n.workflows.getFolderBreadcrumbsAction('create').click();
		const childFolderName = 'My Child Folder';
		await n8n.workflows.fillFolderModal(childFolderName);

		await expect(n8n.workflows.cards.getFolder(childFolderName)).toBeVisible();
	});

	test('should crate a folder from the list header button', async ({ n8n }) => {
		const projectId = await n8n.start.fromNewProject();
		await n8n.api.projects.createFolder(projectId);
		await n8n.workflows.addFolderButton().click();
		const childFolderName = 'My Child Folder';
		await n8n.workflows.fillFolderModal(childFolderName);

		await expect(n8n.workflows.cards.getFolder(childFolderName)).toBeVisible();
	});

	test('should create a folder from the card dropdown', async ({ n8n }) => {
		const projectId = await n8n.start.fromNewProject();
		const folder = await n8n.api.projects.createFolder(projectId);
		const folderName = folder.name;
		const folderCard = n8n.workflows.cards.getFolder(folderName);
		await n8n.workflows.cards.openCardActions(folderCard);
		await n8n.workflows.cards.getCardAction('create').click();
		const childFolderName = 'My Child Folder';
		await n8n.workflows.fillFolderModal(childFolderName);
		await expect(n8n.workflows.cards.getFolder(childFolderName)).toBeVisible();
	});
});
