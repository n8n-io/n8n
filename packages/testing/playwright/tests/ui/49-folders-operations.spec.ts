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
			await n8n.navigate.toFolder(folder.id, projectId);
			await n8n.workflows.addResource.workflow();
			await n8n.canvas.saveWorkflow();
			await n8n.navigate.toFolder(folder.id, projectId);
			await n8n.breadcrumbs.getFolderBreadcrumbsActionToggle().click();
			await n8n.breadcrumbs.getActionToggleDropdown('delete').click();
			await expect(n8n.workflows.deleteFolderModal()).toBeVisible();
			await expect(n8n.workflows.deleteModalConfirmButton()).toBeDisabled();
		});

		test('should warn before deleting non-empty folder from card dropdown', async ({ n8n }) => {
			const { id: projectId } = await n8n.api.projects.createProject();
			const folder = await n8n.api.projects.createFolder(projectId);
			await n8n.navigate.toFolder(folder.id, projectId);
			await n8n.workflows.addResource.workflow();
			await n8n.canvas.saveWorkflow();
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
			const folderToMoveTo = await n8n.api.projects.createFolder(projectId);
			await n8n.navigate.toFolder(folderToDelete.id, projectId);
			await n8n.workflows.addResource.workflow();
			await n8n.canvas.saveWorkflow();
			// Ok so now we have a workflow in the folder to delete

			// Lets go to the folder to delete, delete it and make sure they are transferred
			await n8n.navigate.toProject(projectId);

			const folderToDeleteCard = n8n.workflows.cards.getFolder(folderToDelete.name);
			await n8n.workflows.cards.openCardActions(folderToDeleteCard);
			await n8n.workflows.cards.getCardAction('delete').click();
			await n8n.workflows.deleteModalTransferRadioButton().click();
			await n8n.workflows.transferFolderDropdown().click();
			await n8n.workflows.transferFolderOption(folderToMoveTo.name).click();
			await n8n.workflows.deleteModalConfirmButton().click();
			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Folder deleted'),
			).toBeVisible();

			await n8n.navigate.toFolder(folderToMoveTo.id, projectId);
			await expect(n8n.workflows.cards.getWorkflows()).toBeVisible();
		});
	});

	test.describe('Move folders and workflows', () => {
		test('should move empty folder to another folder - from folder card action', async ({
			n8n,
		}) => {
			// TODO: Implement
		});

		test('should move folder with contents to another folder - from folder card action', async ({
			n8n,
		}) => {
			// TODO: Implement
		});

		test('should move empty folder to another folder - from list breadcrumbs', async ({ n8n }) => {
			// TODO: Implement
		});

		test('should move folder with contents to another folder - from list dropdown', async ({
			n8n,
		}) => {
			// TODO: Implement
		});

		test('should move folder to project root - from folder card action', async ({ n8n }) => {
			// TODO: Implement
		});

		test('should move workflow from project root to folder', async ({ n8n }) => {
			// TODO: Implement
		});

		test('should move workflow to another folder', async ({ n8n }) => {
			// TODO: Implement
		});
	});
});
