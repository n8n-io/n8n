import { test, expect } from '../../../fixtures/base';

test.describe(
	'HTTP Request node',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
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

		test.describe('Import cURL', () => {
			test('should import a simple GET request from cURL command', async ({ n8n, page }) => {
				await n8n.canvas.addNode('Manual Trigger');
				await n8n.canvas.addNode('HTTP Request', { closeNDV: false });

				// Click the Import cURL button
				await page.getByText('Import cURL').click();

				// Wait for the modal to appear
				const modal = page.getByTestId('import-curl-modal-input');
				await expect(modal).toBeVisible();

				// Paste a simple cURL command
				const curlCommand = 'curl https://catfact.ninja/fact';
				await modal.fill(curlCommand);

				// Click Import button
				await page.getByTestId('import-curl-modal-button').click();

				// Wait for modal to close
				await expect(modal).not.toBeVisible();

				// Verify the URL field was populated
				await expect(n8n.ndv.getParameterInputField('url')).toHaveValue(
					'https://catfact.ninja/fact',
				);

				// Verify the method is GET
				await expect(n8n.ndv.getParameterInput('method')).toContainText('GET');
			});

			test('should import a POST request with headers and body', async ({ n8n, page }) => {
				await n8n.canvas.addNode('Manual Trigger');
				await n8n.canvas.addNode('HTTP Request', { closeNDV: false });

				// Click the Import cURL button
				await page.getByText('Import cURL').click();

				// Wait for the modal to appear
				const modal = page.getByTestId('import-curl-modal-input');
				await expect(modal).toBeVisible();

				// Paste a POST request with JSON body
				const curlCommand =
					'curl -X POST https://reqbin.com/echo/post/json -H \'Content-Type: application/json\' -d \'{"login":"my_login","password":"my_password"}\'';
				await modal.fill(curlCommand);

				// Click Import button
				await page.getByTestId('import-curl-modal-button').click();

				// Wait for modal to close
				await expect(modal).not.toBeVisible();

				// Verify the URL field was populated
				await expect(n8n.ndv.getParameterInputField('url')).toHaveValue(
					'https://reqbin.com/echo/post/json',
				);

				// Verify the method is POST
				await expect(n8n.ndv.getParameterInput('method')).toContainText('POST');
			});

			test('should import a request with query parameters', async ({ n8n, page }) => {
				await n8n.canvas.addNode('Manual Trigger');
				await n8n.canvas.addNode('HTTP Request', { closeNDV: false });

				// Click the Import cURL button
				await page.getByText('Import cURL').click();

				// Wait for the modal to appear
				const modal = page.getByTestId('import-curl-modal-input');
				await expect(modal).toBeVisible();

				// Paste a request with query parameters
				const curlCommand = 'curl "https://example.com?param1=value1&param2=value2"';
				await modal.fill(curlCommand);

				// Click Import button
				await page.getByTestId('import-curl-modal-button').click();

				// Wait for modal to close
				await expect(modal).not.toBeVisible();

				// Verify the URL field was populated (without query params)
				await expect(n8n.ndv.getParameterInputField('url')).toHaveValue('https://example.com');

				// Verify the method is GET
				await expect(n8n.ndv.getParameterInput('method')).toContainText('GET');
			});
		});
	},
);
