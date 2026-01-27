import {
	INSTANCE_ADMIN_CREDENTIALS,
	INSTANCE_MEMBER_CREDENTIALS,
	INSTANCE_OWNER_CREDENTIALS,
} from '../../../config/test-users';
import { test, expect } from '../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'projects-move-resources' } } });

test.describe('Projects - Moving Resources @db:reset', () => {
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
		await expect(n8n.page.getByRole('option')).toHaveCount(6);
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
		await expect(n8n.page.getByRole('option')).toHaveCount(6);
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
		await expect(n8n.page.getByRole('option')).toHaveCount(6);
		await n8n.resourceMoveModal.selectProjectOption(INSTANCE_OWNER_CREDENTIALS.email);
		await n8n.resourceMoveModal.clickMoveCredentialButton();

		// Verify final state: 3 credentials total, 2 with Personal badge
		await expect(n8n.credentials.cards.getCredentials()).toHaveCount(3);
		await expect(
			n8n.credentials.cards.getCredentials().filter({ hasText: 'Personal' }),
		).toHaveCount(2);
	});
});
