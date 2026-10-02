import { test, expect } from '../../../fixtures/base';

test.describe(
	'ADO-5599: From AI button alignment',
	{ annotation: [{ type: 'owner', description: 'Adore' }] },
	() => {
		test('aligns the From AI button outline with the tool parameter input border', async ({
			n8n,
		}) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode('AI Agent', { closeNDV: true });
			await n8n.canvas.getInputPlusEndpointByType('AI Agent', 'ai_tool').click();
			await n8n.canvas.nodeCreator.searchFor('SearXNG');
			await n8n.canvas.nodeCreator.selectItem('SearXNG');
			await n8n.ndv.addParameterOptionByName('Language');

			const inputBorder = n8n.ndv.getParameterInputBorder('language');
			const fromAiButton = n8n.ndv.getFromAiOverrideButton('language');
			await expect(inputBorder).toBeVisible();
			await expect(fromAiButton).toBeVisible();

			const inputBounds = await inputBorder.boundingBox();
			const buttonBounds = await fromAiButton.boundingBox();
			expect(inputBounds).not.toBeNull();
			expect(buttonBounds).not.toBeNull();

			expect(buttonBounds).toMatchObject({
				y: inputBounds!.y,
				height: inputBounds!.height,
			});
		});
	},
);
