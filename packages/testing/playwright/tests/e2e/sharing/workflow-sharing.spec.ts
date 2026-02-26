import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe('Workflow Sharing', {
	annotation: [
		{ type: 'owner', description: 'Identity & Access' },
	],
}, () => {
	test('should share workflow with another user via UI', async ({ n8n, api }) => {
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		await n8n.navigate.toWorkflow('new');
		const workflowName = `Test Workflow ${nanoid()}`;
		await n8n.canvas.setWorkflowName(workflowName);
		await n8n.canvas.addNode('Manual Trigger');

		await n8n.canvas.openShareModal();
		await n8n.workflowSharingModal.addUser(member.email);
		await n8n.workflowSharingModal.save();

		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toWorkflows();
		await expect(memberN8n.workflows.cards.getWorkflow(workflowName)).toBeVisible();
	});

	test('should share workflow with another user via API', async ({ api }) => {
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

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

		const memberApi = await api.createApiForUser(member);
		const memberProject = await memberApi.projects.getMyPersonalProject();
		await api.workflows.shareWorkflow(workflow.id, [memberProject.id]);

		const memberWorkflows = await memberApi.workflows.getWorkflows();
		const sharedWorkflow = memberWorkflows.find((w: { id: string }) => w.id === workflow.id);
		expect(sharedWorkflow).toBeTruthy();
		expect(sharedWorkflow?.name).toBe(workflow.name);
	});

	test('should allow shared user to edit shared workflow', async ({ n8n, api }) => {
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

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

		const memberApi = await api.createApiForUser(member);
		const memberProject = await memberApi.projects.getMyPersonalProject();
		await api.workflows.shareWorkflow(workflow.id, [memberProject.id]);

		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toWorkflow(workflow.id);
		await expect(memberN8n.canvas.getCanvasNodes()).toHaveCount(1);

		await memberN8n.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: true });
		await expect(memberN8n.canvas.getCanvasNodes()).toHaveCount(2);
	});

	test('should prevent access to workflow when user is not shared', async ({ api }) => {
		await api.enableProjectFeatures();

		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

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

		const memberApi = await api.createApiForUser(member);
		const response = await memberApi.request.get(`/rest/workflows/${workflow.id}`);
		// With project features enabled, unauthorized access returns 403 (Forbidden)
		expect(response.status()).toBe(403);
	});
});
