import { addGiteaSSHKey } from 'n8n-containers/n8n-test-container-gitea';

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

test.describe('Source Control Operations @capability:source-control', () => {
	test.describe.configure({ mode: 'serial' });

	test.describe('Push Operations', () => {
		test('should connect to Git and push a new workflow', async ({ n8n, n8nContainer }) => {
			await setupSourceControl(n8n);

			const preferencesResponse = await n8n.page.request.get('/rest/source-control/preferences');
			const preferences = await preferencesResponse.json();
			const sshKey = preferences.data.publicKey;

			// Get the source control container and add SSH key
			const sourceControlContainer = n8nContainer.containers.find((c) =>
				c.getName().includes('gitea'),
			);
			expect(sourceControlContainer).toBeDefined();
			await addGiteaSSHKey(sourceControlContainer!, 'n8n-source-control', sshKey);

			// Connect to repository
			await n8n.navigate.toEnvironments();
			await n8n.settingsEnvironment.fillRepoUrl('ssh://git@gitea/giteaadmin/n8n-test-repo.git');
			await n8n.settingsEnvironment.getConnectButton().click();

			// Verify connection successful
			await expect(n8n.settingsEnvironment.getDisconnectButton()).toBeVisible();
			await expect(n8n.settingsEnvironment.getBranchSelect()).toBeVisible();

			// TODO: Implement workflow push test
			// Action: Create workflow with nodes, save workflow
			// Action: Open push modal, enter commit message, push
			// Assert: Verify clean status, workflow pushed successfully
		});

		test('should push all resource types together', async ({ n8n }) => {
			// TODO: Implement test
			// Action: Create workflow, credential, variable, tag, folder, project
			// Action: Open push modal, verify all 6 resource types listed
			// Action: Enter commit message, push all resources
			// Assert: Verify all resources pushed successfully
			// Assert: Verify workflows/, projects/, credential_stubs/ folders exist
			// Assert: Verify tags.json, variable_stubs.json, folders.json files exist
		});

		test('should push modifications and deletions', async ({ n8n }) => {
			// TODO: Implement test
			// Assumes: Workflow from test #1 exists
			// Action: Modify workflow from previous test
			// Action: Delete another resource
			// Action: Open push modal, verify "modified" and "deleted" statuses
			// Action: Push changes
			// Assert: Verify success, verify remote reflects changes
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

	test.describe('Folder and Project Support', () => {
		test('should push workflow inside folder', async ({ n8n }) => {
			// TODO: Implement test
			// Action: Create folder in workflows page
			// Action: Create workflow inside the folder
			// Action: Push to Git
			// Assert: Verify folders.json file exists in repository
			// Assert: Verify workflow JSON has correct parentFolderId reference
		});

		test('should push team project with resources', async ({ n8n }) => {
			// TODO: Implement test
			// Action: Create team project
			// Action: Add workflows and credentials to the project
			// Action: Push to Git
			// Assert: Verify projects/ folder contains project JSON
			// Assert: Verify workflow JSONs have correct owner.projectId references
		});

		test('should pull folder structure and workflows', async ({ n8n }) => {
			// TODO: Implement test
			// Setup: Add folders.json and workflows with parentFolderId to Git externally
			// Action: Pull changes
			// Assert: Verify folder structure created locally
			// Assert: Verify workflows appear in correct folders
		});
	});

	test.describe('Conflict Resolution', () => {
		test('should detect and handle push conflicts', async ({ n8n }) => {
			// TODO: Implement test
			// Setup: Push workflow, then modify remotely and locally creating conflict
			// Action: Attempt push, verify conflict error message
			// Action: Pull remote changes first
			// Action: Resolve conflicts if needed, then push
			// Assert: Verify push succeeds after pulling
		});

		test('should show conflict status for diverged branches', async ({ n8n }) => {
			// TODO: Implement test
			// Setup: Create commits on both local and remote that diverge
			// Action: Fetch status
			// Assert: Verify UI shows diverged/conflict state
			// Assert: Verify appropriate warning message displayed
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

		test('should respect read-only mode restrictions', async ({ n8n }) => {
			// TODO: Implement test
			// Assumes: Connected to Git from beforeAll
			// Action: Enable read-only mode in settings
			// Assert: Verify push button is disabled
			// Assert: Verify pull button is still enabled (read-only allows pull)
			// Action: Disable read-only mode
			// Assert: Verify push button is enabled again
		});
	});
});
