import { test, expect } from '../../fixtures/base';

test.describe('Expression editor modal', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.addInitialNodeToCanvas('Schedule Trigger');
		await n8n.ndv.close();
	});

	test.describe('Keybinds', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.canvas.addNode('Hacker News', { action: 'Get many items' });
			await n8n.ndv.openExpressionEditorModal('limit');
		});

		test('should save the workflow with save keybind', async ({ n8n }) => {
			const input = n8n.ndv.getExpressionEditorModalInput();
			await n8n.ndv.fillExpressionEditorModalInput('{{ "hello"');
			await expect(n8n.ndv.getExpressionEditorModalOutput()).toContainText('hello');

			await input.press('ControlOrMeta+s');
			await n8n.notifications.waitForNotificationAndClose('Saved successfully');
		});
	});

	test.describe('Static data', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.canvas.addNode('Hacker News', { action: 'Get many items' });
			await n8n.ndv.openExpressionEditorModal('limit');
		});

		test('should resolve primitive resolvables', async ({ n8n }) => {
			const output = n8n.ndv.getExpressionEditorModalOutput();

			// Test number addition
			await n8n.ndv.fillExpressionEditorModalInput('{{ 1 + 2 }}');
			await expect(output).toContainText(/^3$/);

			// Test string concatenation
			await n8n.ndv.fillExpressionEditorModalInput('{{ "ab" + "cd" }}');
			await expect(output).toContainText(/^abcd$/);

			// Test boolean logic
			await n8n.ndv.fillExpressionEditorModalInput('{{ true && false }}');
			await expect(output).toContainText(/^false$/);
		});

		test('should resolve object resolvables', async ({ n8n }) => {
			const output = n8n.ndv.getExpressionEditorModalOutput();

			// Test object creation
			await n8n.ndv.fillExpressionEditorModalInput('{{ { a : 1 } }}');
			await expect(output).toContainText(/^\[Object: \{"a": 1\}\]$/);

			// Test object property access
			await n8n.ndv.fillExpressionEditorModalInput('{{ { a : 1 }.a }}');
			await expect(output).toContainText(/^1$/);
		});

		test('should resolve array resolvables', async ({ n8n }) => {
			const output = n8n.ndv.getExpressionEditorModalOutput();

			// Test array creation
			await n8n.ndv.fillExpressionEditorModalInput('{{ [1, 2, 3] }}');
			await expect(output).toContainText(/^\[Array: \[1,2,3\]\]$/);

			// Test array element access
			await n8n.ndv.fillExpressionEditorModalInput('{{ [1, 2, 3][0] }}');
			await expect(output).toContainText(/^1$/);
		});
	});

	test.describe('Dynamic data', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.canvas.openNode('Schedule Trigger');
			await n8n.ndv.setPinnedData([{ myStr: 'Monday' }]);
			await n8n.ndv.clickBackToCanvasButton();
			await n8n.canvas.addNode('No Operation, do nothing', { closeNDV: true });
			await n8n.canvas.addNode('Hacker News', { action: 'Get many items' });
			await n8n.ndv.openExpressionEditorModal('limit');
		});

		test('should resolve $parameter[]', async ({ n8n }) => {
			const output = n8n.ndv.getExpressionEditorModalOutput();
			await n8n.ndv.fillExpressionEditorModalInput('{{ $parameter["operation"] }}');
			await expect(output).toHaveText('getAll');
		});

		test('should resolve input: $json,$input,$(nodeName)', async ({ n8n }) => {
			const output = n8n.ndv.getExpressionEditorModalOutput();

			// Previous nodes have not run, input is empty
			await n8n.ndv.fillExpressionEditorModalInput('{{ $json.myStr }}');
			await expect(output).toHaveText('[Execute previous nodes for preview]');
			await n8n.ndv.fillExpressionEditorModalInput('{{ $input.item.json.myStr }}');
			await expect(output).toHaveText('[Execute previous nodes for preview]');
			await n8n.ndv.fillExpressionEditorModalInput("{{ $('Schedule Trigger').item.json.myStr }}");
			await expect(output).toHaveText('[Execute previous nodes for preview]');

			// Run workflow
			await output.click();
			await n8n.page.keyboard.press('Escape');
			await n8n.ndv.clickBackToCanvasButton();
			await n8n.canvas.executeNode('No Operation, do nothing');
			await n8n.canvas.openNode('Get many items');
			await n8n.ndv.openExpressionEditorModal('limit');

			// Previous nodes have run, input can be resolved
			await n8n.ndv.fillExpressionEditorModalInput('{{ $json.myStr }}');
			await expect(output).toHaveText('Monday');
			await n8n.ndv.fillExpressionEditorModalInput('{{ $input.item.json.myStr }}');
			await expect(output).toHaveText('Monday');
			await n8n.ndv.fillExpressionEditorModalInput("{{ $('Schedule Trigger').item.json.myStr }}");
			await expect(output).toHaveText('Monday');
		});
	});
});
