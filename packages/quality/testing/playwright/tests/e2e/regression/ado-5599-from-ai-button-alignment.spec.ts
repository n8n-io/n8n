import { test, expect } from '../../../fixtures/base';
import type { Locator } from '@playwright/test';

async function expectButtonAligned(inputBorder: Locator, fromAiButton: Locator) {
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
}

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

			await expectButtonAligned(
				n8n.ndv.getParameterInputBorder('language'),
				n8n.ndv.getFromAiOverrideButton('language'),
			);

			await n8n.ndv.addParameterOptionByName('Number of Results');
			await expectButtonAligned(
				n8n.ndv.getParameterNumberBorder('numResults'),
				n8n.ndv.getFromAiOverrideButton('numResults'),
			);

			await n8n.ndv.setParameterInput('language', '={{ $json.language }}');
			await expectButtonAligned(
				n8n.ndv.getParameterExpressionBorder('language'),
				n8n.ndv.getFromAiOverrideButton('language'),
			);
		});
	},
);
