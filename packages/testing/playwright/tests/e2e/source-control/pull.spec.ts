import { MANUAL_TRIGGER_NODE_NAME } from '../../../config/constants';
import { expect, test } from '../../../fixtures/base';
import { capabilities } from '../../../fixtures/capabilities';
import type { n8nPage } from '../../../pages/n8nPage';
import { setupGitRepo } from '../../../utils/source-control-helper';

test.use({ addContainerCapability: capabilities.sourceControl });

async function expectPullSuccess(n8n: n8nPage) {
	expect(
		await n8n.notifications.waitForNotificationAndClose('Pulled successfully', { timeout: 30000 }),
	).toBe(true);
}

test.describe('Pull resources from Git @capability:source-control', () => {
	let repoUrl: string;

	test.beforeEach(async ({ n8n, n8nContainer }) => {
		await n8n.api.enableFeature('sourceControl');
		await n8n.api.enableFeature('variables');
		repoUrl = await setupGitRepo(n8n, n8nContainer);
	});

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
		await n8n.sideBar.getSourceControlPullButton().click();
		await expectPullSuccess(n8n);

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

		// modify workflow
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
		await n8n.sideBar.getSourceControlPullButton().click();
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
		await expectPullSuccess(n8n);

		// check pulled resources
		await n8n.navigate.toWorkflow(workflow.id);
		await expect(n8n.canvas.getWorkflowName()).toHaveAttribute('title', 'Pull Test Workflow');
		await n8n.navigate.toHome();
		await expect(n8n.workflows.cards.getWorkflow('New Workflow')).toBeHidden();
	});
});
