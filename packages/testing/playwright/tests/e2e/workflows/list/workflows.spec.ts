import { nanoid } from 'nanoid';

import { test, expect } from '../../../../fixtures/base';

const NOTIFICATIONS = {
	CREATED: 'Workflow successfully created',
	ARCHIVED: 'archived',
	UNARCHIVED: 'unarchived',
	DELETED: 'deleted',
};

test.describe('Workflows', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
	});

	test('should create a new workflow using empty state button', async ({ n8n }) => {
		const { projectId } = await n8n.projectComposer.createProject();
		await n8n.page.goto(`projects/${projectId}/workflows`);
		await n8n.workflows.clickNewWorkflowButtonFromProject();
		// New workflows redirect to /workflow/<id>?new=true
		await expect(n8n.page).toHaveURL(/workflow\/[a-zA-Z0-9_-]+\?.*new=true/);
	});

	test('should create a new workflow using add workflow button and save successfully', async ({
		n8n,
	}) => {
		const { projectId } = await n8n.projectComposer.createProject();
		await n8n.page.goto(`projects/${projectId}/workflows`);
		await n8n.workflows.addResource.workflow();

		const uniqueIdForCreate = nanoid(8);
		const workflowName = `Test Workflow ${uniqueIdForCreate}`;
		await n8n.canvas.setWorkflowName(workflowName);
		await n8n.page.keyboard.press('Enter');
		await n8n.canvas.waitForSaveWorkflowCompleted();

		await expect(n8n.notifications.getNotificationByTitle(NOTIFICATIONS.CREATED)).toBeVisible();
	});

	test('should search for workflows', async ({ n8n }) => {
		const uniqueId = nanoid(8);
		const specificName = `Specific Test ${uniqueId}`;
		const genericName = `Generic Test ${uniqueId}`;

		await n8n.workflowComposer.createWorkflowFromSidebar(specificName);
		await n8n.goHome();
		await n8n.workflowComposer.createWorkflow(genericName);
		await n8n.goHome();

		// Search for specific workflow
		await n8n.workflows.search(specificName);
		await expect(n8n.workflows.cards.getWorkflow(specificName)).toBeVisible();

		// Search with partial term
		await n8n.workflows.clearSearch();
		await n8n.workflows.search(uniqueId);
		await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(2);

		// Search for non-existent
		await n8n.workflows.clearSearch();
		await n8n.workflows.search('NonExistentWorkflow123');
		await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(0);
		await expect(n8n.page.getByText('No workflows found')).toBeVisible();
	});

	test('should archive and unarchive a workflow', async ({ n8n }) => {
		const uniqueIdForArchive = nanoid(8);
		const workflowName = `Archive Test ${uniqueIdForArchive}`;
		await n8n.workflowComposer.createWorkflowFromSidebar(workflowName);
		await n8n.goHome();

		// Create a second workflow so we can still see filters
		await n8n.workflowComposer.createWorkflow();
		await n8n.goHome();

		const workflow = n8n.workflows.cards.getWorkflow(workflowName);
		await n8n.workflows.archiveWorkflow(workflow);
		await expect(n8n.notifications.getNotificationByTitle(NOTIFICATIONS.ARCHIVED)).toBeVisible();

		await expect(workflow).toBeHidden();
		await n8n.workflows.toggleShowArchived();
		await expect(workflow).toBeVisible();

		await n8n.workflows.unarchiveWorkflow(workflow);
		await expect(n8n.notifications.getNotificationByTitle(NOTIFICATIONS.UNARCHIVED)).toBeVisible();
	});

	test('should delete an archived workflow', async ({ n8n }) => {
		const uniqueIdForDelete = nanoid(8);
		const workflowName = `Delete Test ${uniqueIdForDelete}`;
		await n8n.workflowComposer.createWorkflowFromSidebar(workflowName);
		await n8n.goHome();
		await n8n.workflowComposer.createWorkflow();
		await n8n.goHome();

		const workflow = n8n.workflows.cards.getWorkflow(workflowName);
		await n8n.workflows.archiveWorkflow(workflow);
		await expect(n8n.notifications.getNotificationByTitle(NOTIFICATIONS.ARCHIVED)).toBeVisible();

		await n8n.workflows.toggleShowArchived();

		await n8n.workflows.deleteWorkflow(workflow);
		await expect(n8n.notifications.getNotificationByTitle(NOTIFICATIONS.DELETED)).toBeVisible();

		await expect(workflow).toBeHidden();
	});

	test('should filter workflows by tag', async ({ n8n }) => {
		const { id: projectId } = await n8n.api.projects.createProject();

		const taggedWorkflow = await n8n.api.workflows.createInProject(projectId);
		const tag = await n8n.api.tags.create(`test-tag-${nanoid(8)}`);
		await n8n.api.workflows.setTags(taggedWorkflow.id, [tag.id]);

		await n8n.api.workflows.createInProject(projectId);

		await n8n.page.goto(`projects/${projectId}/workflows`);
		await n8n.workflows.filterByTag(tag.name);

		await expect(n8n.workflows.cards.getWorkflow(taggedWorkflow.name)).toBeVisible();
		await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(1);
	});

	test('should preserve search and filters in URL', async ({ n8n }) => {
		const { id: projectId } = await n8n.api.projects.createProject();

		const workflowName = `My Tagged Workflow ${nanoid(8)}`;
		const taggedWorkflow = await n8n.api.workflows.createInProject(projectId, {
			name: workflowName,
		});
		const tag1 = await n8n.api.tags.create(`test-tag-${nanoid(8)}`);
		const tag2 = await n8n.api.tags.create(`test-tag-${nanoid(8)}`);
		await n8n.api.workflows.setTags(taggedWorkflow.id, [tag1.id, tag2.id]);

		await n8n.page.goto(`projects/${projectId}/workflows`);
		await n8n.workflows.search('Tagged');
		await n8n.workflows.filterByTag(tag1.name);

		await expect(n8n.page).toHaveURL(/search=Tagged/);

		await n8n.page.reload();

		await expect(n8n.workflows.getSearchBar()).toHaveValue('Tagged');
		await expect(n8n.workflows.cards.getWorkflow(workflowName)).toBeVisible();
	});

	test('should share a workflow', async ({ n8n }) => {
		const uniqueIdForShare = nanoid(8);
		const workflowName = `Share Test ${uniqueIdForShare}`;
		await n8n.workflowComposer.createWorkflow(workflowName);
		await n8n.goHome();

		await n8n.workflows.shareWorkflow(workflowName);
		await expect(n8n.workflowSharingModal.getModal()).toBeVisible();
	});
});
