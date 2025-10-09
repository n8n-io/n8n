import { test, expect } from '../../fixtures/base';

test.describe('Folders - Basic Operations', () => {
	const FOLDER_CREATED_NOTIFICATION = 'Folder created';
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

	test('should create a folder from the list header button', async ({ n8n }) => {
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

	test('should navigate from nested folder back to project root via breadcrumbs', async ({
		n8n,
	}) => {
		const projectId = await n8n.start.fromNewProject();
		const parentFolder = await n8n.api.projects.createFolder(projectId);
		const childFolder = await n8n.api.projects.createFolder(
			projectId,
			'Child Folder',
			parentFolder.id,
		);
		const grandChildFolder = await n8n.api.projects.createFolder(
			projectId,
			'Grand Child Folder',
			childFolder.id,
		);

		await n8n.navigate.toFolder(grandChildFolder.id, projectId);
		await expect(n8n.breadcrumbs.getCurrentBreadcrumb()).toContainText(grandChildFolder.name);

		// Hidden breadcrumb should be visible because not all breadcrumbs can fit in the UI
		await n8n.breadcrumbs.getHiddenBreadcrumbs().click();
		await expect(n8n.breadcrumbs.getActionToggleDropdown(parentFolder.id)).toBeVisible();

		await n8n.breadcrumbs.getBreadcrumb(childFolder.name).click();
		await expect(n8n.workflows.cards.getFolder(grandChildFolder.name)).toBeVisible();

		await n8n.breadcrumbs.getBreadcrumb(parentFolder.name).click();
		await expect(n8n.workflows.cards.getFolder(childFolder.name)).toBeVisible();

		await n8n.breadcrumbs.getHomeProjectBreadcrumb().click();
		await expect(n8n.workflows.cards.getFolder(parentFolder.name)).toBeVisible();
	});

	test('should find nested folders through search from project root', async ({ n8n }) => {
		const projectId = await n8n.start.fromNewProject();
		const rootFolder = await n8n.api.projects.createFolder(projectId, 'Root Test Folder');
		const childFolder = await n8n.api.projects.createFolder(
			projectId,
			'Child Test Folder',
			rootFolder.id,
		);
		const grandChildFolder = await n8n.api.projects.createFolder(
			projectId,
			'Grand Child Test Folder',
			childFolder.id,
		);

		// Start at project root
		await n8n.navigate.toProject(projectId);

		// Search for "Grand Child" from root - should find the deeply nested folder
		await n8n.workflows.search('Grand Child');

		// Verify the grandchild folder appears in search results
		await expect(n8n.workflows.cards.getFolder(grandChildFolder.name)).toBeVisible();

		// Verify other folders are filtered out
		await expect(n8n.workflows.cards.getFolder(rootFolder.name)).toBeHidden();
		await expect(n8n.workflows.cards.getFolder(childFolder.name)).toBeHidden();

		// Clear search and verify all folders are shown again
		await n8n.workflows.clearSearch();
		await expect(n8n.workflows.cards.getFolder(rootFolder.name)).toBeVisible();
		await expect(n8n.workflows.cards.getFolder(childFolder.name)).toBeHidden(); // Child is inside root
		await expect(n8n.workflows.cards.getFolder(grandChildFolder.name)).toBeHidden(); // Grandchild is inside child
	});

	test('should create workflow in a folder', async ({ n8n }) => {
		const { name: projectName, id: projectId } = await n8n.api.projects.createProject();
		const folder = await n8n.api.projects.createFolder(projectId);
		await n8n.navigate.toFolder(folder.id, projectId);
		await n8n.workflows.addResource.workflow();
		await n8n.canvas.saveWorkflow();
		const successMessage = `Workflow successfully created in "${projectName}", within "${folder.name}"`;
		await expect(n8n.notifications.getNotificationByTitleOrContent(successMessage)).toBeVisible();
		await n8n.navigate.toFolder(folder.id, projectId);
		await expect(n8n.workflows.cards.getWorkflows()).toBeVisible();
	});

	test('should not create folders with invalid names in the UI', async ({ n8n }) => {
		await n8n.start.fromNewProject();
		const invalidNames = ['folder[test]', 'folder/test'];
		const errorMessage = 'Folder name cannot contain the following characters';
		const emptyErrorMessage = 'Folder name cannot be empty';
		const tooLongErrorMessage = 'Folder name cannot be longer than 128 characters';
		const dotsErrorMessage = 'Folder name cannot contain only dots';
		await n8n.workflows.addResource.folder();

		for (const invalidName of invalidNames) {
			await n8n.modal.fillInput(invalidName);
			await expect(n8n.modal.container.getByText(errorMessage, { exact: false })).toBeVisible();
		}

		await n8n.modal.fillInput('');
		await expect(n8n.modal.container.getByText(emptyErrorMessage)).toBeVisible();

		await n8n.modal.fillInput('a'.repeat(129));
		await expect(n8n.modal.container.getByText(tooLongErrorMessage)).toBeVisible();

		await n8n.modal.fillInput('...');
		await expect(n8n.modal.container.getByText(dotsErrorMessage)).toBeVisible();
	});

	test('should navigate to a folder using card actions', async ({ n8n }) => {
		const projectId = await n8n.start.fromNewProject();
		const folder = await n8n.api.projects.createFolder(projectId);
		const folderName = folder.name;
		const folderCard = n8n.workflows.cards.getFolder(folderName);
		await n8n.workflows.cards.openCardActions(folderCard);
		await n8n.workflows.cards.getCardAction('open').click();
		await expect(n8n.breadcrumbs.getCurrentBreadcrumb()).toContainText(folderName);
	});

	test('should navigate to a folder using notification', async ({ n8n }) => {
		await n8n.start.fromNewProject();
		const folderName = await n8n.workflows.addFolder();
		await n8n.notifications
			.getNotificationByTitleOrContent(FOLDER_CREATED_NOTIFICATION)
			.getByText('Open folder')
			.click();
		await expect(n8n.breadcrumbs.getCurrentBreadcrumb()).toContainText(folderName);
	});
});
