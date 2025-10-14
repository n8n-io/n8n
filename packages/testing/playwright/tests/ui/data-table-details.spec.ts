import { nanoid } from 'nanoid';

import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';

test.describe('Data Table details view', () => {
	let testDataTableName: string;

	const COLUMN_NAMES = {
		name: 'name',
		age: 'age',
		active: 'active',
		birthday: 'birthday',
	} as const;

	const generateTestData = () => [
		{
			name: `User ${nanoid(8)}`,
			age: '30',
			active: 'true',
			birthday: '2024-01-15',
		},
		{
			name: `User ${nanoid(8)}`,
			age: '25',
			active: 'false',
			birthday: '2024-06-20',
		},
		{
			name: `User ${nanoid(8)}`,
			age: '45',
			active: 'true',
			birthday: '2024-12-10',
		},
	];

	const addColumnsAndGetIds = async (
		n8n: n8nPage,
		method: 'header' | 'table',
	): Promise<{
		nameColumn: string;
		ageColumn: string;
		activeColumn: string;
		birthdayColumn: string;
	}> => {
		const addColumnFn =
			method === 'header'
				? n8n.dataTableDetails.addColumn.bind(n8n.dataTableDetails)
				: n8n.dataTableDetails.addColumn.bind(n8n.dataTableDetails);

		await addColumnFn(COLUMN_NAMES.name, 'string', method);
		await addColumnFn(COLUMN_NAMES.age, 'number', method);
		await addColumnFn(COLUMN_NAMES.active, 'boolean', method);
		await addColumnFn(COLUMN_NAMES.birthday, 'date', method);

		const visibleColumns = n8n.dataTableDetails.getVisibleColumns();
		await expect(visibleColumns).toHaveCount(7);

		await expect(n8n.dataTableDetails.getColumnHeaderByName(COLUMN_NAMES.name)).toBeVisible();
		await expect(n8n.dataTableDetails.getColumnHeaderByName(COLUMN_NAMES.age)).toBeVisible();
		await expect(n8n.dataTableDetails.getColumnHeaderByName(COLUMN_NAMES.active)).toBeVisible();
		await expect(n8n.dataTableDetails.getColumnHeaderByName(COLUMN_NAMES.birthday)).toBeVisible();

		return {
			nameColumn: await n8n.dataTableDetails.getColumnIdByName(COLUMN_NAMES.name),
			ageColumn: await n8n.dataTableDetails.getColumnIdByName(COLUMN_NAMES.age),
			activeColumn: await n8n.dataTableDetails.getColumnIdByName(COLUMN_NAMES.active),
			birthdayColumn: await n8n.dataTableDetails.getColumnIdByName(COLUMN_NAMES.birthday),
		};
	};

	const fillRowData = async (
		n8n: n8nPage,
		rowIndex: number,
		columnIds: {
			nameColumn: string;
			ageColumn: string;
			activeColumn: string;
			birthdayColumn: string;
		},
		data: { name: string; age: string; active: string; birthday: string },
		skipFirstDoubleClick: boolean = false,
	) => {
		await n8n.dataTableDetails.setCellValue(rowIndex, columnIds.nameColumn, data.name, 'string', {
			skipDoubleClick: skipFirstDoubleClick,
		});
		await n8n.dataTableDetails.setCellValue(rowIndex, columnIds.ageColumn, data.age, 'number');
		await n8n.dataTableDetails.setCellValue(
			rowIndex,
			columnIds.activeColumn,
			data.active,
			'boolean',
		);
		await n8n.dataTableDetails.setCellValue(
			rowIndex,
			columnIds.birthdayColumn,
			data.birthday,
			'date',
		);
	};

	const verifyCellValues = async (
		n8n: n8nPage,
		columnIds: {
			nameColumn: string;
			ageColumn: string;
			activeColumn: string;
			birthdayColumn: string;
		},
		testData: Array<{ name: string; age: string; active: string; birthday: string }>,
	) => {
		const firstRowNameValue = await n8n.dataTableDetails.getCellValue(
			0,
			columnIds.nameColumn,
			'string',
		);
		expect(firstRowNameValue).toContain(testData[0].name);

		const secondRowAgeValue = await n8n.dataTableDetails.getCellValue(
			1,
			columnIds.ageColumn,
			'number',
		);
		expect(secondRowAgeValue).toContain(testData[1].age);

		const thirdRowActiveValue = await n8n.dataTableDetails.getCellValue(
			2,
			columnIds.activeColumn,
			'boolean',
		);
		expect(thirdRowActiveValue).toBe(testData[2].active);

		const firstRowBirthdayValue = await n8n.dataTableDetails.getCellValue(
			0,
			columnIds.birthdayColumn,
			'date',
		);
		expect(firstRowBirthdayValue).toContain(testData[0].birthday);
	};

	test.beforeEach(async ({ n8n, api }) => {
		await api.enableFeature('sharing');
		await api.enableFeature('folders');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
		await api.setMaxTeamProjectsQuota(-1);
		await n8n.goHome();

		testDataTableName = `Data Table ${nanoid(8)}`;
		await n8n.page.goto('projects/home/datatables');
		await n8n.dataTable.clickAddDataTableAction();
		await n8n.dataTableComposer.createNewDataTable(testDataTableName);
	});

	test('Should display empty state with default columns', async ({ n8n }) => {
		const dataTableDetailsContainer = n8n.dataTableDetails.getPageWrapper();
		await expect(dataTableDetailsContainer).toBeVisible();

		const emptyStateMessage = n8n.dataTableDetails.getNoRowsMessage();
		await expect(emptyStateMessage).toBeVisible();

		const visibleColumns = n8n.dataTableDetails.getVisibleColumns();
		await expect(visibleColumns).toHaveCount(3);

		await expect(n8n.dataTableDetails.getColumnHeaderByName('id')).toBeVisible();
		await expect(n8n.dataTableDetails.getColumnHeaderByName('createdAt')).toBeVisible();
		await expect(n8n.dataTableDetails.getColumnHeaderByName('updatedAt')).toBeVisible();
	});

	test('Should add columns of different types and rows from the header buttons', async ({
		n8n,
	}) => {
		await expect(n8n.dataTableDetails.getPageWrapper()).toBeVisible();

		const columnIds = await addColumnsAndGetIds(n8n, 'header');
		const testData = generateTestData();

		await n8n.dataTableDetails.addRow();
		await expect(n8n.dataTableDetails.getNoRowsMessage()).toBeHidden();
		await fillRowData(n8n, 0, columnIds, testData[0], true);

		await n8n.dataTableDetails.addRow();
		await fillRowData(n8n, 1, columnIds, testData[1], true);

		await n8n.dataTableDetails.addRow();
		await fillRowData(n8n, 2, columnIds, testData[2], true);

		await verifyCellValues(n8n, columnIds, testData);
	});

	test('Should add columns of different types and rows from the table buttons', async ({ n8n }) => {
		await expect(n8n.dataTableDetails.getPageWrapper()).toBeVisible();

		const columnIds = await addColumnsAndGetIds(n8n, 'table');
		const testData = generateTestData();

		await n8n.dataTableDetails.addRowFromTable();
		await expect(n8n.dataTableDetails.getNoRowsMessage()).toBeHidden();
		await fillRowData(n8n, 0, columnIds, testData[0], true);

		await n8n.dataTableDetails.addRowFromTable();
		await fillRowData(n8n, 1, columnIds, testData[1], true);

		await n8n.dataTableDetails.addRowFromTable();
		await fillRowData(n8n, 2, columnIds, testData[2], true);

		await verifyCellValues(n8n, columnIds, testData);
	});

	test('Should automatically move to second page when adding 21st row', async ({ n8n }) => {
		await expect(n8n.dataTableDetails.getPageWrapper()).toBeVisible();

		await n8n.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');

		for (let i = 0; i < 20; i++) {
			await n8n.dataTableDetails.addRow();
		}

		const rowsOnPage1 = n8n.dataTableDetails.getDataRows();
		await expect(rowsOnPage1).toHaveCount(20);

		await n8n.dataTableDetails.addRow();

		const rowsOnPage2 = n8n.dataTableDetails.getDataRows();
		await expect(rowsOnPage2).toHaveCount(1);
	});

	test('Should select and delete rows', async ({ n8n }) => {
		await expect(n8n.dataTableDetails.getPageWrapper()).toBeVisible();

		await n8n.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');
		const nameColumn = await n8n.dataTableDetails.getColumnIdByName(COLUMN_NAMES.name);

		const rowData = ['Row 1', 'Row 2', 'Row 3', 'Row 4', 'Row 5'];
		for (let i = 0; i < rowData.length; i++) {
			await n8n.dataTableDetails.addRow();
			await n8n.dataTableDetails.setCellValue(i, nameColumn, rowData[i], 'string', {
				skipDoubleClick: true,
			});
		}

		const initialRows = n8n.dataTableDetails.getDataRows();
		await expect(initialRows).toHaveCount(5);

		await n8n.dataTableDetails.selectRow(1);
		await n8n.dataTableDetails.selectRow(3);

		const selectedItemsInfo = n8n.dataTableDetails.getSelectedItemsInfo();
		await expect(selectedItemsInfo).toBeVisible();
		await expect(selectedItemsInfo).toContainText('2');

		await n8n.dataTableDetails.deleteSelectedRows();

		const remainingRows = n8n.dataTableDetails.getDataRows();
		await expect(remainingRows).toHaveCount(3);

		await expect(selectedItemsInfo).toBeHidden();

		const row0Value = await n8n.dataTableDetails.getCellValue(0, nameColumn, 'string');
		expect(row0Value).toContain('Row 1');

		const row1Value = await n8n.dataTableDetails.getCellValue(1, nameColumn, 'string');
		expect(row1Value).toContain('Row 3');

		const row2Value = await n8n.dataTableDetails.getCellValue(2, nameColumn, 'string');
		expect(row2Value).toContain('Row 5');
	});

	test('Should clear selection', async ({ n8n }) => {
		await expect(n8n.dataTableDetails.getPageWrapper()).toBeVisible();

		await n8n.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');
		const nameColumn = await n8n.dataTableDetails.getColumnIdByName(COLUMN_NAMES.name);

		for (let i = 0; i < 3; i++) {
			await n8n.dataTableDetails.addRow();
			await n8n.dataTableDetails.setCellValue(i, nameColumn, `Row ${i + 1}`, 'string', {
				skipDoubleClick: true,
			});
		}

		await n8n.dataTableDetails.selectRow(0);
		await n8n.dataTableDetails.selectRow(1);
		await n8n.dataTableDetails.selectRow(2);

		const selectedItemsInfo = n8n.dataTableDetails.getSelectedItemsInfo();
		await expect(selectedItemsInfo).toBeVisible();
		await expect(selectedItemsInfo).toContainText('3');

		await n8n.dataTableDetails.clearSelection();

		await expect(selectedItemsInfo).toBeHidden();

		const rows = n8n.dataTableDetails.getDataRows();
		await expect(rows).toHaveCount(3);
	});

	test('Should add columns of each type with rows and then delete all columns', async ({ n8n }) => {
		await expect(n8n.dataTableDetails.getPageWrapper()).toBeVisible();

		const columnIds = await addColumnsAndGetIds(n8n, 'header');
		const testData = generateTestData().slice(0, 2);

		await n8n.dataTableDetails.addRow();
		await fillRowData(n8n, 0, columnIds, testData[0], true);

		await n8n.dataTableDetails.addRow();
		await fillRowData(n8n, 1, columnIds, testData[1], true);

		const rows = n8n.dataTableDetails.getDataRows();
		await expect(rows).toHaveCount(2);

		await n8n.dataTableDetails.deleteColumn(COLUMN_NAMES.name);
		await expect(n8n.dataTableDetails.getVisibleColumns()).toHaveCount(6);

		await n8n.dataTableDetails.deleteColumn(COLUMN_NAMES.age);
		await expect(n8n.dataTableDetails.getVisibleColumns()).toHaveCount(5);

		await n8n.dataTableDetails.deleteColumn(COLUMN_NAMES.active);
		await expect(n8n.dataTableDetails.getVisibleColumns()).toHaveCount(4);

		await n8n.dataTableDetails.deleteColumn(COLUMN_NAMES.birthday);

		await expect(n8n.dataTableDetails.getVisibleColumns()).toHaveCount(3);

		await expect(n8n.dataTableDetails.getColumnHeaderByName('id')).toBeVisible();
		await expect(n8n.dataTableDetails.getColumnHeaderByName('createdAt')).toBeVisible();
		await expect(n8n.dataTableDetails.getColumnHeaderByName('updatedAt')).toBeVisible();

		await expect(rows).toHaveCount(2);
	});

	test('Should rename data table from breadcrumbs', async ({ n8n }) => {
		await expect(n8n.dataTableDetails.getPageWrapper()).toBeVisible();

		const nameBreadcrumb = n8n.dataTableDetails.getDataTableBreadcrumb();
		const initialName = (await nameBreadcrumb.textContent())?.toString();

		const newName = `Renamed Table ${nanoid(8)}`;

		await n8n.dataTableDetails.renameDataTable(newName);

		await expect(nameBreadcrumb).toContainText(newName);

		expect(initialName).not.toEqual(newName);
	});

	// eslint-disable-next-line playwright/no-skipped-test
	test.skip('Should filter correctly using column filters', async ({ n8n }) => {
		await expect(n8n.dataTableDetails.getPageWrapper()).toBeVisible();

		await n8n.dataTableDetails.setPageSize('10');

		await n8n.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');
		await n8n.dataTableDetails.addColumn(COLUMN_NAMES.age, 'number', 'header');
		await n8n.dataTableDetails.addColumn(COLUMN_NAMES.active, 'boolean', 'header');
		await n8n.dataTableDetails.addColumn(COLUMN_NAMES.birthday, 'date', 'header');

		const nameColumn = await n8n.dataTableDetails.getColumnIdByName(COLUMN_NAMES.name);
		const ageColumn = await n8n.dataTableDetails.getColumnIdByName(COLUMN_NAMES.age);
		const activeColumn = await n8n.dataTableDetails.getColumnIdByName(COLUMN_NAMES.active);
		const birthdayColumn = await n8n.dataTableDetails.getColumnIdByName(COLUMN_NAMES.birthday);

		const rowsData = [
			{ name: 'User 1', age: '20', active: 'true', birthday: '2024-01-01' },
			{ name: 'User 2', age: '21', active: 'true', birthday: '2024-01-02' },
			{ name: 'User 3', age: '22', active: 'true', birthday: '2024-01-03' },
			{ name: 'User 4', age: '23', active: 'true', birthday: '2024-01-04' },
			{ name: 'User 5', age: '24', active: 'true', birthday: '2024-01-05' },
			{ name: 'User 6', age: '25', active: 'false', birthday: '2024-01-06' },
			{ name: 'User 7', age: '20', active: 'false', birthday: '2024-01-07' },
			{ name: 'User 8', age: '21', active: 'false', birthday: '2024-01-08' },
			{ name: 'User 9', age: '22', active: 'false', birthday: '2024-01-09' },
			{ name: 'User 10', age: '23', active: 'false', birthday: '2024-01-10' },
			{ name: 'User 11', age: '24', active: 'true', birthday: '2024-01-11' },
			{ name: 'User 12', age: '25', active: 'true', birthday: '2024-01-12' },
			{ name: 'User 13', age: '20', active: 'true', birthday: '2024-01-13' },
			{ name: 'User 14', age: '21', active: 'false', birthday: '2024-01-14' },
			{ name: 'User 15', age: '22', active: 'false', birthday: '2024-01-15' },
		] as const;

		for (let i = 0; i < 15; i++) {
			await n8n.dataTableDetails.addRow();
			const rowIndexOnPage = i % 10;
			await n8n.dataTableDetails.setCellValue(
				rowIndexOnPage,
				nameColumn,
				rowsData[i].name,
				'string',
				{
					skipDoubleClick: true,
				},
			);
			await n8n.dataTableDetails.setCellValue(rowIndexOnPage, ageColumn, rowsData[i].age, 'number');
			await n8n.dataTableDetails.setCellValue(
				rowIndexOnPage,
				activeColumn,
				rowsData[i].active,
				'boolean',
			);
			await n8n.dataTableDetails.setCellValue(
				rowIndexOnPage,
				birthdayColumn,
				rowsData[i].birthday,
				'date',
			);
		}

		await expect(n8n.dataTableDetails.getDataRows()).toHaveCount(5);

		await n8n.dataTableDetails.setTextFilter(COLUMN_NAMES.name, 'User 1');
		await expect(n8n.dataTableDetails.getDataRows()).toHaveCount(7);
		await n8n.dataTableDetails.clearColumnFilter(COLUMN_NAMES.name);
		await expect(n8n.dataTableDetails.getDataRows()).toHaveCount(10);

		await n8n.dataTableDetails.setNumberFilter(COLUMN_NAMES.age, '22', 'greaterThan');
		await expect(n8n.dataTableDetails.getDataRows()).toHaveCount(6);
		await n8n.dataTableDetails.clearColumnFilter(COLUMN_NAMES.age);
		await expect(n8n.dataTableDetails.getDataRows()).toHaveCount(10);

		await n8n.dataTableDetails.setBooleanFilter(COLUMN_NAMES.active, true);
		await expect(n8n.dataTableDetails.getDataRows()).toHaveCount(8);
		await n8n.dataTableDetails.clearColumnFilter(COLUMN_NAMES.active);
		await expect(n8n.dataTableDetails.getDataRows()).toHaveCount(10);

		await n8n.dataTableDetails.setDateFilter(COLUMN_NAMES.birthday, '2024-01-10', 'greaterThan');
		await expect(n8n.dataTableDetails.getDataRows()).toHaveCount(5);
		await n8n.dataTableDetails.clearColumnFilter(COLUMN_NAMES.birthday);
		await expect(n8n.dataTableDetails.getDataRows()).toHaveCount(10);

		await n8n.dataTableDetails.setBooleanFilter(COLUMN_NAMES.active, true);
		await n8n.dataTableDetails.setNumberFilter(COLUMN_NAMES.age, '22', 'greaterThan');
		await expect(n8n.dataTableDetails.getDataRows()).toHaveCount(4);
	});

	test('Should reorder columns using drag and drop', async ({ n8n }) => {
		await expect(n8n.dataTableDetails.getPageWrapper()).toBeVisible();

		await n8n.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');
		await n8n.dataTableDetails.addColumn(COLUMN_NAMES.age, 'number', 'header');
		await n8n.dataTableDetails.addColumn(COLUMN_NAMES.active, 'boolean', 'header');
		await n8n.dataTableDetails.addColumn(COLUMN_NAMES.birthday, 'date', 'header');
		await n8n.dataTableDetails.addColumn('email', 'string', 'header');

		const initialOrder = await n8n.dataTableDetails.getColumnOrder();
		expect(initialOrder).toContain(COLUMN_NAMES.name);
		expect(initialOrder).toContain(COLUMN_NAMES.age);
		expect(initialOrder).toContain(COLUMN_NAMES.active);
		expect(initialOrder).toContain(COLUMN_NAMES.birthday);
		expect(initialOrder).toContain('email');

		const nameIndex = initialOrder.indexOf(COLUMN_NAMES.name);
		const activeIndex = initialOrder.indexOf(COLUMN_NAMES.active);
		const emailIndex = initialOrder.indexOf('email');

		await n8n.dataTableDetails.dragColumnToPosition(COLUMN_NAMES.active, COLUMN_NAMES.name);

		const orderAfterFirstDrag = await n8n.dataTableDetails.getColumnOrder();
		const newActiveIndex = orderAfterFirstDrag.indexOf(COLUMN_NAMES.active);
		const newNameIndex = orderAfterFirstDrag.indexOf(COLUMN_NAMES.name);

		expect(newActiveIndex).toBeLessThan(newNameIndex);
		expect(activeIndex).toBeGreaterThan(nameIndex);

		await n8n.dataTableDetails.dragColumnToPosition('email', COLUMN_NAMES.age);

		const orderAfterSecondDrag = await n8n.dataTableDetails.getColumnOrder();
		const emailIndexAfter = orderAfterSecondDrag.indexOf('email');
		const ageIndexAfter = orderAfterSecondDrag.indexOf(COLUMN_NAMES.age);

		expect(emailIndexAfter).toBeLessThan(ageIndexAfter);
		expect(emailIndex).toBeGreaterThan(initialOrder.indexOf(COLUMN_NAMES.age));

		await n8n.dataTableDetails.dragColumnToPosition(COLUMN_NAMES.birthday, COLUMN_NAMES.name);

		const finalOrder = await n8n.dataTableDetails.getColumnOrder();
		const birthdayFinalIndex = finalOrder.indexOf(COLUMN_NAMES.birthday);
		const nameFinalIndex = finalOrder.indexOf(COLUMN_NAMES.name);

		expect(birthdayFinalIndex).toBeLessThan(nameFinalIndex);
	});
});
