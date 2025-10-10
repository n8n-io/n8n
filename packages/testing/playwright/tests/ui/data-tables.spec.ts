import { nanoid } from 'nanoid';

import { test, expect } from '../../fixtures/base';

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
			await n8n.dataTableComposer.createDataTableInNewProject(
				project.name,
				project.dataTable,
				'empty-state',
			);

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

		await n8n.page.goto('projects/home/datatables');

		await n8n.dataTable.clickAddDataTableAction();

		const newDataTableModal = n8n.dataTable.getNewDataTableModal();
		await expect(newDataTableModal).toBeVisible();

		await n8n.dataTableComposer.createNewDataTable(TEST_DATA_TABLE_NAME);

		const dataTableDetailsContainer = n8n.dataTableDetails.getPageWrapper();
		await expect(dataTableDetailsContainer).toBeVisible();

		const dataTableProjectBreadcrumb = n8n.dataTableDetails.getDataTableProjectBreadcrumb();
		await expect(dataTableProjectBreadcrumb).toHaveText('Personal');

		const dataTableBreadcrumb = n8n.dataTableDetails.getDataTableBreadcrumb();
		await expect(dataTableBreadcrumb).toContainText(TEST_DATA_TABLE_NAME);
	});

	test('Should create data table from project empty state', async ({ n8n }) => {
		const TEST_PROJECT_NAME = `Project ${nanoid(8)}`;
		const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

		await n8n.dataTableComposer.createDataTableInNewProject(
			TEST_PROJECT_NAME,
			TEST_DATA_TABLE_NAME,
			'empty-state',
		);

		await expect(n8n.dataTable.getDataTableCardByName(TEST_DATA_TABLE_NAME)).toBeVisible();
	});

	test('Should create project data table from header dropdown', async ({ n8n }) => {
		const TEST_PROJECT_NAME = `Project ${nanoid(8)}`;
		const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

		await n8n.dataTableComposer.createDataTableInNewProject(
			TEST_PROJECT_NAME,
			TEST_DATA_TABLE_NAME,
			'header-dropdown',
		);

		await expect(n8n.dataTable.getDataTableCardByName(TEST_DATA_TABLE_NAME)).toBeVisible();
	});

	test('Should delete data table from card actions', async ({ n8n }) => {
		const TEST_PROJECT_NAME = `Project ${nanoid(8)}`;
		const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

		await n8n.dataTableComposer.createDataTableInNewProject(
			TEST_PROJECT_NAME,
			TEST_DATA_TABLE_NAME,
			'empty-state',
		);

		await n8n.dataTable.clickDataTableCardActionsButton(TEST_DATA_TABLE_NAME);
		await n8n.dataTable.getDataTableCardAction('delete').click();

		await expect(n8n.dataTable.getDeleteDataTableModal()).toBeVisible();
		await n8n.dataTable.clickDeleteDataTableConfirmButton();

		await expect(n8n.dataTable.getDataTableCardByName(TEST_DATA_TABLE_NAME)).toBeHidden();
	});

	test('Should paginate data table list correctly', async ({ n8n }) => {
		const TEST_PROJECT_NAME = `Project ${nanoid(8)}`;
		const TOTAL_DATA_TABLES = 11;
		const PAGE_SIZE = 10;

		const { projectId } = await n8n.projectComposer.createProject(TEST_PROJECT_NAME);
		await n8n.page.goto(`projects/${projectId}/datatables`);

		// Create just enough data tables to require pagination
		for (let i = 0; i < TOTAL_DATA_TABLES; i++) {
			await n8n.dataTable.clickAddDataTableAction();
			await n8n.dataTableComposer.createNewDataTable(`Data Table ${i + 1}`);
			await n8n.sideBar.clickProjectMenuItem(TEST_PROJECT_NAME);
			await n8n.dataTable.clickDataTableProjectTab();
		}
		// Change page size to PAGE_SIZE
		await n8n.dataTable.selectDataTablePageSize(PAGE_SIZE.toString());
		// First page should only have PAGE_SIZE items
		await expect(n8n.dataTable.getDataTableCards()).toHaveCount(PAGE_SIZE);

		// Forward to next page, should show the rest
		await n8n.dataTable.getPaginationNextButton().click();
		await expect(n8n.dataTable.getDataTableCards()).toHaveCount(TOTAL_DATA_TABLES - PAGE_SIZE);
	});
});
