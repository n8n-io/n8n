import { test, expect } from '../../../fixtures/base';

test.describe(
	'Pokemon node',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test('should appear in node picker when searching "Pokemon"', async ({ n8n }) => {
			await n8n.canvas.clickNodeCreatorPlusButton();
			await n8n.canvas.fillNodeCreatorSearchBar('Pokemon');

			await expect(n8n.canvas.nodeCreatorNodeItem('Pokemon')).toBeVisible();
		});

		test('should show nameOrId parameter for Get operation', async ({ n8n }) => {
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Pokemon', { closeNDV: false });

			await expect(n8n.ndv.getParameterInput('nameOrId')).toBeVisible();
		});

		test('should show returnAll parameter when switching to Get Many operation', async ({
			n8n,
		}) => {
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Pokemon', { closeNDV: false });

			await n8n.ndv.selectOptionInParameterDropdown('operation', 'Get Many');

			await expect(n8n.ndv.getParameterInput('returnAll')).toBeVisible();
		});

		test('should execute Get and return pikachu data', async ({ n8n }) => {
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Pokemon', { closeNDV: false });

			await n8n.ndv.fillParameterInputByName('nameOrId', 'pikachu');
			await n8n.ndv.execute();

			await expect(n8n.ndv.outputPanel.get()).toContainText('pikachu');
		});

		test('should execute Get Many and return multiple items', async ({ n8n }) => {
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Pokemon', { closeNDV: false });

			await n8n.ndv.selectOptionInParameterDropdown('operation', 'Get Many');
			await n8n.ndv.fillParameterInputByName('limit', '3');
			await n8n.ndv.execute();

			await expect(n8n.ndv.outputPanel.get()).toContainText('3 items');
		});
	},
);
