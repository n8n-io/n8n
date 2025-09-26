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

	test('should navigate from nested folder back to project root via breadcrumbs', async ({
		n8n,
	}) => {
		const projectId = await n8n.start.fromNewProject();
		const rootFolder = await n8n.api.projects.createFolder(projectId);
		const childFolder = await n8n.api.projects.createFolder(
			projectId,
			'Child Folder',
			rootFolder.id,
		);
		const grandChildFolder = await n8n.api.projects.createFolder(
			projectId,
			'Grand Child Folder',
			childFolder.id,
		);

		// Start at the deepest folder
		await n8n.navigate.toFolder(grandChildFolder.id, projectId);

		const breadcrumbs = n8n.page.getByTestId('main-breadcrumbs');

		// Verify we're at the deepest level
		const currentBreadcrumb = breadcrumbs.getByTestId('breadcrumbs-item-current');
		await expect(currentBreadcrumb).toContainText(grandChildFolder.name);

		// Step 1: Verify that hidden item is visible because we're fully collapsed
		const hiddenItemsMenu = n8n.page.getByTestId('hidden-items-menu');
		await expect(hiddenItemsMenu).toBeVisible();
		await hiddenItemsMenu.click();
		await expect(n8n.page.getByTestId(`action-${rootFolder.id}`)).toBeVisible();

		// Step 2: Navigate to child folder (parent of current)
		const grandChildFolderBreadcrumb = breadcrumbs
			.getByTestId('breadcrumbs-item')
			.filter({ hasText: childFolder.name });
		await grandChildFolderBreadcrumb.click();
		await expect(n8n.workflows.cards.getFolder(grandChildFolder.name)).toBeVisible();

		// Step 3: Navigate to child folder
		const childFolderBreadcrumb = breadcrumbs
			.getByTestId('breadcrumbs-item')
			.filter({ hasText: rootFolder.name });
		await childFolderBreadcrumb.click();
		await expect(n8n.workflows.cards.getFolder(childFolder.name)).toBeVisible();

		const homeProjectBreadcrumb = breadcrumbs.getByTestId('home-project');
		await homeProjectBreadcrumb.click();
		await expect(n8n.workflows.cards.getFolder(rootFolder.name)).toBeVisible();
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
});
