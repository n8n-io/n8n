import { test, expect } from '../fixtures/base';

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

	test('should create a new workflow using empty state card @db:reset', async ({ n8n }) => {
		await n8n.workflows.clickNewWorkflowCard();
		await n8n.canvas.importWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');
		await expect(n8n.canvas.getWorkflowTags()).toHaveText(['some-tag-1', 'some-tag-2']);
	});

	test('should create a new workflow using add workflow button', async ({ n8n }) => {
		await n8n.workflows.clickAddWorkflowButton();

		const workflowName = `Test Workflow ${Date.now()}`;
		await n8n.canvas.setWorkflowName(workflowName);
		await n8n.canvas.clickSaveWorkflowButton();

		await expect(
			n8n.notifications.notificationContainerByText(NOTIFICATIONS.CREATED),
		).toBeVisible();
	});

	test('should search for workflows', async ({ n8n }) => {
		const date = Date.now();
		const specificName = `Specific Test ${date}`;
		const genericName = `Generic Test ${date}`;

		await n8n.workflowComposer.createWorkflow(specificName);
		await n8n.goHome();
		await n8n.workflowComposer.createWorkflow(genericName);
		await n8n.goHome();

		// Search for specific workflow
		await n8n.workflows.searchWorkflows(specificName);
		await expect(n8n.workflows.getWorkflowItems()).toHaveCount(1);
		await expect(n8n.workflows.getWorkflowByName(specificName)).toBeVisible();

		// Search with partial term
		await n8n.workflows.clearSearch();
		await n8n.workflows.searchWorkflows(date.toString());
		await expect(n8n.workflows.getWorkflowItems()).toHaveCount(2);

		// Search for non-existent
		await n8n.workflows.clearSearch();
		await n8n.workflows.searchWorkflows('NonExistentWorkflow123');
		await expect(n8n.workflows.getWorkflowItems()).toHaveCount(0);
		await expect(n8n.page.getByText('No workflows found')).toBeVisible();
	});

	test('should archive and unarchive a workflow', async ({ n8n }) => {
		const workflowName = `Archive Test ${Date.now()}`;
		await n8n.workflowComposer.createWorkflow(workflowName);
		await n8n.goHome();

		// Create a second workflow so we can still see filters
		await n8n.workflowComposer.createWorkflow();
		await n8n.goHome();

		const workflow = n8n.workflows.getWorkflowByName(workflowName);
		await n8n.workflows.archiveWorkflow(workflow);
		await expect(
			n8n.notifications.notificationContainerByText(NOTIFICATIONS.ARCHIVED),
		).toBeVisible();

		await expect(workflow).toBeHidden();
		await n8n.workflows.toggleShowArchived();
		await expect(workflow).toBeVisible();

		await n8n.workflows.unarchiveWorkflow(workflow);
		await expect(
			n8n.notifications.notificationContainerByText(NOTIFICATIONS.UNARCHIVED),
		).toBeVisible();
	});

	test('should delete an archived workflow', async ({ n8n }) => {
		const workflowName = `Delete Test ${Date.now()}`;
		await n8n.workflowComposer.createWorkflow(workflowName);
		await n8n.goHome();
		await n8n.workflowComposer.createWorkflow();
		await n8n.goHome();

		const workflow = n8n.workflows.getWorkflowByName(workflowName);
		await n8n.workflows.archiveWorkflow(workflow);
		await expect(
			n8n.notifications.notificationContainerByText(NOTIFICATIONS.ARCHIVED),
		).toBeVisible();

		await n8n.workflows.toggleShowArchived();

		await n8n.workflows.deleteWorkflow(workflow);
		await expect(
			n8n.notifications.notificationContainerByText(NOTIFICATIONS.DELETED),
		).toBeVisible();

		await expect(workflow).toBeHidden();
	});

	test('should filter workflows by tag @db:reset', async ({ n8n }) => {
		const taggedWorkflow =
			await n8n.workflowComposer.createWorkflowFromJsonFile('Test_workflow_1.json');
		await n8n.workflowComposer.createWorkflowFromJsonFile('Test_workflow_2.json');

		await n8n.goHome();
		await n8n.workflows.filterByTag('some-tag-1');

		await expect(n8n.workflows.getWorkflowByName(taggedWorkflow.workflowName)).toBeVisible();
	});

	test('should preserve search and filters in URL @db:reset', async ({ n8n }) => {
		const date = Date.now();
		await n8n.workflowComposer.createWorkflowFromJsonFile(
			'Test_workflow_2.json',
			`My Tagged Workflow ${date}`,
		);
		await n8n.goHome();

		// Apply search
		await n8n.workflows.searchWorkflows('Tagged');

		// Apply tag filter
		await n8n.workflows.filterByTag('other-tag-1');

		// Verify URL contains filters
		await expect(n8n.page).toHaveURL(/search=Tagged/);

		// Reload and verify filters persist
		await n8n.page.reload();

		await expect(n8n.workflows.getSearchBar()).toHaveValue('Tagged');
		await expect(n8n.workflows.getWorkflowByName(`My Tagged Workflow ${date}`)).toBeVisible();
	});

	test('should share a workflow', async ({ n8n }) => {
		const workflowName = `Share Test ${Date.now()}`;
		await n8n.workflowComposer.createWorkflow(workflowName);
		await n8n.goHome();

		await n8n.workflows.shareWorkflow(workflowName);
		await expect(n8n.workflowSharingModal.getModal()).toBeVisible();
	});
});
