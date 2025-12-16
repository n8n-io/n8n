import { MANUAL_TRIGGER_NODE_NAME } from '../../../config/constants';
import { expect, test } from '../../../fixtures/base';
import { setupGitRepo } from '../../../utils/source-control-helper';

test.use({
	addContainerCapability: {
		sourceControl: true,
	},
});

test.describe('Source Control Operations @capability:source-control', () => {
	let repoUrl: string;

	test.beforeEach(async ({ n8n, n8nContainer }) => {
		await n8n.api.enableFeature('sourceControl');
		repoUrl = await setupGitRepo(n8n, n8nContainer);

		await n8n.goHome();
		// Enable features required for project workflows and moving resources
		await n8n.api.enableFeature('variables');
		await n8n.api.enableFeature('folders');
		await n8n.api.setMaxTeamProjectsQuota(-1);
	});

	test.describe('Push Operations', () => {
		test('should connect to Git and push a new workflow', async ({ n8n }) => {
			// create workflow
			const workflow = await n8n.api.workflows.createWorkflow({
				name: 'Test Workflow',
				nodes: [],
				connections: {},
				active: false,
			});
			await n8n.navigate.toWorkflow(workflow.id);

			// check modal
			await n8n.sourceControlPushModal.open();
			await expect(n8n.sourceControlPushModal.getModal()).toBeVisible();
			const isWorkflowsTabSelected = await n8n.sourceControlPushModal.isWorkflowsTabSelected();
			expect(isWorkflowsTabSelected).toBe(true);

			// check selected workflow
			const workflowInModal = n8n.sourceControlPushModal.getFileInModal('Test Workflow');
			await expect(workflowInModal).toBeVisible();
			const workflowCheckbox = n8n.sourceControlPushModal.getFileCheckboxByName('Test Workflow');
			await expect(workflowCheckbox).toBeChecked();

			// push
			await n8n.sourceControlPushModal.push('Add test workflow with manual trigger');
			await n8n.notifications.waitForNotificationAndClose('Pushed successfully');

			// check no changes to commit
			await n8n.sourceControlPushModal.open();
			await n8n.notifications.waitForNotificationAndClose('No changes to commit');
		});

		test('should push all resource types together', async ({ n8n }) => {
			// variables and tags
			await n8n.api.variables.createTestVariable();
			await n8n.api.tags.create('test-tag');

			// projects and folders
			const project = await n8n.api.projects.createProject('Test Project');
			const folderA = await n8n.api.projects.createFolder(project.id, 'Folder A');
			const folderB = await n8n.api.projects.createFolder(project.id, 'Folder B', folderA.id);

			// workflows
			await n8n.api.workflows.createInProject(project.id, {
				name: 'Workflow in Folder A',
				folder: folderA.id,
			});
			await n8n.api.workflows.createInProject(project.id, {
				name: 'Workflow in Folder B',
				folder: folderB.id,
			});
			await n8n.api.workflows.createInProject(project.id, {
				name: 'Root Workflow',
			});

			// credentials
			await n8n.api.credentials.createCredential({
				name: 'Credential in Project 1',
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId: project.id,
			});

			// Open push modal
			await n8n.navigate.toHome();
			await n8n.sourceControlPushModal.open();
			await expect(n8n.sourceControlPushModal.getModal()).toBeVisible();

			// check notice
			const notice = n8n.sourceControlPushModal.getNotice();
			await expect(notice).toBeVisible();
			expect(await notice.textContent()).toContain('Variables');
			expect(await notice.textContent()).toContain('Projects');
			expect(await notice.textContent()).toContain('Folders');
			expect(await notice.textContent()).toContain('Tags');

			// check workflows
			await n8n.sourceControlPushModal.selectWorkflowsTab();
			await expect(n8n.sourceControlPushModal.getFileInModal('Workflow in Folder A')).toBeVisible();
			await expect(n8n.sourceControlPushModal.getFileInModal('Workflow in Folder B')).toBeVisible();
			await expect(n8n.sourceControlPushModal.getFileInModal('Root Workflow')).toBeVisible();
			await n8n.sourceControlPushModal.selectAllFilesInModal();

			// check credentials
			await n8n.sourceControlPushModal.selectCredentialsTab();
			await expect(
				n8n.sourceControlPushModal.getFileInModal('Credential in Project 1'),
			).toBeVisible();
			await n8n.sourceControlPushModal.selectAllFilesInModal();

			// Push all resources
			await n8n.sourceControlPushModal.push('Add all resource types');
			await n8n.notifications.waitForNotificationAndClose('Pushed successfully');
		});

		test('should push modifications and deletions', async ({ n8n }) => {
			// create resources
			const project = await n8n.api.projects.createProject('Test Project');
			const workflow = await n8n.api.workflows.createInProject(project.id, {
				name: 'Workflow to Modify',
			});
			const credential = await n8n.api.credentials.createCredential({
				name: 'Credential to Delete',
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId: project.id,
			});

			// Push it to Git first
			await n8n.navigate.toHome();
			await n8n.sourceControlPushModal.open();
			await expect(n8n.sourceControlPushModal.getModal()).toBeVisible();

			await n8n.sourceControlPushModal.selectWorkflowsTab();
			await n8n.sourceControlPushModal.selectAllFilesInModal();

			await n8n.sourceControlPushModal.push('new resources');
			await n8n.notifications.waitForNotificationAndClose('Pushed successfully');

			// modify and delete resources
			await n8n.navigate.toWorkflow(workflow.id);
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.saveWorkflow();

			await n8n.api.credentials.deleteCredential(credential.id);

			await n8n.sourceControlPushModal.open();
			await expect(n8n.sourceControlPushModal.getModal()).toBeVisible();

			await n8n.sourceControlPushModal.selectWorkflowsTab();
			await expect(n8n.sourceControlPushModal.getFileInModal('Workflow to Modify')).toBeVisible();
			await expect(
				n8n.sourceControlPushModal.getStatusBadge('Workflow to Modify', 'Modified'),
			).toBeVisible();

			await n8n.sourceControlPushModal.selectCredentialsTab();
			await expect(n8n.sourceControlPushModal.getFileInModal('Credential to Delete')).toBeVisible();
			await expect(
				n8n.sourceControlPushModal.getStatusBadge('Credential to Delete', 'Deleted'),
			).toBeVisible();

			// push
			await n8n.sourceControlPushModal.push('Modify workflow and delete credential');
			await n8n.notifications.waitForNotificationAndClose('Pushed successfully');

			// check no changes to commit
			await n8n.sourceControlPushModal.open();
			await n8n.notifications.waitForNotificationAndClose('No changes to commit');
		});

		test('should push of selected resources', async ({ n8n }) => {
			// Create multiple workflows
			const workflowA = await n8n.api.workflows.createWorkflow({
				name: 'Workflow A',
				nodes: [],
				connections: {},
				active: false,
			});

			await n8n.api.workflows.createWorkflow({
				name: 'Workflow B',
				nodes: [],
				connections: {},
				active: false,
			});

			await n8n.api.workflows.createWorkflow({
				name: 'Workflow C',
				nodes: [],
				connections: {},
				active: false,
			});

			// check resources
			await n8n.sourceControlPushModal.open();
			await expect(n8n.sourceControlPushModal.getModal()).toBeVisible();
			await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow A')).toBeVisible();
			await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow B')).toBeVisible();
			await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow C')).toBeVisible();

			// select
			await n8n.sourceControlPushModal.selectFile('Workflow A');
			await n8n.sourceControlPushModal.selectFile('Workflow C');

			await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow A')).toBeChecked();
			await expect(
				n8n.sourceControlPushModal.getFileCheckboxByName('Workflow B'),
			).not.toBeChecked();
			await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow C')).toBeChecked();

			// push
			await n8n.sourceControlPushModal.push('Push workflows A and C');
			await n8n.notifications.waitForNotificationAndClose('Pushed successfully');

			// modify workflow A
			await n8n.navigate.toWorkflow(workflowA.id);
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.saveWorkflow();

			// check resources
			await n8n.sourceControlPushModal.open();
			await expect(n8n.sourceControlPushModal.getModal()).toBeVisible();

			await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow A')).toBeVisible();
			await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow B')).toBeVisible();
			await expect(
				n8n.sourceControlPushModal.getFileCheckboxByName('Workflow C'),
			).not.toBeVisible();

			await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow A')).toBeChecked();
			await expect(
				n8n.sourceControlPushModal.getFileCheckboxByName('Workflow B'),
			).not.toBeChecked();

			// push
			await n8n.sourceControlPushModal.push('Push workflow A');
			await n8n.notifications.waitForNotificationAndClose('Pushed successfully');

			// Verify no more changes
			await n8n.sourceControlPushModal.open();
			await n8n.notifications.waitForNotificationAndClose('No changes to commit');
		});
	});

	test.describe('Pull Operations', () => {
		test('should pull new resources from remote', async ({ n8n }) => {
			// create project
			const project = await n8n.api.projects.createProject('Test Project');
			const folder = await n8n.api.projects.createFolder(project.id, 'Test Folder');
			// create folder
			const workflow = await n8n.api.workflows.createInProject(project.id, {
				name: 'Pull Test Workflow',
				folder: folder.id,
			});
			const credential = await n8n.api.credentials.createCredential({
				name: 'Test Credential',
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId: project.id,
			});
			const variable = await n8n.api.variables.createVariable({
				key: 'PULL_TEST_VARIABLE',
				value: 'test-value',
				projectId: project.id,
			});

			const tag = await n8n.api.tags.create('pull-test-tag');

			// push all resources
			await n8n.api.sourceControl.pushWorkFolder({
				commitMessage: 'Initial push',
			});

			// disconnect
			await n8n.api.sourceControl.disconnect();

			// delete created resources
			await n8n.api.projects.deleteProject(project.id); // This also deletes all related resources
			await n8n.api.tags.delete(tag.id);

			// re-connect to source control
			await n8n.api.sourceControl.connect({ repositoryUrl: repoUrl });

			// pull all resources
			await n8n.navigate.toHome();
			await n8n.sourceControlPullModal.open();
			await n8n.notifications.waitForNotificationAndClose('Pulled successfully');

			// check that all new resources are pulled
			await n8n.navigate.toProjectSettings(project.id);
			await expect(n8n.projectSettings.getTitle()).toHaveText(project.name);

			await n8n.projectTabs.clickCredentialsTab();
			await expect(n8n.credentials.cards.getCredential(credential.name)).toBeVisible();

			await n8n.projectTabs.clickVariablesTab();
			await expect(n8n.variables.getVariableRow(variable.key)).toBeVisible();

			await n8n.projectTabs.clickWorkflowsTab();
			await expect(n8n.workflows.cards.getFolder(folder.name)).toBeVisible();

			await n8n.workflows.cards.openFolder(folder.name);
			await expect(n8n.workflows.cards.getWorkflow(workflow.name)).toBeVisible();

			await n8n.workflows.cards.clickWorkflowCard(workflow.name);
			await n8n.canvas.openTagManagerModal();
			await expect(n8n.canvas.tagsManagerModal.getModal()).toBeVisible();
			await expect(n8n.canvas.tagsManagerModal.getTable()).toBeVisible();
			await expect(n8n.canvas.tagsManagerModal.getTable().getByText('pull-test-tag')).toBeVisible();
		});

		test('should pull modified and deleted resources from remote', async ({ n8n }) => {
			const project = await n8n.api.projects.createProject('Pull Test Project');
			const workflow = await n8n.api.workflows.createInProject(project.id, {
				name: 'Pull Test Workflow',
			});

			// push
			await n8n.api.sourceControl.pushWorkFolder({
				commitMessage: 'Initial push',
			});

			// disconnect
			await n8n.api.sourceControl.disconnect();

			// modify workflow name
			await n8n.navigate.toWorkflow(workflow.id);
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.saveWorkflow();

			// add new workflow
			await n8n.api.workflows.createInProject(project.id, {
				name: 'New Workflow',
			});

			// re-connect to source control
			await n8n.api.sourceControl.connect({ repositoryUrl: repoUrl });

			// pull
			await n8n.navigate.toHome();
			await n8n.sourceControlPullModal.open();
			await expect(n8n.sourceControlPullModal.getModal()).toBeVisible();

			// check that conflicts are detected
			await n8n.sourceControlPullModal.selectWorkflowsTab();
			await expect(n8n.sourceControlPullModal.getFileInModal('New Workflow')).toBeVisible();
			await expect(
				n8n.sourceControlPullModal.getStatusBadge('New Workflow', 'Deleted'),
			).toBeVisible();

			await expect(n8n.sourceControlPullModal.getFileInModal('Pull Test Workflow')).toBeVisible();
			await expect(
				n8n.sourceControlPullModal.getStatusBadge('Pull Test Workflow', 'Modified'),
			).toBeVisible();

			// click on pull & override button
			await n8n.sourceControlPullModal.getPullAndOverrideButton().click();
			await n8n.notifications.waitForNotificationAndClose('Pulled successfully');

			// check pulled resources
			await n8n.navigate.toWorkflow(workflow.id);
			await expect(n8n.canvas.getWorkflowName()).toHaveAttribute('title', 'Pull Test Workflow');
			await n8n.navigate.toHome();
			await expect(n8n.workflows.cards.getWorkflow('New Workflow')).toBeHidden();
		});
	});
});
