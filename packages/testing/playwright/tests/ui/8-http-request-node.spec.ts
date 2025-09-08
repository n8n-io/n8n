import { test, expect } from '../../fixtures/base';

test.describe('HTTP Request node', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should make a request with a URL and receive a response', async ({ n8n }) => {
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('HTTP Request', { closeNDV: false });

		await n8n.ndv.setupHelper.httpRequest({
			url: 'https://catfact.ninja/fact',
		});
		await n8n.ndv.execute();

		await expect(n8n.ndv.outputPanel.get()).toContainText('fact');
	});

	test.describe('Credential-only HTTP Request Node variants', () => {
		test('should render a modified HTTP Request Node', async ({ n8n }) => {
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('VirusTotal');

			await expect(n8n.ndv.getNodeNameContainer()).toContainText('VirusTotal HTTP Request');
			await expect(n8n.ndv.getParameterInputField('url')).toHaveValue(
				'https://www.virustotal.com/api/v3/',
			);

			await expect(n8n.ndv.getParameterInput('authentication')).toBeHidden();
			await expect(n8n.ndv.getParameterInput('nodeCredentialType')).toBeHidden();

			await expect(n8n.ndv.getCredentialLabel('Credential for VirusTotal')).toBeVisible();
		});
	});
});
