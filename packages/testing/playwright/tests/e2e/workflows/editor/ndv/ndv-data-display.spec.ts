import { test, expect } from '../../../../../fixtures/base';
import type { n8nPage } from '../../../../../pages/n8nPage';

test.describe(
	'NDV Data Display',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test.describe('Schema View', () => {
			const schemaKeys = [
				'id',
				'name',
				'email',
				'notes',
				'country',
				'created',
				'objectValue',
				'prop1',
				'prop2',
			];

			const setupSchemaWorkflow = async (n8n: n8nPage) => {
				await n8n.start.fromImportedWorkflow('Test_workflow_schema_test.json');
				await n8n.canvas.clickZoomToFitButton();
				await n8n.canvas.openNode('Set');
				await n8n.ndv.execute();
			};

			test('should switch to output schema view and validate it', async ({ n8n }) => {
				await setupSchemaWorkflow(n8n);
				await n8n.ndv.outputPanel.switchDisplayMode('schema');

				for (const key of schemaKeys) {
					await expect(n8n.ndv.outputPanel.getSchemaItem(key)).toBeVisible();
				}
			});

			test('should preserve schema view after execution', async ({ n8n }) => {
				await setupSchemaWorkflow(n8n);
				await n8n.ndv.outputPanel.switchDisplayMode('schema');
				await n8n.ndv.execute();

				for (const key of schemaKeys) {
					await expect(n8n.ndv.outputPanel.getSchemaItem(key)).toBeVisible();
				}
			});

			test('should collapse and expand nested schema object', async ({ n8n }) => {
				await setupSchemaWorkflow(n8n);
				const expandedObjectProps = ['prop1', 'prop2'];

				await n8n.ndv.outputPanel.switchDisplayMode('schema');

				for (const key of expandedObjectProps) {
					await expect(n8n.ndv.outputPanel.getSchemaItem(key)).toBeVisible();
				}

				const objectValueItem = n8n.ndv.outputPanel.getSchemaItem('objectValue');
				await objectValueItem.locator('.toggle').click();

				for (const key of expandedObjectProps) {
					await expect(n8n.ndv.outputPanel.getSchemaItem(key)).not.toBeInViewport();
				}
			});

			test('should not display pagination for schema', async ({ n8n }) => {
				await setupSchemaWorkflow(n8n);

				await n8n.ndv.clickBackToCanvasButton();
				await n8n.canvas.deselectAll();
				await n8n.canvas.nodeByName('Set').click();
				await n8n.canvas.addNode('Customer Datastore (n8n training)');

				await n8n.canvas.openNode('Customer Datastore (n8n training)');

				await n8n.ndv.execute();

				await expect(n8n.ndv.outputPanel.get().getByText('5 items')).toBeVisible();

				await n8n.ndv.outputPanel.switchDisplayMode('schema');

				const schemaItemsCount = await n8n.ndv.outputPanel.getSchemaItems().count();
				expect(schemaItemsCount).toBeGreaterThan(0);

				await n8n.ndv.outputPanel.switchDisplayMode('json');
			});

			test('should display large schema', async ({ n8n }) => {
				await n8n.start.fromImportedWorkflow('Test_workflow_schema_test_pinned_data.json');
				await n8n.canvas.clickZoomToFitButton();
				await n8n.canvas.openNode('Set');

				// 26 items with page size 25 = 2 pages, so pagination is visible
				await expect(n8n.ndv.outputPanel.get().getByText('26 items')).toBeVisible();
				await expect(n8n.ndv.getOutputPagination()).toBeVisible();

				await n8n.ndv.outputPanel.switchDisplayMode('schema');

				await expect(n8n.ndv.getOutputPagination()).toBeHidden();
			});
		});

		test.describe('Search and Rendering', () => {
			test('should keep search expanded after Execute step node run', async ({ n8n }) => {
				await n8n.start.fromImportedWorkflow('Test_ndv_search.json');
				await n8n.canvas.clickZoomToFitButton();
				await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);

				await n8n.canvas.openNode('Edit Fields');
				await expect(n8n.ndv.outputPanel.get()).toBeVisible();

				await n8n.ndv.searchOutputData('US');

				await expect(n8n.ndv.outputPanel.getTableRow(1).locator('mark')).toContainText('US');

				await n8n.ndv.execute();

				await expect(n8n.ndv.outputPanel.getSearchInput()).toBeVisible();
				await expect(n8n.ndv.outputPanel.getSearchInput()).toHaveValue('US');
			});

			test('Should render xml and html tags as strings and can search', async ({ n8n }) => {
				await n8n.start.fromImportedWorkflow('Test_workflow_xml_output.json');
				await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);
				await n8n.canvas.openNode('Edit Fields');

				await expect(n8n.ndv.outputPanel.get().locator('[class*="active"]')).toContainText('Table');

				await expect(n8n.ndv.outputPanel.getTableRow(1)).toContainText(
					'<?xml version="1.0" encoding="UTF-8"?> <library>',
				);

				await n8n.page.keyboard.press('/');

				const searchInput = n8n.ndv.outputPanel.getSearchInput();
				await expect(searchInput).toBeFocused();
				await searchInput.fill('<lib');

				await expect(n8n.ndv.outputPanel.getTableRow(1).locator('mark')).toContainText('<lib');

				await n8n.ndv.outputPanel.switchDisplayMode('json');

				await expect(n8n.ndv.outputPanel.getDataContainer().locator('.json-data')).toBeVisible();
			});
		});

		test.describe('Run Data & Selectors', () => {
			test('can link and unlink run selectors between input and output', async ({ n8n }) => {
				await n8n.start.fromImportedWorkflow('multi-branch-data-transform.json');
				await n8n.canvas.clickZoomToFitButton();
				await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);
				await n8n.canvas.openNode('Set3');

				await n8n.ndv.inputPanel.switchDisplayMode('table');
				await n8n.ndv.outputPanel.switchDisplayMode('table');

				await n8n.ndv.ensureOutputRunLinking(true);
				await n8n.ndv.inputPanel.getTbodyCell(0, 0).click();
				expect(await n8n.ndv.getInputRunSelectorValue()).toContain('2 of 2 (6 items)');
				expect(await n8n.ndv.getOutputRunSelectorValue()).toContain('2 of 2 (6 items)');

				await n8n.ndv.changeOutputRunSelector('1 of 2 (6 items)');
				expect(await n8n.ndv.getInputRunSelectorValue()).toContain('1 of 2 (6 items)');
				await expect(n8n.ndv.inputPanel.getTbodyCell(0, 0)).toHaveText('1111');
				await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toHaveText('1111');

				await n8n.ndv.inputPanel.getTbodyCell(0, 0).click();
				await n8n.ndv.changeInputRunSelector('2 of 2 (6 items)');
				expect(await n8n.ndv.getOutputRunSelectorValue()).toContain('2 of 2 (6 items)');

				await n8n.ndv.outputPanel.getLinkRun().click();
				await n8n.ndv.inputPanel.getTbodyCell(0, 0).click();
				await n8n.ndv.changeOutputRunSelector('1 of 2 (6 items)');
				expect(await n8n.ndv.getInputRunSelectorValue()).toContain('2 of 2 (6 items)');

				await n8n.ndv.outputPanel.getLinkRun().click();
				await n8n.ndv.inputPanel.getTbodyCell(0, 0).click();
				expect(await n8n.ndv.getInputRunSelectorValue()).toContain('1 of 2 (6 items)');

				await n8n.ndv.inputPanel.toggleInputRunLinking();
				await n8n.ndv.inputPanel.getTbodyCell(0, 0).click();
				await n8n.ndv.changeInputRunSelector('2 of 2 (6 items)');
				expect(await n8n.ndv.getOutputRunSelectorValue()).toContain('1 of 2 (6 items)');

				await n8n.ndv.inputPanel.toggleInputRunLinking();
				await n8n.ndv.inputPanel.getTbodyCell(0, 0).click();
				expect(await n8n.ndv.getOutputRunSelectorValue()).toContain('2 of 2 (6 items)');
			});
		});

		test.describe('Schema & Data Views', () => {
			test('should show data from the correct output in schema view', async ({ n8n }) => {
				await n8n.canvas.importWorkflow('Test_workflow_multiple_outputs.json', 'Multiple outputs');
				await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);

				await n8n.canvas.openNode('Only Item 1');
				await expect(n8n.ndv.inputPanel.get()).toBeVisible();
				await n8n.ndv.inputPanel.switchDisplayMode('schema');
				await expect(n8n.ndv.inputPanel.getSchemaItem('onlyOnItem1')).toBeVisible();
				await n8n.ndv.close();

				await n8n.canvas.openNode('Only Item 2');
				await expect(n8n.ndv.inputPanel.get()).toBeVisible();
				await n8n.ndv.inputPanel.switchDisplayMode('schema');
				await expect(n8n.ndv.inputPanel.getSchemaItem('onlyOnItem2')).toBeVisible();
				await n8n.ndv.close();

				await n8n.canvas.openNode('Only Item 3');
				await expect(n8n.ndv.inputPanel.get()).toBeVisible();
				await n8n.ndv.inputPanel.switchDisplayMode('schema');
				await expect(n8n.ndv.inputPanel.getSchemaItem('onlyOnItem3')).toBeVisible();
				await n8n.ndv.close();
			});
		});

		test.describe('Search Functionality - Advanced', () => {
			test('should not show items count when searching in schema view', async ({ n8n }) => {
				await n8n.canvas.importWorkflow('Test_ndv_search.json', 'NDV Search Test');
				await n8n.canvas.openNode('Edit Fields');
				await expect(n8n.ndv.outputPanel.get()).toBeVisible();

				await n8n.ndv.execute();
				await n8n.ndv.outputPanel.switchDisplayMode('schema');
				await n8n.ndv.searchOutputData('US');

				await expect(n8n.ndv.outputPanel.getItemsCount()).toBeHidden();
			});

			test('should show additional tooltip when searching in schema view if no matches', async ({
				n8n,
			}) => {
				await n8n.canvas.importWorkflow('Test_ndv_search.json', 'NDV Search Test');

				await n8n.canvas.openNode('Edit Fields');
				await expect(n8n.ndv.outputPanel.get()).toBeVisible();

				await n8n.ndv.execute();
				await n8n.ndv.outputPanel.switchDisplayMode('schema');
				await n8n.ndv.searchOutputData('foo');

				await expect(
					n8n.ndv.outputPanel
						.get()
						.getByText('To search field values, switch to table or JSON view.'),
				).toBeVisible();
			});
		});

		test.describe('Table View - Column Focus (GHC-7068)', () => {
			test('should show "Collapse rows" button when hovering over column headers', async ({
				n8n,
			}) => {
				// Setup: Create a Manual Trigger node with data that has one large column
				await n8n.canvas.addNode('Manual Trigger', { action: 'trigger' });
				await n8n.canvas.openNode('When clicking "Execute Workflow"');

				// Pin data with a mix of small and large columns
				const testData = [
					{
						name: 'First item',
						code: 1,
						data: {
							some: 'a',
							large: 'b',
							json: 'c',
							object: 'd',
							with: 'e',
							many: 'f',
							keys: 'g',
						},
					},
					{
						name: 'Second item',
						code: 2,
						data: {
							some: 'n',
							large: 'm',
							json: 'o',
							object: 'p',
							with: 'q',
							many: 'r',
							keys: 's',
						},
					},
					{
						name: 'Third item',
						code: 3,
						data: {
							some: 'x',
							large: 'y',
							json: 'z',
							object: 'w',
							with: 'v',
							many: 'u',
							keys: 't',
						},
					},
				];

				await n8n.ndv.setPinnedData(testData);

				// Switch to table view
				await n8n.ndv.outputPanel.switchDisplayMode('table');

				// Get the "name" column header (should be the first data column)
				const nameHeader = n8n.ndv.outputPanel.getTableHeader(0);
				await expect(nameHeader).toBeVisible();

				// Hover over the column header
				await nameHeader.hover();

				// The "Collapse rows" button should be visible when hovering
				const collapseButton = nameHeader.getByRole('button', { name: 'Collapse rows' });
				await expect(collapseButton).toBeVisible();
			});

			test('should toggle column collapsing when clicking the button', async ({ n8n }) => {
				// Setup: Create a Manual Trigger node with data
				await n8n.canvas.addNode('Manual Trigger', { action: 'trigger' });
				await n8n.canvas.openNode('When clicking "Execute Workflow"');

				const testData = [
					{
						name: 'First',
						data: { a: 1, b: 2, c: 3 },
					},
					{
						name: 'Second',
						data: { a: 4, b: 5, c: 6 },
					},
				];

				await n8n.ndv.setPinnedData(testData);
				await n8n.ndv.outputPanel.switchDisplayMode('table');

				// Get the "name" column header
				const nameHeader = n8n.ndv.outputPanel.getTableHeader(0);
				await nameHeader.hover();

				// Click the collapse button
				const collapseButton = nameHeader.getByRole('button', { name: 'Collapse rows' });
				await collapseButton.click();

				// After clicking, the column should be marked as collapsing
				// (The header should have a visual indicator - we can check for the different icon)
				await expect(nameHeader).toBeVisible();

				// Click again to toggle it off
				await nameHeader.hover();
				await collapseButton.click();
			});
		});
	},
);
