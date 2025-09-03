import { nanoid } from 'nanoid';

import { test, expect } from '../../fixtures/base';

test.describe('Data Tables', () => {
	test.beforeEach(async ({ n8n, api }) => {
		await api.enableFeature('sharing');
		await api.enableFeature('folders');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
		await api.setMaxTeamProjectsQuota(-1);
		await n8n.goHome();
	});

	test('Should create data table in personal project when created from Overview', async ({
		n8n,
	}) => {
		const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

		const dataTableTab = n8n.dataTable.getDataTableOverviewTab();
		await n8n.dataTable.clickDataTableOverviewTab();
		await expect(dataTableTab).toBeVisible();

		const emptyActionBoxButton = n8n.dataTable.getEmptyStateActionBoxButton();
		await expect(emptyActionBoxButton).toHaveText('Create Data Table in "Personal"');
		await n8n.dataTable.clickEmptyStateButton();

		const newDataTableModal = n8n.dataTable.getNewDataTableModal();
		await expect(newDataTableModal).toBeVisible();

		await n8n.dataTableComposer.createNewDataTable(TEST_DATA_TABLE_NAME);

		const dataTableDetailsContainer = n8n.dataTable.getDataTableDetailsWrapper();
		await expect(dataTableDetailsContainer).toBeVisible();

		const dataTableProjectBreadcrumb = n8n.dataTable.getDataTableProjectBreadcrumb();
		await expect(dataTableProjectBreadcrumb).toHaveText('Personal');

		const dataTableBreadcrumb = n8n.dataTable.getDataTableBreadcrumb();
		await expect(dataTableBreadcrumb).toContainText(TEST_DATA_TABLE_NAME);
	});

	test('Should create data table from project empty state', async ({ n8n }) => {
		const TEST_PROJECT_NAME = `Project ${nanoid(8)}`;
		const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

		await n8n.projectComposer.createProject(TEST_PROJECT_NAME);

		await n8n.sideBar.clickProjectMenuItem(TEST_PROJECT_NAME);

		await n8n.dataTable.clickDataTableProjectTab();

		const emptyActionBoxButton = n8n.dataTable.getEmptyStateActionBoxButton();
		await expect(emptyActionBoxButton).toHaveText(`Create Data Table in "${TEST_PROJECT_NAME}"`);

		await n8n.dataTable.clickEmptyStateButton();

		const newDataTableModal = n8n.dataTable.getNewDataTableModal();
		await expect(newDataTableModal).toBeVisible();

		await n8n.dataTableComposer.createNewDataTable(TEST_DATA_TABLE_NAME);

		const dataTableDetailsContainer = n8n.dataTable.getDataTableDetailsWrapper();
		await expect(dataTableDetailsContainer).toBeVisible();

		const dataTableProjectBreadcrumb = n8n.dataTable.getDataTableProjectBreadcrumb();
		await expect(dataTableProjectBreadcrumb).toHaveText(TEST_PROJECT_NAME);

		const dataTableBreadcrumb = n8n.dataTable.getDataTableBreadcrumb();
		await expect(dataTableBreadcrumb).toContainText(TEST_DATA_TABLE_NAME);
	});
});
