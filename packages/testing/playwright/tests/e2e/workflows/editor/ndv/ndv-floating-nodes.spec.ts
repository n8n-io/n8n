import { test, expect } from '../../../../../fixtures/base';

test.describe('NDV Floating Nodes Navigation', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should traverse floating nodes with mouse', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Floating_Nodes.json');
		await n8n.canvas.getCanvasNodes().first().dblclick();
		await expect(n8n.ndv.getContainer()).toBeVisible();

		await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeHidden();
		await expect(n8n.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();
		for (let i = 0; i < 4; i++) {
			await n8n.ndv.clickFloatingNodeByPosition('outputMain');
			await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();
			await expect(n8n.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();

			await n8n.ndv.close();
			await expect(n8n.canvas.getSelectedNodes()).toHaveCount(1);

			await n8n.canvas.getSelectedNodes().first().dblclick();
			await expect(n8n.ndv.getContainer()).toBeVisible();
		}

		await n8n.ndv.clickFloatingNodeByPosition('outputMain');
		await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();

		for (let i = 0; i < 4; i++) {
			await n8n.ndv.clickFloatingNodeByPosition('inputMain');
			await expect(n8n.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();
			await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();
		}

		await n8n.ndv.clickFloatingNodeByPosition('inputMain');
		await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeHidden();
		await expect(n8n.ndv.getFloatingNodeByPosition('inputSub')).toBeHidden();
		await expect(n8n.ndv.getFloatingNodeByPosition('outputSub')).toBeHidden();

		await n8n.ndv.close();
		await expect(n8n.canvas.getSelectedNodes()).toHaveCount(1);
	});

	test('should traverse floating nodes with keyboard', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Floating_Nodes.json');

		await n8n.canvas.getCanvasNodes().first().dblclick();
		await expect(n8n.ndv.getContainer()).toBeVisible();

		await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeHidden();
		await expect(n8n.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();
		for (let i = 0; i < 4; i++) {
			await n8n.ndv.navigateToNextFloatingNodeWithKeyboard();
			await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();
			await expect(n8n.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();

			await n8n.ndv.close();
			await expect(n8n.canvas.getSelectedNodes()).toHaveCount(1);

			await n8n.canvas.getSelectedNodes().first().dblclick();
			await expect(n8n.ndv.getContainer()).toBeVisible();
		}

		await n8n.ndv.navigateToNextFloatingNodeWithKeyboard();
		await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();

		for (let i = 0; i < 4; i++) {
			await n8n.ndv.navigateToPreviousFloatingNodeWithKeyboard();
			await expect(n8n.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();
			await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();
		}

		await n8n.ndv.navigateToPreviousFloatingNodeWithKeyboard();
		await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeHidden();
		await expect(n8n.ndv.getFloatingNodeByPosition('inputSub')).toBeHidden();
		await expect(n8n.ndv.getFloatingNodeByPosition('outputSub')).toBeHidden();

		await n8n.ndv.close();
		await expect(n8n.canvas.getSelectedNodes()).toHaveCount(1);
	});

	test('should connect floating sub-nodes', async ({ n8n }) => {
		await n8n.canvas.addNode('AI Agent', { closeNDV: false });
		await expect(n8n.ndv.getContainer()).toBeVisible();

		await n8n.ndv.connectAISubNode('ai_languageModel', 'Anthropic Chat Model');
		await n8n.ndv.connectAISubNode('ai_memory', 'Redis Chat Memory');
		await n8n.ndv.connectAISubNode('ai_tool', 'HTTP Request Tool');

		await expect(n8n.ndv.getNodesWithIssues()).toHaveCount(3);
	});

	test('should have the floating nodes in correct order', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Floating_Nodes.json');

		await n8n.canvas.openNode('Merge');
		await expect(n8n.ndv.getContainer()).toBeVisible();

		expect(await n8n.ndv.getFloatingNodeCount('inputMain')).toBe(2);
		await n8n.ndv.verifyFloatingNodeName('inputMain', 'Edit Fields1', 0);
		await n8n.ndv.verifyFloatingNodeName('inputMain', 'Edit Fields0', 1);

		await n8n.ndv.close();

		await n8n.canvas.openNode('Merge1');
		await expect(n8n.ndv.getContainer()).toBeVisible();

		expect(await n8n.ndv.getFloatingNodeCount('inputMain')).toBe(2);
		await n8n.ndv.verifyFloatingNodeName('inputMain', 'Edit Fields0', 0);
		await n8n.ndv.verifyFloatingNodeName('inputMain', 'Edit Fields1', 1);
	});
});
