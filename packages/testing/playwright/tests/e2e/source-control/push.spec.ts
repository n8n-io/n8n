import { MANUAL_TRIGGER_NODE_NAME } from '../../../config/constants';
import { expect, test } from '../../../fixtures/base';
import { setupGitRepo } from '../../../utils/source-control-helper';

test.use({
	addContainerCapability: {
		sourceControl: true,
	},
});

test.describe('Push resources to Git @capability:source-control', () => {
	test.beforeEach(async ({ n8n, n8nContainer }) => {
		await n8n.api.enableFeature('sourceControl');
		await setupGitRepo(n8n, n8nContainer);

		await n8n.goHome();
		// Enable features required for project workflows and moving resources
		await n8n.api.enableFeature('variables');
		await n8n.api.enableFeature('folders');
		await n8n.api.setMaxTeamProjectsQuota(-1);
	});

	test('should push a new workflow', async ({ n8n }) => {
		// create workflow
		const workflow = await n8n.api.workflows.createWorkflow({
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			active: false,
		});
		await n8n.navigate.toWorkflow(workflow.id);

		// check modal
		await n8n.sideBar.getSourceControlPushButton().click();
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
		await n8n.sideBar.getSourceControlPushButton().click();
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
		await n8n.sideBar.getSourceControlPushButton().click();
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
		await n8n.sideBar.getSourceControlPushButton().click();
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

		await n8n.sideBar.getSourceControlPushButton().click();
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
		await n8n.sideBar.getSourceControlPushButton().click();
		await n8n.notifications.waitForNotificationAndClose('No changes to commit');
	});

	test('should push selected resources', async ({ n8n }) => {
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
		await n8n.sideBar.getSourceControlPushButton().click();
		await expect(n8n.sourceControlPushModal.getModal()).toBeVisible();
		await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow A')).toBeVisible();
		await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow B')).toBeVisible();
		await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow C')).toBeVisible();

		// select
		await n8n.sourceControlPushModal.selectFile('Workflow A');
		await n8n.sourceControlPushModal.selectFile('Workflow C');

		await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow A')).toBeChecked();
		await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow B')).not.toBeChecked();
		await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow C')).toBeChecked();

		// push
		await n8n.sourceControlPushModal.push('Push workflows A and C');
		await n8n.notifications.waitForNotificationAndClose('Pushed successfully');

		// modify workflow A
		await n8n.navigate.toWorkflow(workflowA.id);
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();

		// check resources
		await n8n.sideBar.getSourceControlPushButton().click();
		await expect(n8n.sourceControlPushModal.getModal()).toBeVisible();

		await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow A')).toBeVisible();
		await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow B')).toBeVisible();
		await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow C')).not.toBeVisible();

		await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow A')).toBeChecked();
		await expect(n8n.sourceControlPushModal.getFileCheckboxByName('Workflow B')).not.toBeChecked();

		// push
		await n8n.sourceControlPushModal.push('Push workflow A');
		await n8n.notifications.waitForNotificationAndClose('Pushed successfully');

		// Verify no more changes
		await n8n.sideBar.getSourceControlPushButton().click();
		await n8n.notifications.waitForNotificationAndClose('No changes to commit');
	});
});
