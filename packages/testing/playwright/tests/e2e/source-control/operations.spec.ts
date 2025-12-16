import type { N8NStack } from 'n8n-containers/n8n-test-container-creation';
import { addGiteaSSHKey } from 'n8n-containers/n8n-test-container-gitea';

import { MANUAL_TRIGGER_NODE_NAME } from '../../../config/constants';
import { expect, test } from '../../../fixtures/base';
import type { n8nPage } from '../../../pages/n8nPage';

test.use({
	addContainerCapability: {
		sourceControl: true,
	},
});

async function setupSourceControl(n8n: n8nPage) {
	await n8n.api.enableFeature('sourceControl');
	// This is needed because the DB reset wipes out source control preferences
	await n8n.page.request.post('/rest/source-control/preferences', {
		data: {
			connectionType: 'ssh',
			keyGeneratorType: 'ed25519',
		},
	});
}

async function connectToSourceControl({
	n8n,
	n8nContainer,
}: { n8n: n8nPage; n8nContainer: N8NStack }): Promise<void> {
	await setupSourceControl(n8n);

	const preferencesResponse = await n8n.page.request.get('/rest/source-control/preferences');
	const preferences = await preferencesResponse.json();
	const sshKey = preferences.data.publicKey;

	const sourceControlContainer = n8nContainer.containers.find((c) => c.getName().includes('gitea'));
	expect(sourceControlContainer).toBeDefined();
	await addGiteaSSHKey(sourceControlContainer!, 'n8n-source-control', sshKey);

	await n8n.navigate.toEnvironments();
	await n8n.settingsEnvironment.fillRepoUrl('ssh://git@gitea/giteaadmin/n8n-test-repo.git');
	await n8n.settingsEnvironment.getConnectButton().click();

	await expect(n8n.settingsEnvironment.getDisconnectButton()).toBeVisible();
	await expect(n8n.settingsEnvironment.getBranchSelect()).toBeVisible();
}

