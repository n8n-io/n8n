import { nanoid } from 'nanoid';

import { test, expect } from '../../fixtures/base';

test.describe('Folders - Advanced Operations', () => {
	test.describe.configure({ mode: 'serial' });
	test.describe('Duplicate workflows', () => {
		test('should duplicate workflow within root folder from personal projects', async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProject();
			const workflowName = `Test Workflow ${nanoid(8)}`;
			await n8n.workflows.addResource.workflow();
			await n8n.canvas.setWorkflowName(workflowName);

			await n8n.navigate.toProject(projectId);

			await n8n.workflows.cards.getWorkflow(workflowName).waitFor({ state: 'visible' });
			const workflowCard = n8n.workflows.cards.getWorkflow(workflowName);
			await n8n.workflows.cards.openCardActions(workflowCard);
			await n8n.workflows.cards.getCardAction('duplicate').click();
			await n8n.modal.clickButton('Duplicate');

			const duplicatedName = `${workflowName} copy`;
			await n8n.navigate.toProject(projectId);
			await expect(n8n.workflows.cards.getWorkflow(duplicatedName)).toBeVisible();
		});

		test('should duplicate workflow within a folder from personal projects', async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProject();
			const folderName = await n8n.api.projects.createFolder(projectId);
			await n8n.navigate.toFolder(folderName.id, projectId);

			await n8n.workflows.addResource.workflow();
			const workflowName = `Folder Workflow ${nanoid(8)}`;
			await n8n.canvas.setWorkflowName(workflowName);

			await n8n.navigate.toProject(projectId);
			await n8n.workflows.cards.openFolder(folderName.name);

			const workflowCard = n8n.workflows.cards.getWorkflow(workflowName);
			await n8n.workflows.cards.openCardActions(workflowCard);
			await n8n.workflows.cards.getCardAction('duplicate').click();

			const duplicatedName = `${workflowName} copy`;
			await n8n.modal.clickButton('Duplicate');
			await n8n.navigate.toFolder(folderName.id, projectId);
			await expect(n8n.workflows.cards.getWorkflow(duplicatedName)).toBeVisible();
		});

		test('should duplicate workflow within a folder from overview', async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProject();
			const folderName = await n8n.api.projects.createFolder(projectId);

			await n8n.navigate.toFolder(folderName.id, projectId);
			await n8n.workflows.addResource.workflow();
			const workflowName = `Overview Test ${nanoid(8)}`;
			await n8n.canvas.setWorkflowName(workflowName);

			await n8n.navigate.toFolder(folderName.id, projectId);

			const workflowCard = n8n.workflows.cards.getWorkflow(workflowName);
			await n8n.workflows.cards.openCardActions(workflowCard);
			await n8n.workflows.cards.getCardAction('duplicate').click();

			const duplicatedName = `${workflowName} copy`;
			await n8n.modal.clickButton('Duplicate');
			await n8n.navigate.toFolder(folderName.id, projectId);
			await expect(n8n.workflows.cards.getWorkflow(duplicatedName)).toBeVisible();
		});

		test('should duplicate workflow within a folder from workflow page', async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProject();
			const folderName = await n8n.workflows.addFolder();

			await n8n.workflows.cards.openFolder(folderName);
			await n8n.workflows.addResource.workflow();
			const workflowName = `Settings Test ${nanoid(8)}`;
			await n8n.canvas.setWorkflowName(workflowName);

			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await n8n.workflowSettingsModal.getDuplicateMenuItem().click();
			await n8n.modal.clickButton('Duplicate');

			const duplicatedName = `${workflowName} copy`;
			await n8n.navigate.toProject(projectId);
			await n8n.workflows.cards.openFolder(folderName);
			await expect(n8n.workflows.cards.getWorkflow(duplicatedName)).toBeVisible();
		});
	});

	test.describe('Drag and drop', () => {
		test('should drag and drop folders into folders', async ({ n8n }) => {
			const { id: projectId } = await n8n.api.projects.createProject('Drag and Drop Test');
			await n8n.navigate.toProject(projectId);
			const targetFolder = await n8n.api.projects.createFolder(projectId, 'Drag me');
			const destinationFolder = await n8n.api.projects.createFolder(
				projectId,
				'Folder Destination',
			);

			const sourceFolderCard = n8n.workflows.cards.getFolder(targetFolder.name);
			const destinationFolderCard = n8n.workflows.cards.getFolder(destinationFolder.name);

			await n8n.interactions.precisionDragToTarget(sourceFolderCard, destinationFolderCard);

			await expect(
				n8n.notifications.getNotificationByTitleOrContent(
					`${targetFolder.name} has been moved to ${destinationFolder.name}`,
				),
			).toBeVisible();

			await expect(n8n.workflows.cards.getFolders()).toHaveCount(1);

			await n8n.workflows.cards.openFolder(destinationFolder.name);
			await expect(n8n.workflows.cards.getFolder(targetFolder.name)).toBeVisible();
		});

		test('should drag and drop folders into project root breadcrumb', async ({ n8n }) => {
			const project = await n8n.api.projects.createProject('Drag to root test');
			await n8n.navigate.toProject(project.id);
			const parentFolder = await n8n.api.projects.createFolder(project.id, 'Parent Folder');
			const targetFolder = await n8n.api.projects.createFolder(
				project.id,
				'To Project root',
				parentFolder.id,
			);

			await n8n.navigate.toFolder(parentFolder.id, project.id);

			const sourceFolderCard = n8n.workflows.cards.getFolder(targetFolder.name);
			const projectBreadcrumb = n8n.breadcrumbs.getHomeProjectBreadcrumb();

			await n8n.interactions.precisionDragToTarget(sourceFolderCard, projectBreadcrumb);

			await expect(
				n8n.notifications.getNotificationByTitleOrContent(
					`${targetFolder.name} has been moved to ${project.name}`,
				),
			).toBeVisible();

			await expect(n8n.workflows.cards.getFolders()).toHaveCount(0);

			await n8n.navigate.toProject(project.id);
			await expect(n8n.workflows.cards.getFolder(targetFolder.name)).toBeVisible();
		});

		test('should drag and drop workflows into folders', async ({ n8n }) => {
			const project = await n8n.api.projects.createProject('Drag and Drop WF Test');
			await n8n.navigate.toProject(project.id);
			const destinationFolder = await n8n.api.projects.createFolder(
				project.id,
				'Workflow Destination',
			);

			await n8n.workflows.addResource.workflow();
			const workflowName = `Drag Drop Test ${nanoid(8)}`;
			await n8n.canvas.setWorkflowName(workflowName);

			await n8n.navigate.toProject(project.id);

			const sourceWorkflowCard = n8n.workflows.cards.getWorkflow(workflowName);
			const destinationFolderCard = n8n.workflows.cards.getFolder(destinationFolder.name);

			await n8n.interactions.precisionDragToTarget(sourceWorkflowCard, destinationFolderCard);

			await expect(
				n8n.notifications.getNotificationByTitleOrContent(
					`${workflowName} has been moved to ${destinationFolder.name}`,
				),
			).toBeVisible();

			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(0);

			await n8n.workflows.cards.openFolder(destinationFolder.name);
			await expect(n8n.workflows.cards.getWorkflow(workflowName)).toBeVisible();
		});
	});
});
