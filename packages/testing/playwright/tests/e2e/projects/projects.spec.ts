import { nanoid } from 'nanoid';

import { INSTANCE_MEMBER_CREDENTIALS } from '../../../config/test-users';
import { test, expect } from '../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'projects' } } });

const MANUAL_TRIGGER_NODE_NAME = 'Manual Trigger';
const EXECUTE_WORKFLOW_NODE_NAME = 'Execute Sub-workflow';
const NOTION_NODE_NAME = 'Notion';
const EDIT_FIELDS_SET_NODE_NAME = 'Edit Fields (Set)';
const NOTION_API_KEY = 'abc123Playwright';

test.describe('Projects @db:reset', {
	annotation: [
		{ type: 'owner', description: 'Identity & Access' },
	],
}, () => {
	test.describe.configure({ mode: 'serial' });

	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
		// Enable features required for project workflows and moving resources
		await n8n.api.enableFeature('sharing');
		await n8n.api.enableFeature('folders');
		await n8n.api.enableFeature('advancedPermissions');
		await n8n.api.enableFeature('projectRole:admin');
		await n8n.api.enableFeature('projectRole:editor');
		await n8n.api.setMaxTeamProjectsQuota(-1);
	});

	test.describe('when starting from scratch', () => {
		test('should not show project add button and projects to a member if not invited to any project @auth:member', async ({
			n8n,
		}) => {
			await n8n.sideBar.universalAdd();
			await expect(n8n.sideBar.getProjectButtonInUniversalAdd()).toContainClass('is-disabled');
			await expect(n8n.sideBar.getProjectMenuItems()).toHaveCount(0);
		});

		// This test needs empty credentials list - must run before tests that create credentials
		test('should allow changing an inaccessible credential when the workflow was moved to a team project @auth:owner', async ({
			n8n,
		}) => {
			await n8n.navigate.toCredentials();
			await n8n.credentials.emptyListCreateCredentialButton.click();

			await n8n.credentials.createCredentialFromCredentialPicker(
				'Notion API',
				{
					apiKey: NOTION_API_KEY,
				},
				{
					name: 'Credential in Home project',
				},
			);

			await n8n.navigate.toWorkflows();
			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(0);

			await n8n.navigate.toWorkflow('new');

			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block', closeNDV: true });
			await n8n.canvas.waitForSaveWorkflowCompleted();

			const { projectId, projectName } = await n8n.projectComposer.createProject('Project 1');

			await n8n.api.projects.addUserToProjectByEmail(
				projectId,
				INSTANCE_MEMBER_CREDENTIALS[0].email,
				'project:editor',
			);

			await n8n.sideBar.clickPersonalMenuItem();
			await n8n.sideBar.clickWorkflowsLink();

			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(1);

			await n8n.workflowComposer.moveToProject('My workflow', projectName);

			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(0);

			await n8n.sideBar.clickProjectMenuItem(projectName);
			await n8n.navigate.toWorkflows();

			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(1);
			await expect(
				n8n.workflows.cards.getWorkflow('My workflow').getByText('Personal'),
			).toBeHidden();

			await n8n.sideBar.clickSignout();
			await n8n.page.waitForURL(/\/signin/);
			await n8n.signIn.loginWithEmailAndPassword(
				INSTANCE_MEMBER_CREDENTIALS[0].email,
				INSTANCE_MEMBER_CREDENTIALS[0].password,
			);

			await expect(n8n.workflows.getProjectName()).toBeVisible();

			await n8n.sideBar.clickProjectMenuItem(projectName);
			await n8n.navigate.toWorkflows();

			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(1);

			await n8n.workflows.cards.clickWorkflowCard('My workflow');

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

			await n8n.canvas.openNode('Append a block');

			await expect(n8n.ndv.getCredentialSelectInput()).toBeEnabled();
		});

		test('should filter credentials by project ID when creating new workflow or hard reloading an opened workflow', async ({
			n8n,
		}) => {
			const { projectName, projectId } = await n8n.projectComposer.createProject();
			await n8n.projectComposer.addCredentialToProject(
				projectName,
				'Notion API',
				'apiKey',
				NOTION_API_KEY,
			);

			const credentials = await n8n.api.credentials.getCredentialsByProject(projectId);
			expect(credentials).toHaveLength(1);

			const { projectId: project2Id } = await n8n.projectComposer.createProject();
			const credentials2 = await n8n.api.credentials.getCredentialsByProject(project2Id);
			expect(credentials2).toHaveLength(0);
		});

		test('should create sub-workflow and credential in the sub-workflow in the same project @auth:owner', async ({
			n8n,
		}) => {
			const { projectName } = await n8n.projectComposer.createProject();
			await n8n.sideBar.addWorkflowFromUniversalAdd(projectName);
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.waitForSaveWorkflowCompleted();

			await n8n.canvas.addNode(EXECUTE_WORKFLOW_NODE_NAME, { action: 'Execute A Sub Workflow' });

			const subn8n = await n8n.start.fromNewPage(() =>
				n8n.ndv.selectWorkflowResource(`Create a Sub-Workflow in '${projectName}'`),
			);

			await subn8n.ndv.clickBackToCanvasButton();

			await subn8n.canvas.deleteNodeByName('Replace me with your logic');
			await subn8n.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block' });
			await subn8n.credentialsComposer.createFromNdv({
				apiKey: NOTION_API_KEY,
			});

			await subn8n.ndv.clickBackToCanvasButton();
			await subn8n.canvas.waitForSaveWorkflowCompleted();

			await subn8n.navigate.toWorkflows();
			await subn8n.sideBar.clickProjectMenuItem(projectName);
			await subn8n.navigate.toWorkflows();

			await expect(subn8n.workflows.cards.getWorkflows()).toHaveCount(2);

			await expect(subn8n.page.getByRole('heading', { name: 'My Sub-Workflow' })).toBeVisible();

			await subn8n.navigate.toCredentials();

			await expect(subn8n.credentials.cards.getCredentials()).toHaveCount(1);
			await expect(subn8n.page.getByRole('heading', { name: 'Notion account' })).toBeVisible();
		});

		test('should create credential from workflow in the correct project after editor page refresh @auth:owner', async ({
			n8n,
		}) => {
			const { projectName } = await n8n.projectComposer.createProject(`Dev ${nanoid(8)}`);

			await n8n.sideBar.clickProjectMenuItem(projectName);
			await n8n.navigate.toWorkflows();

			await n8n.workflows.clickNewWorkflowButtonFromOverview();
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.waitForSaveWorkflowCompleted();

			// Wait for URL to update with workflow ID after save
			await n8n.page.waitForURL(/\/workflow\/[^/]+$/);

			await n8n.page.reload();
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);

			await n8n.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block' });
			await n8n.credentialsComposer.createFromNdv({
				apiKey: NOTION_API_KEY,
			});
			await n8n.ndv.close();
			await n8n.canvas.waitForSaveWorkflowCompleted();

			await n8n.sideBar.clickProjectMenuItem(projectName);
			await n8n.navigate.toCredentials();

			await expect(n8n.credentials.cards.getCredentials()).toHaveCount(1);
		});

		test('should set and update project icon @auth:admin', async ({ n8n }) => {
			const DEFAULT_ICON = 'layers';
			const NEW_PROJECT_NAME = `Test Project ${nanoid(8)}`;

			await n8n.projectComposer.createProject(NEW_PROJECT_NAME);

			await expect(n8n.projectSettings.getIconPickerButton().locator('svg')).toHaveAttribute(
				'data-icon',
				DEFAULT_ICON,
			);

			await n8n.projectSettings.clickIconPickerButton();
			await n8n.projectSettings.selectIconTab('Emojis');

			await n8n.projectSettings.selectFirstEmoji();

			await expect(
				n8n.notifications.getNotificationByTitle('Project icon updated successfully'),
			).toBeVisible();

			await expect(n8n.projectSettings.getIconPickerButton()).toContainText('😀');

			await n8n.sideBar.expand();
			await expect(
				n8n.sideBar.getProjectMenuItems().filter({ hasText: NEW_PROJECT_NAME }),
			).toContainText('😀');
		});

		test('should be able to create a workflow when in the workflow editor @auth:owner', async ({
			n8n,
		}) => {
			await n8n.navigate.toWorkflow('new');
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
			await n8n.canvas.waitForSaveWorkflowCompleted();

			// Wait for URL to be updated (new=true removed after save)
			await n8n.page.waitForURL(/\/workflow\/[^?]+$/);
			const savedWorkflowUrl = n8n.page.url();

			await n8n.sideBar.addWorkflowFromUniversalAdd('Personal');

			// Close dropdown/menu
			await n8n.page.locator('body').click();

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);

			await n8n.page.goBack();

			expect(n8n.page.url()).toBe(savedWorkflowUrl);
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

			await n8n.sideBar.addWorkflowFromUniversalAdd('Personal');

			// New workflows redirect to /workflow/<id>?new=true
			await n8n.page.waitForURL(/\/workflow\/[a-zA-Z0-9_-]+\?.*new=true/);

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);
		});
	});
});
