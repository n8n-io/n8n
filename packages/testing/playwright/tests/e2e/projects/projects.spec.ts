import { nanoid } from 'nanoid';

import {
	INSTANCE_ADMIN_CREDENTIALS,
	INSTANCE_MEMBER_CREDENTIALS,
	INSTANCE_OWNER_CREDENTIALS,
} from '../../../config/test-users';
import { test, expect } from '../../../fixtures/base';

const MANUAL_TRIGGER_NODE_NAME = 'Manual Trigger';
const EXECUTE_WORKFLOW_NODE_NAME = 'Execute Sub-workflow';
const NOTION_NODE_NAME = 'Notion';
const EDIT_FIELDS_SET_NODE_NAME = 'Edit Fields (Set)';
const NOTION_API_KEY = 'abc123Playwright';

test.describe('Projects', () => {
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

	test.describe('when starting from scratch @db:reset', () => {
		test('should not show project add button and projects to a member if not invited to any project @auth:member', async ({
			n8n,
		}) => {
			await n8n.sideBar.universalAdd();
			await expect(n8n.sideBar.getProjectButtonInUniversalAdd()).toContainClass('is-disabled');
			await expect(n8n.sideBar.getProjectMenuItems()).toHaveCount(0);
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
			await n8n.canvas.saveWorkflow();

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

		test('should create sub-workflow and credential in the sub-workflow in the same project @auth:owner', async ({
			n8n,
		}) => {
			const { projectName } = await n8n.projectComposer.createProject();
			await n8n.sideBar.addWorkflowFromUniversalAdd(projectName);
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.saveWorkflow();
			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Workflow successfully created'),
			).toBeVisible();

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
			await subn8n.canvas.saveWorkflow();

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

			await n8n.workflows.clickNewWorkflowCard();
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.saveWorkflow();

			// Wait for save notification to confirm workflow is saved
			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Workflow successfully created'),
			).toBeVisible();
			// Wait for URL to update with workflow ID after save
			await n8n.page.waitForURL(/\/workflow\/[^/]+$/);

			await n8n.page.reload();
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);

			await n8n.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block' });
			await n8n.credentialsComposer.createFromNdv({
				apiKey: NOTION_API_KEY,
			});
			await n8n.ndv.close();
			await n8n.canvas.saveWorkflow();

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
			await n8n.canvas.saveWorkflow();
			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Workflow successfully created'),
			).toBeVisible();

			const savedWorkflowUrl = n8n.page.url();

			await n8n.sideBar.addWorkflowFromUniversalAdd('Personal');

			// Close dropdown/menu
			await n8n.page.locator('body').click();

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);

			await n8n.page.goBack();

			expect(n8n.page.url()).toBe(savedWorkflowUrl);
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

			await n8n.sideBar.addWorkflowFromUniversalAdd('Personal');

			expect(n8n.page.url()).toContain('/workflow/new');

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);
		});
	});

	test.describe('when moving resources between projects @db:reset', () => {
		test.describe.configure({ mode: 'serial' });

		test.beforeEach(async ({ n8n }) => {
			// Create workflow + credential in Home/Personal project
			await n8n.api.workflows.createWorkflow({
				name: 'Workflow in Home project',
				nodes: [],
				connections: {},
				active: false,
			});
			await n8n.api.credentials.createCredential({
				name: 'Credential in Home project',
				type: 'notionApi',
				data: { apiKey: '1234567890' },
			});

			// Create Project 1 with resources
			const project1 = await n8n.api.projects.createProject('Project 1');
			await n8n.api.workflows.createInProject(project1.id, {
				name: 'Workflow in Project 1',
			});
			await n8n.api.credentials.createCredential({
				name: 'Credential in Project 1',
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId: project1.id,
			});

			// Create Project 2 with resources
			const project2 = await n8n.api.projects.createProject('Project 2');
			await n8n.api.workflows.createInProject(project2.id, {
				name: 'Workflow in Project 2',
			});
			await n8n.api.credentials.createCredential({
				name: 'Credential in Project 2',
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId: project2.id,
			});

			// Navigate to home to load sidebar with new projects
			await n8n.goHome();
		});

		test('should move the workflow to expected projects @auth:owner', async ({ n8n }) => {
			// Move workflow from Personal to Project 2
			await n8n.sideBar.clickPersonalMenuItem();
			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(1);
			await n8n.workflowComposer.moveToProject('Workflow in Home project', 'Project 2');

			// Verify Personal has 0 workflows
			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(0);

			// Move workflow from Project 1 to Project 2
			await n8n.sideBar.clickProjectMenuItem('Project 1');
			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(1);
			await n8n.workflowComposer.moveToProject('Workflow in Project 1', 'Project 2');

			// Move workflow from Project 2 to member user
			await n8n.sideBar.clickProjectMenuItem('Project 2');
			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(3);
			await n8n.workflowComposer.moveToProject(
				'Workflow in Home project',
				INSTANCE_MEMBER_CREDENTIALS[0].email,
				null,
			);

			// Verify Project 2 has 2 workflows remaining
			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(2);
		});

		test('should move the credential to expected projects @auth:owner', async ({ n8n }) => {
			// Move credential from Project 1 to Project 2
			await n8n.sideBar.clickProjectMenuItem('Project 1');
			await n8n.sideBar.clickCredentialsLink();
			await expect(n8n.credentials.cards.getCredentials()).toHaveCount(1);

			const credentialCard1 = n8n.credentials.cards.getCredential('Credential in Project 1');
			await n8n.credentials.cards.openCardActions(credentialCard1);
			await n8n.credentials.cards.getCardAction('move').click();
			await expect(n8n.resourceMoveModal.getMoveCredentialButton()).toBeDisabled();

			await n8n.resourceMoveModal.getProjectSelectCredential().locator('input').click();
			await expect(n8n.page.getByRole('option')).toHaveCount(5);
			await n8n.resourceMoveModal.selectProjectOption('Project 2');
			await n8n.resourceMoveModal.clickMoveCredentialButton();

			await expect(n8n.credentials.cards.getCredentials()).toHaveCount(0);

			// Move credential from Project 2 to admin user
			await n8n.sideBar.clickProjectMenuItem('Project 2');
			await n8n.sideBar.clickCredentialsLink();
			await expect(n8n.credentials.cards.getCredentials()).toHaveCount(2);

			const credentialCard2 = n8n.credentials.cards.getCredential('Credential in Project 1');
			await n8n.credentials.cards.openCardActions(credentialCard2);
			await n8n.credentials.cards.getCardAction('move').click();
			await expect(n8n.resourceMoveModal.getMoveCredentialButton()).toBeDisabled();

			await n8n.resourceMoveModal.getProjectSelectCredential().locator('input').click();
			await expect(n8n.page.getByRole('option')).toHaveCount(5);
			await n8n.resourceMoveModal.selectProjectOption(INSTANCE_ADMIN_CREDENTIALS.email);
			await n8n.resourceMoveModal.clickMoveCredentialButton();

			await expect(n8n.credentials.cards.getCredentials()).toHaveCount(1);

			// Move credential from admin user (Home) back to owner user
			await n8n.sideBar.clickHomeMenuItem();
			await n8n.navigate.toCredentials();
			await expect(n8n.credentials.cards.getCredentials()).toHaveCount(3);

			const credentialCard3 = n8n.credentials.cards.getCredential('Credential in Project 1');
			await n8n.credentials.cards.openCardActions(credentialCard3);
			await n8n.credentials.cards.getCardAction('move').click();
			await expect(n8n.resourceMoveModal.getMoveCredentialButton()).toBeDisabled();

			await n8n.resourceMoveModal.getProjectSelectCredential().locator('input').click();
			await expect(n8n.page.getByRole('option')).toHaveCount(5);
			await n8n.resourceMoveModal.selectProjectOption(INSTANCE_OWNER_CREDENTIALS.email);
			await n8n.resourceMoveModal.clickMoveCredentialButton();

			// Verify final state: 3 credentials total, 2 with Personal badge
			await expect(n8n.credentials.cards.getCredentials()).toHaveCount(3);
			await expect(
				n8n.credentials.cards.getCredentials().filter({ hasText: 'Personal' }),
			).toHaveCount(2);
		});
	});
});
