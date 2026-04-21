import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Workflow Sharing',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
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

		// N8N-9926: Regression test - Member users cannot see other users in share modal
		test('should allow member users to see other users in personal workflow share modal', async ({
			n8n,
			api,
		}) => {
			// Create two member users
			const member1 = await api.publicApi.createUser({
				email: `member1-${nanoid()}@test.com`,
				firstName: 'Member',
				lastName: 'One',
				role: 'global:member',
			});

			const member2 = await api.publicApi.createUser({
				email: `member2-${nanoid()}@test.com`,
				firstName: 'Member',
				lastName: 'Two',
				role: 'global:member',
			});

			// Log in as member1 and create a personal workflow
			const member1N8n = await n8n.start.withUser(member1);
			await member1N8n.navigate.toWorkflow('new');
			const workflowName = `Member1 Workflow ${nanoid()}`;
			await member1N8n.canvas.setWorkflowName(workflowName);
			await member1N8n.canvas.addNode('Manual Trigger');

			// Open share modal
			await member1N8n.canvas.openShareModal();

			// Click the users select dropdown to open it
			await member1N8n.workflowSharingModal.getUsersSelect().click();

			// Member2's personal project should be visible in the dropdown
			// Personal projects show "FirstName LastName (Personal space)"
			const member2Name = `${member2.firstName} ${member2.lastName}`;
			const dropdown = member1N8n.page.locator('.el-select-dropdown__item');

			// This assertion should pass but will fail due to N8N-9926
			// GET /rest/projects returns only projects the caller owns/is a member of,
			// so member2's personal project is not returned to member1
			await expect(dropdown.filter({ hasText: member2Name })).toBeVisible();
		});

		// N8N-9926: Control test - Admins should still see all users (not affected by regression)
		test('should allow admin users to see all users in personal workflow share modal', async ({
			n8n,
			api,
		}) => {
			// Create an admin and a member user
			const admin = await api.publicApi.createUser({
				email: `admin-${nanoid()}@test.com`,
				firstName: 'Admin',
				lastName: 'User',
				role: 'global:admin',
			});

			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
				role: 'global:member',
			});

			// Log in as admin and create a personal workflow
			const adminN8n = await n8n.start.withUser(admin);
			await adminN8n.navigate.toWorkflow('new');
			const workflowName = `Admin Workflow ${nanoid()}`;
			await adminN8n.canvas.setWorkflowName(workflowName);
			await adminN8n.canvas.addNode('Manual Trigger');

			// Open share modal
			await adminN8n.canvas.openShareModal();

			// Click the users select dropdown to open it
			await adminN8n.workflowSharingModal.getUsersSelect().click();

			// Member's personal project should be visible for admins (this should pass)
			const memberName = `${member.firstName} ${member.lastName}`;
			const dropdown = adminN8n.page.locator('.el-select-dropdown__item');
			await expect(dropdown.filter({ hasText: memberName })).toBeVisible();
		});
	},
);
