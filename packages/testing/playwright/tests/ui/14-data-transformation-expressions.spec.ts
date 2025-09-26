import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';

test.describe('Data transformation expressions', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
	});

	async function addEditFields(n8n: n8nPage): Promise<void> {
		await n8n.canvas.addNode('Edit Fields (Set)');
		await n8n.ndv.getAssignmentCollectionAdd('assignments').click();

		// Switch assignment value to Expression mode
		const assignmentValue = n8n.ndv.getAssignmentValue('assignments');
		await assignmentValue.locator('text=Expression').click();
	}

	test('$json + native string methods', async ({ n8n }) => {
		await n8n.workflows.addResource.workflow();

		await n8n.canvas.addNode('Schedule Trigger');
		await n8n.ndv.setPinnedData([{ myStr: 'Monday' }]);
		await n8n.ndv.close();

		await addEditFields(n8n);

		const input = '{{$json.myStr.toLowerCase() + " is " + "today".toUpperCase()}}';
		const output = 'monday is TODAY';

		await n8n.ndv.clearExpressionEditor();
		await n8n.ndv.typeInExpressionEditor(input);
		await expect(n8n.ndv.getInlineExpressionEditorOutput()).toContainText(output);

		// Execute and verify output
		await n8n.ndv.execute();
		await expect(n8n.ndv.getOutputDataContainer()).toBeVisible();
		await expect(n8n.ndv.getOutputDataContainer()).toContainText(output);
	});

	test('$json + n8n string methods', async ({ n8n }) => {
		await n8n.workflows.addResource.workflow();

		await n8n.canvas.addNode('Schedule Trigger');
		await n8n.ndv.setPinnedData([{ myStr: 'hello@n8n.io is an email' }]);
		await n8n.ndv.close();

		await addEditFields(n8n);

		const input = '{{$json.myStr.extractEmail() + " " + $json.myStr.isEmpty()}}';
		const output = 'hello@n8n.io false';

		await n8n.ndv.clearExpressionEditor();
		await n8n.ndv.typeInExpressionEditor(input);
		await expect(n8n.ndv.getInlineExpressionEditorOutput()).toContainText(output);

		await n8n.ndv.execute();
		await expect(n8n.ndv.getOutputDataContainer()).toBeVisible();
		await expect(n8n.ndv.getOutputDataContainer()).toContainText(output);
	});

	test('$json + native numeric methods', async ({ n8n }) => {
		await n8n.workflows.addResource.workflow();

		await n8n.canvas.addNode('Schedule Trigger');
		await n8n.ndv.setPinnedData([{ myNum: 9.123 }]);
		await n8n.ndv.close();

		await addEditFields(n8n);

		const input = '{{$json.myNum.toPrecision(3)}}';
		const output = '9.12';

		await n8n.ndv.clearExpressionEditor();
		await n8n.ndv.typeInExpressionEditor(input);
		await expect(n8n.ndv.getInlineExpressionEditorOutput()).toContainText(output);

		await n8n.ndv.execute();
		await expect(n8n.ndv.getOutputDataContainer()).toBeVisible();
		await expect(n8n.ndv.getOutputDataContainer()).toContainText(output);
	});

	test('$json + n8n numeric methods', async ({ n8n }) => {
		await n8n.workflows.addResource.workflow();

		await n8n.canvas.addNode('Schedule Trigger');
		await n8n.ndv.setPinnedData([{ myStr: 'hello@n8n.io is an email' }]);
		await n8n.ndv.close();

		await addEditFields(n8n);

		const input = '{{$json.myStr.extractEmail() + " " + $json.myStr.isEmpty()}}';
		const output = 'hello@n8n.io false';

		await n8n.ndv.clearExpressionEditor();
		await n8n.ndv.typeInExpressionEditor(input);
		await expect(n8n.ndv.getInlineExpressionEditorOutput()).toContainText(output);

		await n8n.ndv.execute();
		await expect(n8n.ndv.getOutputDataContainer()).toBeVisible();
		await expect(n8n.ndv.getOutputDataContainer()).toContainText(output);
	});

	test('$json + native array access', async ({ n8n }) => {
		await n8n.workflows.addResource.workflow();

		await n8n.canvas.addNode('Schedule Trigger');
		await n8n.ndv.setPinnedData([{ myArr: [1, 2, 3] }]);
		await n8n.ndv.close();

		await addEditFields(n8n);

		const input = '{{$json.myArr.includes(1) + " " + $json.myArr[2]}}';
		const output = 'true 3';

		await n8n.ndv.clearExpressionEditor();
		await n8n.ndv.typeInExpressionEditor(input);
		await expect(n8n.ndv.getInlineExpressionEditorOutput()).toContainText(output);

		await n8n.ndv.execute();
		const valueElements = n8n.ndv.getOutputDataContainer().locator('[class*=value_]');
		await expect(valueElements).toBeVisible();
		await expect(valueElements).toContainText(output);
	});

	test('$json + n8n array methods', async ({ n8n }) => {
		await n8n.workflows.addResource.workflow();

		await n8n.canvas.addNode('Schedule Trigger');
		await n8n.ndv.setPinnedData([{ myArr: [1, 2, 3] }]);
		await n8n.ndv.close();

		await addEditFields(n8n);

		const input = '{{$json.myArr.first() + " " + $json.myArr.last()}}';
		const output = '1 3';

		await n8n.ndv.clearExpressionEditor();
		await n8n.ndv.typeInExpressionEditor(input);
		await expect(n8n.ndv.getInlineExpressionEditorOutput()).toContainText(output);

		await n8n.ndv.execute();
		const valueElements = n8n.ndv.getOutputDataContainer().locator('[class*=value_]');
		await expect(valueElements).toBeVisible();
		await expect(valueElements).toContainText(output);
	});
});
