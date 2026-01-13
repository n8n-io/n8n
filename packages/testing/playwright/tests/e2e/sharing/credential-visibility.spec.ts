import { nanoid } from 'nanoid';
import { test, expect } from '../../../fixtures/base';

test.describe('Credential Visibility', () => {
	test.beforeEach(async ({ api }) => {
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
		await api.setMaxTeamProjectsQuota(-1);
	});

	test('should only show credentials from same team project in dropdown', async ({ api, n8n }) => {
		// Create user
		const user = await api.publicApi.createUser({ role: 'global:member' });
		const userPage = await n8n.start.withUser(user);

		// Create team projects
		const devProject = await userPage.projectComposer.createProject(`Dev ${nanoid(8)}`);
		const testProject = await userPage.projectComposer.createProject(`Test ${nanoid(8)}`);

		// Create credentials in each project
		await userPage.navigate.toCredentials(devProject.projectId);
		await userPage.projectTabs.clickCredentialsTab();
		const devCredName = `Dev Notion ${nanoid(8)}`;
		await api.credentials.createCredential({
			name: devCredName,
			type: 'notionApi',
			data: { apiKey: 'dev-key' },
		});

		await userPage.navigate.toCredentials(testProject.projectId);
		await userPage.projectTabs.clickCredentialsTab();
		const testCredName = `Test Notion ${nanoid(8)}`;
		await api.credentials.createCredential({
			name: testCredName,
			type: 'notionApi',
			data: { apiKey: 'test-key' },
		});

		// Create workflow in Test project
		await userPage.navigate.toWorkflows(testProject.projectId);
		await userPage.projectTabs.clickWorkflowsTab();
		await userPage.workflows.clickNewWorkflowCard();

		// Add Notion node
		await userPage.canvas.addNode('Notion');
		await userPage.canvas.getFirstAction().click();

		// Verify only Test project credential is visible
		await userPage.ndv.getNodeCredentialsSelect().click();
		const dropdownItems = userPage.ndv.getVisiblePopper().locator('li');
		await expect(dropdownItems).toHaveCount(1);
		await expect(userPage.ndv.getVisiblePopper().getByText(testCredName)).toBeVisible();
		await expect(userPage.ndv.getVisiblePopper().getByText(devCredName)).not.toBeVisible();
	});

	test('should show own and shared credentials in personal project', async ({ api, n8n }) => {
		// Create users
		await api.publicApi.createUser({ role: 'global:member' });
		const member = await api.publicApi.createUser({ role: 'global:member' });

		// Owner creates credential and shares it
		const sharedCredName = `Shared Notion ${nanoid(8)}`;
		const sharedCredential = await api.credentials.createCredential({
			name: sharedCredName,
			type: 'notionApi',
			data: { apiKey: 'shared-key' },
		});
		await api.credentials.shareCredential(sharedCredential.id, [member.id]);

		// Member creates own credential
		const memberPage = await n8n.start.withUser(member);
		const ownCredName = `Own Notion ${nanoid(8)}`;
		await api.credentials.createCredential({
			name: ownCredName,
			type: 'notionApi',
			data: { apiKey: 'own-key' },
		});

		// Member creates workflow
		await memberPage.navigate.toWorkflow('new');
		await memberPage.canvas.addNode('Notion');
		await memberPage.canvas.getFirstAction().click();

		// Verify both credentials are visible
		await memberPage.ndv.getNodeCredentialsSelect().click();
		const dropdownItems = memberPage.ndv.getVisiblePopper().locator('li');
		await expect(dropdownItems).toHaveCount(2);
		await expect(memberPage.ndv.getVisiblePopper().getByText(ownCredName)).toBeVisible();
		await expect(memberPage.ndv.getVisiblePopper().getByText(sharedCredName)).toBeVisible();
	});

	test('should only show own credentials in shared workflow for member', async ({ api, n8n }) => {
		// Create users
		await api.publicApi.createUser({ role: 'global:member' });
		const member = await api.publicApi.createUser({ role: 'global:member' });

		// Owner creates credential and workflow
		const ownerCredName = `Owner Notion ${nanoid(8)}`;
		await api.credentials.createCredential({
			name: ownerCredName,
			type: 'notionApi',
			data: { apiKey: 'owner-key' },
		});

		const workflowName = `Shared Workflow ${nanoid(8)}`;
		const workflow = await api.workflows.createWorkflow({
			name: workflowName,
			nodes: [],
			connections: {},
			active: false,
		});

		// Share workflow with member
		await api.workflows.shareWorkflow(workflow.id, [member.id]);

		// Member creates own credential
		const memberPage = await n8n.start.withUser(member);
		const memberCredName = `Member Notion ${nanoid(8)}`;
		await api.credentials.createCredential({
			name: memberCredName,
			type: 'notionApi',
			data: { apiKey: 'member-key' },
		});

		// Member opens shared workflow
		await memberPage.navigate.toWorkflows();
		await memberPage.workflows.cards.getWorkflow(workflowName).click();

		// Add Notion node
		await memberPage.canvas.addNode('Notion');
		await memberPage.canvas.getFirstAction().click();

		// Verify only member's credential is visible (not owner's)
		await memberPage.ndv.getNodeCredentialsSelect().click();
		const dropdownItems = memberPage.ndv.getVisiblePopper().locator('li');
		await expect(dropdownItems).toHaveCount(1);
		await expect(memberPage.ndv.getVisiblePopper().getByText(memberCredName)).toBeVisible();
		await expect(memberPage.ndv.getVisiblePopper().getByText(ownerCredName)).not.toBeVisible();
	});

	test('should show all credentials from shared workflow personal projects for global owner', async ({
		api,
		n8n,
	}) => {
		// Create users (owner is global admin)
		const globalOwner = await api.publicApi.createUser({ role: 'global:admin' });
		await api.publicApi.createUser({ role: 'global:member' });
		const member2 = await api.publicApi.createUser({ role: 'global:member' });

		// Members create credentials
		const member1CredName = `Member1 Notion ${nanoid(8)}`;
		await api.credentials.createCredential({
			name: member1CredName,
			type: 'notionApi',
			data: { apiKey: 'member1-key' },
		});

		const member2CredName = `Member2 Notion ${nanoid(8)}`;
		await api.credentials.createCredential({
			name: member2CredName,
			type: 'notionApi',
			data: { apiKey: 'member2-key' },
		});

		// Member1 creates workflow and shares with global owner and member2
		const workflowName = `Shared Workflow ${nanoid(8)}`;
		const workflow = await api.workflows.createWorkflow({
			name: workflowName,
			nodes: [],
			connections: {},
			active: false,
		});
		await api.workflows.shareWorkflow(workflow.id, [globalOwner.id, member2.id]);

		// Global owner creates own credential
		const ownerPage = await n8n.start.withUser(globalOwner);
		const ownerCredName = `Owner Notion ${nanoid(8)}`;
		await api.credentials.createCredential({
			name: ownerCredName,
			type: 'notionApi',
			data: { apiKey: 'owner-key' },
		});

		// Global owner opens workflow
		await ownerPage.navigate.toWorkflows();
		await ownerPage.workflows.cards.getWorkflow(workflowName).click();

		// Add Notion node
		await ownerPage.canvas.addNode('Notion');
		await ownerPage.canvas.getFirstAction().click();

		// Verify global owner sees all three credentials
		await ownerPage.ndv.getNodeCredentialsSelect().click();
		const dropdownItems = ownerPage.ndv.getVisiblePopper().locator('li');
		await expect(dropdownItems).toHaveCount(3);
		await expect(ownerPage.ndv.getVisiblePopper().getByText(ownerCredName)).toBeVisible();
		await expect(ownerPage.ndv.getVisiblePopper().getByText(member1CredName)).toBeVisible();
		await expect(ownerPage.ndv.getVisiblePopper().getByText(member2CredName)).toBeVisible();
	});

	test('should show all personal credentials when global owner owns workflow', async ({
		api,
		n8n,
	}) => {
		// Create users
		const globalOwner = await api.publicApi.createUser({ role: 'global:admin' });
		await api.publicApi.createUser({ role: 'global:member' });

		// Member creates credential
		const memberCredName = `Member Notion ${nanoid(8)}`;
		await api.credentials.createCredential({
			name: memberCredName,
			type: 'notionApi',
			data: { apiKey: 'member-key' },
		});

		// Global owner creates workflow
		const ownerPage = await n8n.start.withUser(globalOwner);
		await ownerPage.navigate.toWorkflow('new');
		await ownerPage.canvas.addNode('Notion');
		await ownerPage.canvas.getFirstAction().click();

		// Verify global owner sees member's credential
		await ownerPage.ndv.getNodeCredentialsSelect().click();
		const dropdownItems = ownerPage.ndv.getVisiblePopper().locator('li');
		await expect(dropdownItems).toHaveCount(1);
		await expect(ownerPage.ndv.getVisiblePopper().getByText(memberCredName)).toBeVisible();
	});

	test('should show personal label for credentials in team project context', async ({
		api,
		n8n,
	}) => {
		// Create user
		const user = await api.publicApi.createUser({ role: 'global:member' });
		const userPage = await n8n.start.withUser(user);

		// Create personal credential
		const personalCredName = `Personal Notion ${nanoid(8)}`;
		const personalCredential = await api.credentials.createCredential({
			name: personalCredName,
			type: 'notionApi',
			data: { apiKey: 'personal-key' },
		});

		// Create team project
		const teamProject = await userPage.projectComposer.createProject(`Team ${nanoid(8)}`);

		// Create team credential
		await userPage.navigate.toCredentials(teamProject.projectId);
		await userPage.projectTabs.clickCredentialsTab();
		const teamCredName = `Team Notion ${nanoid(8)}`;
		await api.credentials.createCredential({
			name: teamCredName,
			type: 'notionApi',
			data: { apiKey: 'team-key' },
		});

		// Share personal credential with team project
		await api.credentials.shareCredential(personalCredential.id, [teamProject.projectId]);

		// Navigate to all credentials view
		await userPage.navigate.toCredentials();

		// Verify personal credential has "Personal" label
		const credentials = userPage.credentials.cards.getCredentials();
		await expect(credentials).toHaveCount(2);
		await expect(
			credentials.filter({ hasText: 'Personal' }),
		).toHaveCount(1);
	});
});
