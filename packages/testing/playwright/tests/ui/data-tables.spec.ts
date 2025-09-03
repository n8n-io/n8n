import { nanoid } from 'nanoid';

import { test, expect } from '../../fixtures/base';

test.describe('Data Tables', () => {
	test.beforeEach(async ({ n8n, api, setupRequirements }) => {
		await api.enableFeature('sharing');
		await api.enableFeature('folders');
		await n8n.goHome();
	});

	test('Should create data table in personal project when created from Overview', async ({
		n8n,
	}) => {
		const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

		const dataTableTab = n8n.dataStore.getDataTableTab();
		await n8n.dataStore.clickDataTableTab();
		await expect(dataTableTab).toBeVisible();

		const emptyActionBoxButton = n8n.dataStore.getEmptyStateActionBoxButton();
		await expect(emptyActionBoxButton).toHaveText('Create Data Table in "Personal"');
		await n8n.dataStore.clickEmptyStateButton();

		const newDataTableModal = n8n.dataStore.getNewDataTableModal();
		await expect(newDataTableModal).toBeVisible();

		await n8n.dataTableComposer.createNewDataTable(TEST_DATA_TABLE_NAME);

		const dataTableDetailsContainer = n8n.dataStore.getDataTableDetailsWrapper();
		await expect(dataTableDetailsContainer).toBeVisible();

		const dataTableProjectBreadcrumb = n8n.dataStore.getDataTableProjectBreadcrumb();
		await expect(dataTableProjectBreadcrumb).toHaveText('Personal');

		const dataTableBreadcrumb = n8n.dataStore.getDataTableBreadcrumb();
		await expect(dataTableBreadcrumb).toContainText(TEST_DATA_TABLE_NAME);
	});
});