test.describe('Source Control Operations @capability:source-control', () => {
	test.describe.configure({ mode: 'serial' });

	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
		// Enable features required for project workflows and moving resources
		await n8n.api.enableFeature('variables');
		await n8n.api.enableFeature('folders');
		await n8n.api.setMaxTeamProjectsQuota(-1);
	});

	test.describe('Push Operations', () => {
		test('should connect to Git and push a new workflow', async ({ n8n, n8nContainer }) => {
			await connectToSourceControl({ n8n, n8nContainer });

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
		test('should pull new and modified resources from remote', async ({ n8n, n8nContainer }) => {
			await connectToSourceControl({ n8n, n8nContainer });

			// Create initial resources and push them
			const workflowToPush = await n8n.api.workflows.createWorkflow({
				name: 'Workflow to Modify',
				nodes: [],
				connections: {},
				active: false,
			});

			const credentialToPush = await n8n.api.credentials.createCredential({
				name: 'Credential to Keep',
				type: 'notionApi',
				data: { apiKey: '1234567890' },
			});

			await n8n.api.variables.createTestVariable('INITIAL_VAR', 'initial_value');

			// Push all resources
			await n8n.sourceControlPushModal.open();
			await expect(n8n.sourceControlPushModal.getModal()).toBeVisible();
			await n8n.sourceControlPushModal.selectWorkflowsTab();
			await n8n.sourceControlPushModal.selectAllFilesInModal();
			await n8n.sourceControlPushModal.selectCredentialsTab();
			await n8n.sourceControlPushModal.selectAllFilesInModal();
			await n8n.sourceControlPushModal.push('Initial push');
			await n8n.notifications.waitForNotificationAndClose('Pushed successfully');

			// Disconnect from source control
			await n8n.navigate.toEnvironments();
			await n8n.settingsEnvironment.getDisconnectButton().click();
			await expect(n8n.settingsEnvironment.getConnectButton()).toBeVisible();

			// Simulate "remote" changes by modifying local resources
			// 1. Modify the workflow
			await n8n.navigate.toWorkflow(workflowToPush.id);
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.saveWorkflow();

			// 2. Create a new workflow
			await n8n.api.workflows.createWorkflow({
				name: 'New Remote Workflow',
				nodes: [],
				connections: {},
				active: false,
			});

			// 3. Create a new credential
			await n8n.api.credentials.createCredential({
				name: 'New Remote Credential',
				type: 'notionApi',
				data: { apiKey: '0987654321' },
			});

			// 4. Create a new variable
			await n8n.api.variables.createTestVariable('NEW_VAR', 'new_value');

			// 5. Delete the original credential
			await n8n.api.credentials.deleteCredential(credentialToPush.id);

			// Push these "remote" changes
			await n8n.navigate.toEnvironments();
			await n8n.settingsEnvironment.getConnectButton().click();
			await expect(n8n.settingsEnvironment.getDisconnectButton()).toBeVisible();

			await n8n.sourceControlPushModal.open();
			await expect(n8n.sourceControlPushModal.getModal()).toBeVisible();
			await n8n.sourceControlPushModal.selectWorkflowsTab();
			await n8n.sourceControlPushModal.selectAllFilesInModal();
			await n8n.sourceControlPushModal.selectCredentialsTab();
			await n8n.sourceControlPushModal.selectAllFilesInModal();
			await n8n.sourceControlPushModal.push('Remote changes');
			await n8n.notifications.waitForNotificationAndClose('Pushed successfully');

			// Disconnect again and reset database to simulate pulling from another instance
			await n8n.navigate.toEnvironments();
			await n8n.settingsEnvironment.getDisconnectButton().click();
			await expect(n8n.settingsEnvironment.getConnectButton()).toBeVisible();

			// Reset database to clear local state (simulates a fresh instance)
			await n8n.api.resetDatabase();

			// Navigate home after reset
			await n8n.goHome();
			await n8n.api.enableFeature('variables');
			await n8n.api.enableFeature('folders');
			await n8n.api.setMaxTeamProjectsQuota(-1);

			// Reconnect to source control
			await connectToSourceControl({ n8n, n8nContainer });

			// Open pull modal to see remote changes
			await n8n.sourceControlPullModal.open();
			await expect(n8n.sourceControlPullModal.getModal()).toBeVisible();

			// Verify modified workflow appears
			await n8n.sourceControlPullModal.selectWorkflowsTab();
			await expect(n8n.sourceControlPullModal.getFileInModal('Workflow to Modify')).toBeVisible();
			await expect(
				n8n.sourceControlPullModal.getStatusBadge('Workflow to Modify', 'New'),
			).toBeVisible();

			// Verify new workflow appears
			await expect(n8n.sourceControlPullModal.getFileInModal('New Remote Workflow')).toBeVisible();
			await expect(
				n8n.sourceControlPullModal.getStatusBadge('New Remote Workflow', 'New'),
			).toBeVisible();

			// Verify credentials
			await n8n.sourceControlPullModal.selectCredentialsTab();
			await expect(
				n8n.sourceControlPullModal.getFileInModal('New Remote Credential'),
			).toBeVisible();
			await expect(
				n8n.sourceControlPullModal.getStatusBadge('New Remote Credential', 'New'),
			).toBeVisible();

			// Pull the changes
			await n8n.sourceControlPullModal.pull();
			await n8n.notifications.waitForNotificationAndClose('Pulled successfully');

			// Verify workflows appear locally
			await n8n.navigate.toHome();
			await expect(n8n.page.getByText('Workflow to Modify')).toBeVisible();
			await expect(n8n.page.getByText('New Remote Workflow')).toBeVisible();

			// Verify credentials appear locally
			await n8n.navigate.toCredentials();
			await expect(n8n.page.getByText('New Remote Credential')).toBeVisible();

			// Verify variables appear locally
			await n8n.navigate.toVariables();
			await expect(n8n.page.getByText('INITIAL_VAR')).toBeVisible();
			await expect(n8n.page.getByText('NEW_VAR')).toBeVisible();
		});

		test('should force pull and overwrite local changes', async ({ n8n, n8nContainer }) => {
			await connectToSourceControl({ n8n, n8nContainer });

			// Create and push a workflow
			const workflow = await n8n.api.workflows.createWorkflow({
				name: 'Workflow to Conflict',
				nodes: [],
				connections: {},
				active: false,
			});

			await n8n.sourceControlPushModal.open();
			await expect(n8n.sourceControlPushModal.getModal()).toBeVisible();
			await n8n.sourceControlPushModal.selectWorkflowsTab();
			await n8n.sourceControlPushModal.selectAllFilesInModal();
			await n8n.sourceControlPushModal.push('Initial workflow');
			await n8n.notifications.waitForNotificationAndClose('Pushed successfully');

			// Disconnect and modify the workflow (simulate remote change)
			await n8n.navigate.toEnvironments();
			await n8n.settingsEnvironment.getDisconnectButton().click();

			await n8n.navigate.toWorkflow(workflow.id);
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.saveWorkflow();

			// Reconnect and push (this becomes the "remote" version)
			await n8n.navigate.toEnvironments();
			await n8n.settingsEnvironment.getConnectButton().click();

			await n8n.sourceControlPushModal.open();
			await expect(n8n.sourceControlPushModal.getModal()).toBeVisible();
			await n8n.sourceControlPushModal.selectWorkflowsTab();
			await n8n.sourceControlPushModal.selectAllFilesInModal();
			await n8n.sourceControlPushModal.push('Remote modification');
			await n8n.notifications.waitForNotificationAndClose('Pushed successfully');

			// Now simulate local conflicting change
			// Disconnect and reset database
			await n8n.navigate.toEnvironments();
			await n8n.settingsEnvironment.getDisconnectButton().click();

			await n8n.api.resetDatabase();
			await n8n.goHome();
			await n8n.api.enableFeature('variables');
			await n8n.api.enableFeature('folders');
			await n8n.api.setMaxTeamProjectsQuota(-1);

			// Reconnect and create a workflow with the same ID (simulate pulling initial version)
			await connectToSourceControl({ n8n, n8nContainer });

			// Pull the remote workflow
			await n8n.sourceControlPullModal.open();
			await expect(n8n.sourceControlPullModal.getModal()).toBeVisible();
			await n8n.sourceControlPullModal.pull();
			await n8n.notifications.waitForNotificationAndClose('Pulled successfully');

			// Make local conflicting changes
			await n8n.navigate.toHome();
			await n8n.page.getByText('Workflow to Conflict').click();
			await n8n.canvas.addNode('Schedule Trigger');
			await n8n.canvas.saveWorkflow();

			// Try to pull again (should show conflict/modified status)
			await n8n.sourceControlPullModal.open();
			await expect(n8n.sourceControlPullModal.getModal()).toBeVisible();

			// Verify workflow shows as conflicting
			await n8n.sourceControlPullModal.selectWorkflowsTab();
			await expect(n8n.sourceControlPullModal.getFileInModal('Workflow to Conflict')).toBeVisible();

			// Force pull to overwrite local changes
			await n8n.sourceControlPullModal.pull();
			await n8n.notifications.waitForNotificationAndClose('Pulled successfully');

			// Verify the workflow was overwritten with remote version (has Manual Trigger, not Schedule)
			await n8n.navigate.toHome();
			await n8n.page.getByText('Workflow to Conflict').click();
			await expect(n8n.page.getByText('Manual Trigger')).toBeVisible();
			await expect(n8n.page.getByText('Schedule Trigger')).not.toBeVisible();
		});
	});

	test.describe('Access Control', () => {
		test('should respect sourceControl:push permission', async ({ n8n }) => {
			// TODO: Implement test
			// Setup: Sign in as user without sourceControl:push permission
			// Assert: Verify push button is disabled
			// Setup: Sign in as user with permission
			// Assert: Verify push button is enabled
		});

		test('should respect sourceControl:pull permission', async ({ n8n }) => {
			// TODO: Implement test
			// Setup: Sign in as user without sourceControl:pull permission
			// Assert: Verify pull button is disabled
			// Setup: Sign in as user with permission
			// Assert: Verify pull button is enabled
		});
	});
});
