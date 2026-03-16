import { nanoid } from 'nanoid';

import { SCHEDULE_TRIGGER_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'System Admin Workflow Permissions',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should allow System Admin to unpublish workflows in projects they are not a member of', async ({
			n8n,
			api,
		}) => {
			// Enable unlimited team projects
			await api.setMaxTeamProjectsQuota(-1);

			// Create a team project
			const teamProject = await api.projects.createProject(`Team Project ${nanoid()}`);

			// Create a member user and add them to the project
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});
			await api.projects.addUserToProject(teamProject.id, member.id, 'project:editor');

			// Create a System Admin (who is NOT a member of the project)
			const admin = await api.publicApi.createUser({
				email: `admin-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Admin',
				role: 'global:admin',
			});

			// Create a workflow in the project as the member
			const memberApi = await api.createApiForUser(member);
			const workflow = await memberApi.workflows.createInProject(teamProject.id, {
				name: `Test Workflow ${nanoid()}`,
			});

			// Add a trigger node to make the workflow publishable
			await memberApi.workflows.update(workflow.id, workflow.versionId, {
				nodes: [
					{
						id: 'schedule-trigger',
						name: SCHEDULE_TRIGGER_NODE_NAME,
						type: 'n8n-nodes-base.scheduleTrigger',
						position: [100, 200],
						parameters: {},
						typeVersion: 1.2,
					},
				],
				connections: {},
			});

			// Get updated version after adding nodes
			const updatedWorkflow = await memberApi.request.get(`/rest/workflows/${workflow.id}`);
			const updatedVersionId = (await updatedWorkflow.json()).data.versionId;

			// Publish the workflow as the member
			await memberApi.workflows.activate(workflow.id, updatedVersionId);

			// Verify workflow is published
			const publishedWorkflow = await memberApi.request.get(`/rest/workflows/${workflow.id}`);
			const publishedData = (await publishedWorkflow.json()).data;
			expect(publishedData.active).toBe(true);

			// Now try to unpublish as the System Admin (who is NOT a member of the project)
			const adminN8n = await n8n.start.withUser(admin);
			await adminN8n.navigate.toWorkflows();

			// Find the workflow in the list
			const workflowCard = adminN8n.workflows.cards.getWorkflow(workflow.name);
			await expect(workflowCard).toBeVisible();

			// System Admin should be able to unpublish the workflow
			await adminN8n.workflows.unpublishWorkflow(workflowCard);

			// Verify unpublish notification appears
			await expect(
				adminN8n.notifications.getNotificationByTitle('Workflow unpublished'),
			).toBeVisible();

			// Verify workflow is unpublished
			const unpublishedWorkflow = await api.request.get(`/rest/workflows/${workflow.id}`);
			const unpublishedData = (await unpublishedWorkflow.json()).data;
			expect(unpublishedData.active).toBe(false);
		});

		test('should allow System Admin to unpublish workflows via API in projects they are not a member of', async ({
			api,
		}) => {
			// Enable project features for API-only tests
			await api.enableProjectFeatures();

			// Enable unlimited team projects
			await api.setMaxTeamProjectsQuota(-1);

			// Create a team project
			const teamProject = await api.projects.createProject(`Team Project ${nanoid()}`);

			// Create a member user and add them to the project
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});
			await api.projects.addUserToProject(teamProject.id, member.id, 'project:editor');

			// Create a System Admin (who is NOT a member of the project)
			const admin = await api.publicApi.createUser({
				email: `admin-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Admin',
				role: 'global:admin',
			});

			// Create a workflow in the project as the member
			const memberApi = await api.createApiForUser(member);
			const workflow = await memberApi.workflows.createInProject(teamProject.id, {
				name: `Test Workflow ${nanoid()}`,
			});

			// Add a trigger node to make the workflow publishable
			await memberApi.workflows.update(workflow.id, workflow.versionId, {
				nodes: [
					{
						id: 'schedule-trigger',
						name: SCHEDULE_TRIGGER_NODE_NAME,
						type: 'n8n-nodes-base.scheduleTrigger',
						position: [100, 200],
						parameters: {},
						typeVersion: 1.2,
					},
				],
				connections: {},
			});

			// Get updated version after adding nodes
			const updatedWorkflow = await memberApi.request.get(`/rest/workflows/${workflow.id}`);
			const updatedVersionId = (await updatedWorkflow.json()).data.versionId;

			// Publish the workflow as the member
			await memberApi.workflows.activate(workflow.id, updatedVersionId);

			// Verify workflow is published
			const publishedWorkflow = await memberApi.request.get(`/rest/workflows/${workflow.id}`);
			const publishedData = (await publishedWorkflow.json()).data;
			expect(publishedData.active).toBe(true);

			// Now try to unpublish as the System Admin (who is NOT a member of the project)
			const adminApi = await api.createApiForUser(admin);
			await adminApi.workflows.deactivate(workflow.id);

			// Verify workflow is unpublished
			const unpublishedWorkflow = await api.request.get(`/rest/workflows/${workflow.id}`);
			const unpublishedData = (await unpublishedWorkflow.json()).data;
			expect(unpublishedData.active).toBe(false);
		});
	},
);
