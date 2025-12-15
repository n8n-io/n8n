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

		test('should allow selective file staging', async ({ n8n }) => {
			// TODO: Implement test
			// Action: Create multiple workflows
			// Action: Open push modal
			// Action: Deselect some files from the list
			// Action: Push only selected files
			// Assert: Verify unselected files remain in pending state
			// Assert: Verify selected files were pushed to Git
		});
	});

	test.describe('Pull Operations', () => {
		test('should pull new resources from remote', async ({ n8n }) => {
			// TODO: Implement test
			// Setup: Add resource to Git repository externally (via Gitea API or container.exec)
			// Action: Open pull modal, verify new resources listed
			// Action: Pull changes
			// Assert: Verify workflow appears locally
			// Assert: Verify credential stubs require configuration
			// Setup: Add folders.json and workflows with parentFolderId to Git externally
			// Action: Pull changes
			// Assert: Verify folder structure created locally
			// Assert: Verify workflows appear in correct folders
		});

		test('should pull remote modifications', async ({ n8n }) => {
			// TODO: Implement test
			// Setup: Modify workflow remotely (via Gitea API or Git commands in container)
			// Action: Fetch status, verify "modified" status shown
			// Action: Pull changes
			// Assert: Verify local workflow updated with remote changes
		});

		test('should force pull and overwrite local changes', async ({ n8n }) => {
			// TODO: Implement test
			// Setup: Create conflicting local and remote changes
			// Action: Attempt pull without force
			// Action: Enable force pull option
			// Action: Pull with force
			// Assert: Verify remote version overwrites local changes
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
