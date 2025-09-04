import { nanoid } from 'nanoid';

import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';

async function checkDataTableAndProjectName(
	n8nPage: n8nPage,
	dataTableName: string,
	projectName: string,
) {
	const dataTableDetailsContainer = n8nPage.dataTable.getDataTableDetailsWrapper();
	await expect(dataTableDetailsContainer).toBeVisible();

	const dataTableProjectBreadcrumb = n8nPage.dataTable.getDataTableProjectBreadcrumb();
	await expect(dataTableProjectBreadcrumb).toHaveText(projectName);

	const dataTableBreadcrumb = n8nPage.dataTable.getDataTableBreadcrumb();
	await expect(dataTableBreadcrumb).toContainText(dataTableName);
}

test.describe('Data Table list view', () => {
	test.beforeEach(async ({ n8n, api }) => {
		await api.enableFeature('sharing');
		await api.enableFeature('folders');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
		await api.setMaxTeamProjectsQuota(-1);
		await n8n.goHome();
	});

	test('Should correctly render project data tables in project and everything in overview', async ({
		n8n,
	}) => {
		const TEST_PROJECTS = [
			{
				name: `Project ${nanoid(8)}`,
				dataTable: `Data Table ${nanoid(8)}`,
			},
			{
				name: `Project ${nanoid(8)}`,
				dataTable: `Data Table ${nanoid(8)}`,
			},
		];

		// Create projects and check that they only render their own data tables
		for (const project of TEST_PROJECTS) {
			await n8n.projectComposer.createProject(project.name);
			await n8n.sideBar.clickProjectMenuItem(project.name);

			await n8n.dataTable.clickDataTableProjectTab();
			await n8n.dataTable.clickEmptyStateButton();
			await n8n.dataTableComposer.createNewDataTable(project.dataTable);
			await n8n.sideBar.clickProjectMenuItem(project.name);
			await n8n.dataTable.clickDataTableProjectTab();

			await expect(n8n.dataTable.getDataTableCardByName(project.dataTable)).toBeVisible();
			await expect(n8n.dataTable.getDataTableCards()).toHaveCount(1);
		}

		// Go to overview, both data tables should be visible
		await n8n.sideBar.clickHomeMenuItem();
		await n8n.dataTable.clickDataTableOverviewTab();

		for (const project of TEST_PROJECTS) {
			await expect(n8n.dataTable.getDataTableCardByName(project.dataTable)).toBeVisible();
		}
	});

	test('Should create data table in personal project when created from Overview', async ({
		n8n,
	}) => {
		const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

		await n8n.dataTable.clickDataTableOverviewTab();

		await n8n.dataTable.clickAddResourceDropdown();
		await n8n.dataTable.clickAddDataTableAction();

		const newDataTableModal = n8n.dataTable.getNewDataTableModal();
		await expect(newDataTableModal).toBeVisible();

		await n8n.dataTableComposer.createNewDataTable(TEST_DATA_TABLE_NAME);

		await checkDataTableAndProjectName(n8n, TEST_DATA_TABLE_NAME, 'Personal');
	});

	test('Should create data table from project empty state', async ({ n8n }) => {
		const TEST_PROJECT_NAME = `Project ${nanoid(8)}`;
		const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

		await n8n.projectComposer.createProject(TEST_PROJECT_NAME);

		await n8n.sideBar.clickProjectMenuItem(TEST_PROJECT_NAME);

		await n8n.dataTable.clickDataTableProjectTab();

		const emptyActionBoxButton = n8n.dataTable.getEmptyStateActionBoxButton();
		await expect(emptyActionBoxButton).toHaveText(`Create Data table in "${TEST_PROJECT_NAME}"`);

		await n8n.dataTable.clickEmptyStateButton();

		const newDataTableModal = n8n.dataTable.getNewDataTableModal();
		await expect(newDataTableModal).toBeVisible();

		await n8n.dataTableComposer.createNewDataTable(TEST_DATA_TABLE_NAME);

		await checkDataTableAndProjectName(n8n, TEST_DATA_TABLE_NAME, TEST_PROJECT_NAME);
	});

	test('Should create project data table from header dropdown', async ({ n8n }) => {
		const TEST_PROJECT_NAME = `Project ${nanoid(8)}`;
		const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

		await n8n.projectComposer.createProject(TEST_PROJECT_NAME);

		await n8n.sideBar.clickProjectMenuItem(TEST_PROJECT_NAME);

		await n8n.dataTable.clickDataTableProjectTab();

		await n8n.dataTable.clickAddResourceDropdown();
		await n8n.dataTable.clickAddDataTableAction();

		const newDataTableModal = n8n.dataTable.getNewDataTableModal();
		await expect(newDataTableModal).toBeVisible();

		await n8n.dataTableComposer.createNewDataTable(TEST_DATA_TABLE_NAME);

		await checkDataTableAndProjectName(n8n, TEST_DATA_TABLE_NAME, TEST_PROJECT_NAME);
	});
});
