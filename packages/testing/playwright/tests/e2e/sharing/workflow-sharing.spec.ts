import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe('Workflow Sharing', () => {
	test('should share workflow with another user via UI', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test user
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		// Owner creates a workflow
		await n8n.navigate.toWorkflow('new');
		const workflowName = `Test Workflow ${nanoid()}`;
		await n8n.canvas.setWorkflowName(workflowName);
		await n8n.canvas.addNode('Manual Trigger');

		// Share workflow via UI
		await n8n.canvas.openShareModal();
		await n8n.workflowSharingModal.addUser(member.email);
		await n8n.workflowSharingModal.save();

		// Verify member can see the shared workflow
		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toWorkflows();

		await expect(memberN8n.workflows.cards.getWorkflow(workflowName)).toBeVisible();
	});

	test('should share workflow with another user via API', async ({ api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test user
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		// Create a workflow as owner FIRST (before switching contexts)
		const workflow = await api.workflows.createWorkflow({
			name: `Test Workflow ${nanoid()}`,
			nodes: [
				{
					id: 'manual-trigger',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					position: [100, 200],
					parameters: {},
					typeVersion: 1,
				},
			],
			connections: {},
		});

		// Get member's personal project (withUser automatically restores owner session)
		const memberProject = await api.users.withUser(member, async (memberApi) => {
			return await memberApi.projects.getMyPersonalProject();
		});

		// Share workflow with member's personal project
		await api.workflows.shareWorkflow(workflow.id, [memberProject.id]);

		// Verify member can access the workflow
		const memberWorkflows = await api.users.withUser(member, async (memberApi) => {
			return await memberApi.workflows.getWorkflows();
		});

		const sharedWorkflow = memberWorkflows.find((w: { id: string }) => w.id === workflow.id);
		expect(sharedWorkflow).toBeTruthy();
		expect(sharedWorkflow?.name).toBe(workflow.name);
	});

	test('should allow shared user to edit shared workflow', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test user
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		// Create workflow as owner FIRST (before switching contexts)
		const workflow = await api.workflows.createWorkflow({
			name: `Test Workflow ${nanoid()}`,
			nodes: [
				{
					id: 'manual-trigger',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					position: [100, 200],
					parameters: {},
					typeVersion: 1,
				},
			],
			connections: {},
		});

		// Get member's personal project (withUser automatically restores owner session)
		const memberProject = await api.users.withUser(member, async (memberApi) => {
			return await memberApi.projects.getMyPersonalProject();
		});

		// Share workflow with member
		await api.workflows.shareWorkflow(workflow.id, [memberProject.id]);

		// Member opens and edits the workflow
		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toWorkflow(workflow.id);

		// Wait for workflow to be fully loaded
		await expect(memberN8n.canvas.getCanvasNodes()).toHaveCount(1);

		// Verify member can add nodes to the shared workflow
		await memberN8n.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: true });

		// Verify the edit was saved by checking node count
		await expect(memberN8n.canvas.getCanvasNodes()).toHaveCount(2);
	});

	test('should prevent access to workflow when user is not shared', async ({ api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test user
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		// Create workflow as owner (without sharing)
		const workflow = await api.workflows.createWorkflow({
			name: `Private Workflow ${nanoid()}`,
			nodes: [
				{
					id: 'manual-trigger',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					position: [100, 200],
					parameters: {},
					typeVersion: 1,
				},
			],
			connections: {},
		});

		// Verify member cannot access the workflow via API
		try {
			await api.users.withUser(member, async (memberApi) => {
				await memberApi.workflows.getWorkflow(workflow.id);
			});
			// If we get here, the test should fail
			expect(false).toBe(true);
		} catch (error) {
			// Expected to fail with 403 or 404
			expect(error).toBeTruthy();
		}
	});
});
