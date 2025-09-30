import { test, expect } from '../../fixtures/base';

test.describe('Folders - Operations', () => {
	test.describe('Rename and delete folders', () => {
		test('should rename folder from breadcrumb dropdown', async ({ n8n }) => {
			await n8n.start.fromNewProject();
			const folderName = await n8n.workflows.addFolder();
			const folderCard = n8n.workflows.cards.getFolder(folderName);
			await n8n.workflows.cards.openCardActions(folderCard);
			await n8n.workflows.cards.getCardAction('open').click();
			await n8n.breadcrumbs.renameCurrentBreadcrumb('Renamed');
			await n8n.breadcrumbs.getHomeProjectBreadcrumb().click();
			await expect(n8n.workflows.cards.getFolder('Renamed')).toBeVisible();
		});

		test('should rename folder from card dropdown', async ({ n8n }) => {
			await n8n.start.fromNewProject();
			const folderName = await n8n.workflows.addFolder();
			const folderCard = n8n.workflows.cards.getFolder(folderName);
			await n8n.workflows.cards.openCardActions(folderCard);
			await n8n.workflows.cards.getCardAction('rename').click();
			await n8n.workflows.fillFolderModal('Renamed', 'Rename');
			await expect(n8n.workflows.cards.getFolder('Renamed')).toBeVisible();
		});

		test('should delete empty folder from card dropdown', async ({ n8n }) => {
			await n8n.start.fromNewProject();
			const folderName = await n8n.workflows.addFolder();
			await n8n.workflows.cards.deleteFolder(folderName);
			await expect(n8n.workflows.cards.getFolder(folderName)).toBeHidden();
		});

		test('should delete empty folder from breadcrumb dropdown', async ({ n8n }) => {
			await n8n.start.fromNewProject();
			const folderName = await n8n.workflows.addFolder();
			await n8n.workflows.cards.openFolder(folderName);
			await n8n.breadcrumbs.getFolderBreadcrumbsActionToggle().click();
			await n8n.breadcrumbs.getActionToggleDropdown('delete').click();
			await expect(n8n.workflows.cards.getFolder(folderName)).toBeHidden();
		});

		test('should warn before deleting non-empty folder from breadcrumb dropdown', async ({
			n8n,
		}) => {
			const { id: projectId } = await n8n.api.projects.createProject();
			const folder = await n8n.api.projects.createFolder(projectId);
			await n8n.api.workflows.createInProject(projectId, {
				folder: folder.id,
			});
			await n8n.navigate.toFolder(folder.id, projectId);
			await n8n.breadcrumbs.getFolderBreadcrumbsActionToggle().click();
			await n8n.breadcrumbs.getActionToggleDropdown('delete').click();
			await expect(n8n.workflows.deleteFolderModal()).toBeVisible();
			await expect(n8n.workflows.deleteModalConfirmButton()).toBeDisabled();
		});

		test('should warn before deleting non-empty folder from card dropdown', async ({ n8n }) => {
			const { id: projectId } = await n8n.api.projects.createProject();
			const folder = await n8n.api.projects.createFolder(projectId);
			await n8n.api.workflows.createInProject(projectId, {
				folder: folder.id,
			});
			await n8n.navigate.toProject(projectId);
			const folderCard = n8n.workflows.cards.getFolder(folder.name);
			await n8n.workflows.cards.openCardActions(folderCard);
			await n8n.workflows.cards.getCardAction('delete').click();
			await expect(n8n.workflows.deleteFolderModal()).toBeVisible();
			await expect(n8n.workflows.deleteModalConfirmButton()).toBeDisabled();
		});

		test('should transfer contents when deleting non-empty folder - from card dropdown', async ({
			n8n,
		}) => {
			const { id: projectId } = await n8n.api.projects.createProject();
			const folderToDelete = await n8n.api.projects.createFolder(projectId);
			await n8n.api.workflows.createInProject(projectId, {
				folder: folderToDelete.id,
			});
			const destinationFolder = await n8n.api.projects.createFolder(projectId);

			await n8n.navigate.toProject(projectId);

			const folderCard = n8n.workflows.cards.getFolder(folderToDelete.name);
			await n8n.workflows.cards.openCardActions(folderCard);
			await n8n.workflows.cards.getCardAction('delete').click();
			await n8n.workflows.deleteModalTransferRadioButton().click();
			await n8n.workflows.transferFolderDropdown().click();
			await n8n.workflows.transferFolderOption(destinationFolder.name).click();
			await n8n.workflows.deleteModalConfirmButton().click();

			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Folder deleted'),
			).toBeVisible();

			await n8n.navigate.toFolder(destinationFolder.id, projectId);
			await expect(n8n.workflows.cards.getWorkflows()).toBeVisible();
		});
	});

	test.describe('Move folders and workflows', () => {
		test('should move empty folder to another folder - from folder card action', async ({
			n8n,
		}) => {
			const { id: projectId } = await n8n.api.projects.createProject();
			const sourceFolder = await n8n.api.projects.createFolder(projectId);
			const destinationFolder = await n8n.api.projects.createFolder(projectId);

			await n8n.navigate.toProject(projectId);

			const sourceFolderCard = n8n.workflows.cards.getFolder(sourceFolder.name);
			await n8n.workflows.cards.openCardActions(sourceFolderCard);
			await n8n.workflows.cards.getCardAction('move').click();

			await expect(n8n.workflows.moveFolderModal()).toBeVisible();
			await n8n.workflows.moveFolderDropdown().click();
			await n8n.workflows.moveFolderOption(destinationFolder.name).click();
			await n8n.workflows.moveFolderConfirmButton().click();

			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Successfully moved folder'),
			).toBeVisible();

			await n8n.navigate.toFolder(destinationFolder.id, projectId);
			await expect(n8n.workflows.cards.getFolder(sourceFolder.name)).toBeVisible();
		});

		test('should move folder with contents to another folder - from folder card action', async ({
			n8n,
		}) => {
			const { id: projectId } = await n8n.api.projects.createProject();
			const sourceFolder = await n8n.api.projects.createFolder(projectId);
			const destinationFolder = await n8n.api.projects.createFolder(projectId);

			await n8n.api.workflows.createInProject(projectId, {
				folder: sourceFolder.id,
			});

			await n8n.navigate.toProject(projectId);

			const sourceFolderCard = n8n.workflows.cards.getFolder(sourceFolder.name);
			await n8n.workflows.cards.openCardActions(sourceFolderCard);
			await n8n.workflows.cards.getCardAction('move').click();

			await expect(n8n.workflows.moveFolderModal()).toBeVisible();
			await n8n.workflows.moveFolderDropdown().click();
			await n8n.workflows.moveFolderOption(destinationFolder.name).click();
			await n8n.workflows.moveFolderConfirmButton().click();

			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Successfully moved folder'),
			).toBeVisible();

			await n8n.navigate.toFolder(destinationFolder.id, projectId);
			await expect(n8n.workflows.cards.getFolder(sourceFolder.name)).toBeVisible();
			await n8n.workflows.cards.openFolder(sourceFolder.name);
			await expect(n8n.workflows.cards.getWorkflows()).toBeVisible();
		});

		test('should move empty folder to another folder - from list breadcrumbs', async ({ n8n }) => {
			const { id: projectId } = await n8n.api.projects.createProject();
			const sourceFolder = await n8n.api.projects.createFolder(projectId);
			const destinationFolder = await n8n.api.projects.createFolder(projectId);

			await n8n.navigate.toFolder(sourceFolder.id, projectId);
			await n8n.breadcrumbs.getFolderBreadcrumbsActionToggle().click();
			await n8n.breadcrumbs.getActionToggleDropdown('move').click();

			await expect(n8n.workflows.moveFolderModal()).toBeVisible();
			await n8n.workflows.moveFolderDropdown().click();
			await n8n.workflows.moveFolderOption(destinationFolder.name).click();
			await n8n.workflows.moveFolderConfirmButton().click();

			await n8n.navigate.toFolder(destinationFolder.id, projectId);
			await expect(n8n.workflows.cards.getFolder(sourceFolder.name)).toBeVisible();
		});

		test('should move folder with contents to another folder - from list dropdown', async ({
			n8n,
		}) => {
			const { id: projectId } = await n8n.api.projects.createProject();
			const sourceFolder = await n8n.api.projects.createFolder(projectId);
			const destinationFolder = await n8n.api.projects.createFolder(projectId);

			await n8n.api.workflows.createInProject(projectId, {
				folder: sourceFolder.id,
			});

			await n8n.navigate.toFolder(sourceFolder.id, projectId);
			await n8n.breadcrumbs.getFolderBreadcrumbsActionToggle().click();
			await n8n.breadcrumbs.getActionToggleDropdown('move').click();

			await expect(n8n.workflows.moveFolderModal()).toBeVisible();
			await n8n.workflows.moveFolderDropdown().click();
			await n8n.workflows.moveFolderOption(destinationFolder.name).click();
			await n8n.workflows.moveFolderConfirmButton().click();

			await n8n.navigate.toFolder(destinationFolder.id, projectId);
			await expect(n8n.workflows.cards.getFolder(sourceFolder.name)).toBeVisible();
			await n8n.workflows.cards.openFolder(sourceFolder.name);
			await expect(n8n.workflows.cards.getWorkflows()).toBeVisible();
		});

		test('should move folder to project root - from folder card action', async ({ n8n }) => {
			const project = await n8n.api.projects.createProject();
			const parentFolder = await n8n.api.projects.createFolder(project.id);
			const childFolderName = 'Child Folder';
			const childFolder = await n8n.api.projects.createFolder(
				project.id,
				childFolderName,
				parentFolder.id,
			);

			await n8n.navigate.toFolder(parentFolder.id, project.id);

			const childFolderCard = n8n.workflows.cards.getFolder(childFolder.name);
			await n8n.workflows.cards.openCardActions(childFolderCard);
			await n8n.workflows.cards.getCardAction('move').click();

			await expect(n8n.workflows.moveFolderModal()).toBeVisible();
			await n8n.workflows.moveFolderDropdown().click();

			const rootOption = 'No folder (project root)';
			await n8n.workflows.moveFolderOption(rootOption).click();
			await n8n.workflows.moveFolderConfirmButton().click();

			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Successfully moved folder'),
			).toBeVisible();

			await n8n.navigate.toProject(project.id);
			await expect(n8n.workflows.cards.getFolder(childFolder.name)).toBeVisible();
		});

		test('should move workflow from project root to folder', async ({ n8n }) => {
			const { id: projectId } = await n8n.api.projects.createProject();
			const destinationFolder = await n8n.api.projects.createFolder(projectId);

			await n8n.api.workflows.createInProject(projectId);

			await n8n.navigate.toProject(projectId);

			const workflowCard = n8n.workflows.cards.getWorkflows().first();
			await n8n.workflows.cards.openCardActions(workflowCard);
			await n8n.workflows.cards.getCardAction('moveToFolder').click();

			await expect(n8n.workflows.moveFolderModal()).toBeVisible();
			await n8n.workflows.moveFolderDropdown().click();
			await n8n.workflows.moveFolderOption(destinationFolder.name).click();
			await n8n.workflows.moveFolderConfirmButton().click();

			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Successfully moved workflow'),
			).toBeVisible();

			await n8n.navigate.toFolder(destinationFolder.id, projectId);
			await expect(n8n.workflows.cards.getWorkflows()).toBeVisible();
		});

		test('should move workflow to another folder', async ({ n8n }) => {
			const { id: projectId } = await n8n.api.projects.createProject();
			const sourceFolder = await n8n.api.projects.createFolder(projectId);
			const destinationFolder = await n8n.api.projects.createFolder(projectId);

			const { name: workflowName } = await n8n.api.workflows.createInProject(projectId, {
				folder: sourceFolder.id,
			});

			await n8n.navigate.toFolder(sourceFolder.id, projectId);

			const workflowCard = n8n.workflows.cards.getWorkflow(workflowName);
			await n8n.workflows.cards.openCardActions(workflowCard);
			await n8n.workflows.cards.getCardAction('moveToFolder').click();

			await expect(n8n.workflows.moveFolderModal()).toBeVisible();
			await n8n.workflows.moveFolderDropdown().click();
			await n8n.workflows.moveFolderOption(destinationFolder.name).click();
			await n8n.workflows.moveFolderConfirmButton().click();

			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Successfully moved workflow'),
			).toBeVisible();

			await n8n.navigate.toFolder(destinationFolder.id, projectId);
			await expect(n8n.workflows.cards.getWorkflow(workflowName)).toBeVisible();

			await n8n.navigate.toFolder(sourceFolder.id, projectId);
			await expect(n8n.workflows.cards.getWorkflow(workflowName)).toBeHidden();
		});
	});
});
