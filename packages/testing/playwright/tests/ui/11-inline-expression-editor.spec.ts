import {
	EDIT_FIELDS_SET_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	NO_OPERATION_NODE_NAME,
	HACKER_NEWS_NODE_NAME,
} from '../../config/constants';
import { test, expect } from '../../fixtures/base';

const SCHEDULE_PARAMETER_NAME = 'daysInterval';
const HACKER_NEWS_ACTION = 'Get many items';
const HACKER_NEWS_PARAMETER_NAME = 'limit';

test.describe('Inline expression editor', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test.describe('Basic UI functionality', () => {
		test('should open and close inline expression preview', async ({ n8n }) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await n8n.ndv.activateParameterExpressionEditor(SCHEDULE_PARAMETER_NAME);

			await n8n.ndv.getInlineExpressionEditorInput(SCHEDULE_PARAMETER_NAME).click();
			await n8n.ndv.clearExpressionEditor(SCHEDULE_PARAMETER_NAME);
			await n8n.ndv.typeInExpressionEditor('{{ 123', SCHEDULE_PARAMETER_NAME);

			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('123');

			// Click outside to close
			await n8n.ndv.outputPanel.get().click();
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toBeHidden();
		});

		test('should switch between expression and fixed using keyboard', async ({ n8n }) => {
			await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME);

			// Should switch to expression with =
			await n8n.ndv.getAssignmentCollectionAdd('assignments').click();
			await n8n.ndv.fillParameterInputByName('value', '=');

			// Should complete {{ --> {{ | }}
			await n8n.ndv.getInlineExpressionEditorInput().click();
			await n8n.ndv.typeInExpressionEditor('{{');
			await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveText('{{  }}');

			// Should switch back to fixed with backspace on empty expression
			await n8n.ndv.clearExpressionEditor('value');
			const parameterInput = n8n.ndv.getParameterInput('value');
			await parameterInput.click();
			await parameterInput.focus();
			await parameterInput.press('Backspace');
			// eslint-disable-next-line playwright/no-wait-for-timeout
			await n8n.page.waitForTimeout(1000);
			await expect(n8n.ndv.getInlineExpressionEditorInput()).toBeHidden();
		});
	});

	test.describe('Static data', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await n8n.ndv.activateParameterExpressionEditor(SCHEDULE_PARAMETER_NAME);
		});

		test('should resolve primitive resolvables', async ({ n8n }) => {
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ 1 + 2');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('3');

			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ "ab" + "cd"');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('abcd');

			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ true && false');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('false');
		});

		test('should resolve object resolvables', async ({ n8n }) => {
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ { a: 1 }');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText(
				/^\[Object: \{"a": 1\}\]$/,
			);

			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ { a: 1 }.a');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('1');
		});

		test('should resolve array resolvables', async ({ n8n }) => {
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ [1, 2, 3]');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText(/^\[Array: \[1,2,3\]\]$/);

			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ [1, 2, 3][0]');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('1');
		});
	});

	test.describe('Dynamic data', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await n8n.ndv.setPinnedData([{ myStr: 'Monday' }]);
			await n8n.ndv.close();
			await n8n.canvas.addNode(NO_OPERATION_NODE_NAME, { closeNDV: true });
			await n8n.canvas.addNode(HACKER_NEWS_NODE_NAME, { action: HACKER_NEWS_ACTION });
			await n8n.ndv.activateParameterExpressionEditor(HACKER_NEWS_PARAMETER_NAME);
		});

		test('should resolve $parameter[]', async ({ n8n }) => {
			await n8n.ndv.clearExpressionEditor();
			// Resolving $parameter is slow, especially on CI runner
			await n8n.ndv.typeInExpressionEditor('{{ $parameter["operation"]');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('getAll');
		});

		test('should resolve input: $json,$input,$(nodeName)', async ({ n8n }) => {
			// Previous nodes have not run, input is empty
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ $json.myStr');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText(
				'[Execute previous nodes for preview]',
			);

			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ $input.item.json.myStr');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText(
				'[Execute previous nodes for preview]',
			);

			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor("{{ $('No Operation, do nothing').item.json.myStr");
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText(
				'[Execute previous nodes for preview]',
			);

			// Run workflow
			await n8n.ndv.close();
			await n8n.canvas.executeNode(NO_OPERATION_NODE_NAME);
			await n8n.canvas.openNode(HACKER_NEWS_ACTION);
			await n8n.ndv.activateParameterExpressionEditor(HACKER_NEWS_PARAMETER_NAME);

			// Previous nodes have run, input can be resolved
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ $json.myStr');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('Monday');

			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ $input.item.json.myStr');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('Monday');

			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor("{{ $('No Operation, do nothing').item.json.myStr");
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('Monday');
		});
	});
});
