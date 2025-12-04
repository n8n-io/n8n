import { test, expect } from '../../fixtures/base';

test.describe('Webhook Origin Isolation', () => {
	test.beforeAll(async ({ api }) => {
		await api.workflows.importWorkflowFromFile('webhook-origin-isolation.json', {
			makeUnique: false,
		});
	});

	const webhookPaths = [
		'webhook-response-data-text-html',
		'webhook-response-data-wo-content-type',
		'webhook-last-node-no-content-type-header',
		'webhook-last-node-text-html-header',
		'webhook-last-node-text-html-content-type',
		'webhook-response-data-csp-header',
		'webhook-last-node-csp-header',
		'webhook-last-node-binary-text-html',
		'webhook-last-node-binary-no-content-type',
		'webhook-last-node-binary-csp-header',
		'respond-to-webhook-text-no-content-type',
		'respond-to-webhook-text-content-type-text-html',
		'respond-to-webhook-text-csp-header',
		'respond-to-webhook-json-as-text-html',
	];

	const expectedCSP =
		'sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-scripts allow-top-navigation allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols';

	for (const webhookPath of webhookPaths) {
		test(`Webhook responses should include the correct response headers for ${webhookPath}`, async ({
			api,
		}) => {
			const webhookResponse = await api.request.get(`/webhook/${webhookPath}`);
			expect(webhookResponse.ok()).toBe(true);

			const headers = webhookResponse.headers();
			expect(headers['content-security-policy']).toBe(expectedCSP);
		});
	}
});
