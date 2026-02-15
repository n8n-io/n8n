import fs from 'fs';

import { MANUAL_TRIGGER_NODE_DISPLAY_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import { resolveFromRoot } from '../../../../../utils/path-helper';

test.describe('Editors', {
	annotation: [
		{ type: 'owner', description: 'NODES' },
	],
}, () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.addInitialNodeToCanvas('Manual Trigger');
	});

	test.describe('SQL Editor', () => {
		test('should preserve changes when opening-closing Postgres node', async ({ n8n }) => {
			await n8n.canvas.addNode('Postgres', { action: 'Execute a SQL query' });

			const sqlEditor = n8n.ndv.getParameterEditor('query');
			await sqlEditor.click();
			await sqlEditor.fill('SELECT * FROM `testTable`');
			await n8n.page.keyboard.press('Escape');

			await n8n.ndv.close();
			await n8n.canvas.openNode('Execute a SQL query');

			await sqlEditor.click();
			await sqlEditor.press('End');
			await sqlEditor.pressSequentially(' LIMIT 10');
			await n8n.page.keyboard.press('Escape');

			await n8n.ndv.close();
			await n8n.canvas.openNode('Execute a SQL query');

			await expect(sqlEditor).toContainText('SELECT * FROM `testTable` LIMIT 10');
		});

		test('should update expression output dropdown as the query is edited', async ({ n8n }) => {
			await n8n.canvas.addNode('MySQL', { action: 'Execute a SQL query', closeNDV: true });

			await n8n.canvas.openNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await n8n.ndv.setPinnedData([{ table: 'test_table' }]);
			await n8n.ndv.close();

			await n8n.canvas.openNode('Execute a SQL query');

			const sqlEditor = n8n.ndv.getParameterEditor('query');
			await sqlEditor.click();
			await sqlEditor.fill('SELECT * FROM {{ $json.table }}');

			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText(
				'SELECT * FROM test_table',
			);
		});

		test('should not push NDV header out with a lot of code in Postgres editor', async ({
			n8n,
		}) => {
			await n8n.canvas.addNode('Postgres', { action: 'Execute a SQL query' });

			const dummyCode = fs.readFileSync(
				resolveFromRoot('fixtures', 'Dummy_javascript.txt'),
				'utf8',
			);

			const sqlEditor = n8n.ndv.getParameterEditor('query');
			await sqlEditor.click();

			await n8n.clipboard.paste(dummyCode);

			await expect(n8n.ndv.getExecuteNodeButton()).toBeVisible();
		});

		test('should not push NDV header out with a lot of code in MySQL editor', async ({ n8n }) => {
			await n8n.canvas.addNode('MySQL', { action: 'Execute a SQL query' });

			const dummyCode = fs.readFileSync(
				resolveFromRoot('fixtures', 'Dummy_javascript.txt'),
				'utf8',
			);

			const sqlEditor = n8n.ndv.getParameterEditor('query');
			await sqlEditor.click();
			await n8n.clipboard.paste(dummyCode);

			await expect(n8n.ndv.getExecuteNodeButton()).toBeVisible();
		});

		test('should not trigger dirty flag if nothing is changed', async ({ n8n }) => {
			await n8n.canvas.addNode('Postgres', { action: 'Execute a SQL query' });
			await n8n.ndv.close();

			await n8n.canvas.waitForSaveWorkflowCompleted();

			await n8n.canvas.openNode('Execute a SQL query');
			await n8n.ndv.close();

			await expect(n8n.canvas.waitForSaveWorkflowCompleted()).rejects.toThrow();
		});

		test('should trigger dirty flag if query is updated', async ({ n8n }) => {
			await n8n.canvas.addNode('Postgres', { action: 'Execute a SQL query' });
			await n8n.ndv.close();

			await n8n.canvas.waitForSaveWorkflowCompleted();

			await n8n.canvas.openNode('Execute a SQL query');

			const sqlEditor = n8n.ndv.getParameterEditor('query');
			await sqlEditor.click();
			await sqlEditor.fill('SELECT * FROM `testTable`');
			await n8n.page.keyboard.press('Escape');

			await n8n.ndv.close();

			await n8n.canvas.waitForSaveWorkflowCompleted();
		});

		test('should allow switching between SQL editors in connected nodes', async ({ n8n }) => {
			await n8n.canvas.addNode('Postgres', { action: 'Execute a SQL query' });

			const sqlEditor = n8n.ndv.getParameterEditor('query');
			await sqlEditor.click();
			await n8n.clipboard.paste('SELECT * FROM `firstTable`');

			await n8n.ndv.close();

			await n8n.canvas.addNode('Postgres', { action: 'Execute a SQL query' });

			await sqlEditor.click();
			await n8n.clipboard.paste('SELECT * FROM `secondTable`');

			await n8n.ndv.close();

			await n8n.canvas.openNode('Execute a SQL query');

			await n8n.ndv.clickFloatingNode('Execute a SQL query1');
			await expect(sqlEditor).toHaveText('SELECT * FROM `secondTable`');

			await n8n.ndv.clickFloatingNode('Execute a SQL query');
			await expect(sqlEditor).toHaveText('SELECT * FROM `firstTable`');
		});
	});

	test.describe('HTML Editor', () => {
		const TEST_ELEMENT_H1 = '<h1>Test</h1>';
		const TEST_ELEMENT_P = '<p>Test</p>';

		test('should preserve changes when opening-closing HTML node', async ({ n8n }) => {
			await n8n.canvas.addNode('HTML', { action: 'Generate HTML template' });

			const htmlEditor = n8n.ndv.getParameterEditor('html');
			await htmlEditor.click();
			await htmlEditor.press('ControlOrMeta+A');
			await htmlEditor.fill(TEST_ELEMENT_H1);
			await n8n.page.keyboard.press('Escape');

			await n8n.ndv.close();
			await n8n.canvas.openNode('HTML');

			await htmlEditor.click();
			await htmlEditor.press('End');
			await htmlEditor.pressSequentially(TEST_ELEMENT_P);
			await n8n.page.keyboard.press('Escape');

			await n8n.ndv.close();
			await n8n.canvas.openNode('HTML');

			await expect(htmlEditor).toContainText(TEST_ELEMENT_H1);
			await expect(htmlEditor).toContainText(TEST_ELEMENT_P);
		});

		test('should not trigger dirty flag if nothing is changed', async ({ n8n }) => {
			await n8n.canvas.addNode('HTML', { action: 'Generate HTML template' });
			await n8n.ndv.close();

			await n8n.canvas.waitForSaveWorkflowCompleted();

			await n8n.canvas.openNode('HTML');
			await n8n.ndv.close();

			await expect(n8n.canvas.waitForSaveWorkflowCompleted()).rejects.toThrow();
		});

		test('should trigger dirty flag if query is updated', async ({ n8n }) => {
			await n8n.canvas.addNode('HTML', { action: 'Generate HTML template' });
			await n8n.ndv.close();

			await n8n.canvas.waitForSaveWorkflowCompleted();

			await n8n.canvas.openNode('HTML');

			const htmlEditor = n8n.ndv.getParameterEditor('html');
			await htmlEditor.click();
			await htmlEditor.press('ControlOrMeta+A');
			await htmlEditor.fill(TEST_ELEMENT_H1);
			await n8n.page.keyboard.press('Escape');

			await n8n.ndv.close();

			await n8n.canvas.waitForSaveWorkflowCompleted();
		});

		test('should allow switching between HTML editors in connected nodes', async ({ n8n }) => {
			await n8n.canvas.addNode('HTML', { action: 'Generate HTML template' });

			const htmlEditor = n8n.ndv.getParameterEditor('html');
			await htmlEditor.click();
			await htmlEditor.press('ControlOrMeta+A');
			await n8n.clipboard.paste('<div>First</div>');

			await n8n.ndv.close();

			await n8n.canvas.addNode('HTML', { action: 'Generate HTML template' });

			await htmlEditor.click();
			await htmlEditor.press('ControlOrMeta+A');
			await n8n.clipboard.paste('<div>Second</div>');

			await n8n.ndv.close();

			await n8n.canvas.openNode('HTML');

			await n8n.ndv.clickFloatingNode('HTML1');
			await expect(htmlEditor).toHaveText('<div>Second</div>');

			await n8n.ndv.clickFloatingNode('HTML');
			await expect(htmlEditor).toHaveText('<div>First</div>');
		});
	});
});
