import { nanoid } from 'nanoid';
import { test, expect } from '../../../fixtures/base';

test.describe('Workflow Sharing', () => {
	test.beforeEach(async ({ api }) => {
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
	});

	test('should share workflow with another user', async ({ api, n8n }) => {
		// Create users
		await api.publicApi.createUser({ role: 'global:member' }); // owner
		const sharee = await api.publicApi.createUser({ role: 'global:member' });

		// Owner creates workflow
		const workflowName = `Test Workflow ${nanoid(8)}`;
		const workflow = await api.workflows.createWorkflow({
			name: workflowName,
			nodes: [],
			connections: {},
			active: false,
		});

		// Share workflow with sharee
		await api.workflows.shareWorkflow(workflow.id, [sharee.id]);

		// Verify sharee can see the workflow
		const shareePage = await n8n.start.withUser(sharee);
		await shareePage.navigate.toWorkflows();
		await expect(shareePage.workflows.cards.getWorkflow(workflowName)).toBeVisible();
	});

	test('should allow sharee to edit shared workflow', async ({ api, n8n }) => {
		// Create users
		await api.publicApi.createUser({ role: 'global:member' }); // owner
		const sharee = await api.publicApi.createUser({ role: 'global:member' });

		// Owner creates workflow
		const workflowName = `Test Workflow ${nanoid(8)}`;
		const workflow = await api.workflows.createWorkflow({
			name: workflowName,
			nodes: [],
			connections: {},
			active: false,
		});

		// Share workflow with sharee
		await api.workflows.shareWorkflow(workflow.id, [sharee.id]);

		// Sharee opens and edits workflow
		const shareePage = await n8n.start.withUser(sharee);
		await shareePage.navigate.toWorkflows();
		await shareePage.workflows.cards.getWorkflow(workflowName).click();

		// Add a node
		await shareePage.canvas.addNode('Manual Trigger');
		await shareePage.canvas.waitForSaveWorkflowCompleted();

		// Verify workflow was updated
		const updatedWorkflow = await api.workflows.getWorkflow(workflow.id);
		expect(updatedWorkflow.nodes).toHaveLength(1);
	});

	test('should show shared workflow to sharee but not other workflows', async ({ api, n8n }) => {
		// Create users
		await api.publicApi.createUser({ role: 'global:member' }); // owner
		const sharee = await api.publicApi.createUser({ role: 'global:member' });

		// Owner creates two workflows
		const sharedWorkflowName = `Shared Workflow ${nanoid(8)}`;
		const privateWorkflowName = `Private Workflow ${nanoid(8)}`;

		const sharedWorkflow = await api.workflows.createWorkflow({
			name: sharedWorkflowName,
			nodes: [],
			connections: {},
			active: false,
		});

		await api.workflows.createWorkflow({
			name: privateWorkflowName,
			nodes: [],
			connections: {},
			active: false,
		});

		// Share only the first workflow
		await api.workflows.shareWorkflow(sharedWorkflow.id, [sharee.id]);

		// Verify sharee can only see shared workflow
		const shareePage = await n8n.start.withUser(sharee);
		await shareePage.navigate.toWorkflows();
		await expect(shareePage.workflows.cards.getWorkflow(sharedWorkflowName)).toBeVisible();
		await expect(shareePage.workflows.cards.getWorkflow(privateWorkflowName)).not.toBeVisible();
	});

	test('should share workflow with multiple users', async ({ api, n8n }) => {
		// Create users
		await api.publicApi.createUser({ role: 'global:member' }); // owner
		const sharee1 = await api.publicApi.createUser({ role: 'global:member' });
		const sharee2 = await api.publicApi.createUser({ role: 'global:member' });

		// Owner creates workflow
		const workflowName = `Test Workflow ${nanoid(8)}`;
		const workflow = await api.workflows.createWorkflow({
			name: workflowName,
			nodes: [],
			connections: {},
			active: false,
		});

		// Share with both users
		await api.workflows.shareWorkflow(workflow.id, [sharee1.id, sharee2.id]);

		// Verify both sharees can see the workflow
		const sharee1Page = await n8n.start.withUser(sharee1);
		await sharee1Page.navigate.toWorkflows();
		await expect(sharee1Page.workflows.cards.getWorkflow(workflowName)).toBeVisible();

		const sharee2Page = await n8n.start.withUser(sharee2);
		await sharee2Page.navigate.toWorkflows();
		await expect(sharee2Page.workflows.cards.getWorkflow(workflowName)).toBeVisible();
	});

	test('should allow owner to see all workflows', async ({ api, n8n }) => {
		// Create users
		await api.publicApi.createUser({ role: 'global:member' }); // member1
		await api.publicApi.createUser({ role: 'global:member' }); // member2
		const owner = await api.publicApi.createUser({ role: 'global:admin' });

		// Members create workflows
		const workflow1Name = `Workflow 1 ${nanoid(8)}`;
		const workflow2Name = `Workflow 2 ${nanoid(8)}`;

		await api.workflows.createWorkflow({
			name: workflow1Name,
			nodes: [],
			connections: {},
			active: false,
		});

		await api.workflows.createWorkflow({
			name: workflow2Name,
			nodes: [],
			connections: {},
			active: false,
		});

		// Owner should see all workflows
		const ownerPage = await n8n.start.withUser(owner);
		await ownerPage.navigate.toWorkflows();
		await expect(ownerPage.workflows.cards.getWorkflow(workflow1Name)).toBeVisible();
		await expect(ownerPage.workflows.cards.getWorkflow(workflow2Name)).toBeVisible();
	});

	test('should not share team project workflows via sharing modal', async ({ api, n8n }) => {
		await api.setMaxTeamProjectsQuota(-1);

		// Create user and team project
		const owner = await api.publicApi.createUser({ role: 'global:member' });
		const ownerPage = await n8n.start.withUser(owner);

		// Create team project
		const teamProjectName = `Team ${nanoid(8)}`;
		const teamProject = await ownerPage.projectComposer.createProject(teamProjectName);

		// Create workflow in team project
		const workflowName = `Team Workflow ${nanoid(8)}`;
		const workflow = await api.workflows.createInProject(teamProject.projectId, {
			name: workflowName,
		});

		// Navigate to the workflow
		await ownerPage.navigate.toWorkflow(workflow.id);

		// Open share modal
		await ownerPage.canvas.openShareModal();

		// Verify no users select is available (team workflows can't be shared)
		await expect(ownerPage.workflowSharingModal.getUsersSelect()).toHaveCount(0);

		await ownerPage.workflowSharingModal.close();
	});
});
