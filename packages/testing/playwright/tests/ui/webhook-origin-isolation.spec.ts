import { test, expect } from '../../fixtures/base';

const WORKFLOW_NAME = 'Webhook Origin Isolation';

test.describe('Webhook Origin Isolation', () => {
	let importedWorkflowId: string | undefined;

	test.beforeAll(async ({ api }) => {
		// The workflow uses fixed (non-unique) webhook paths, so a leftover active
		// copy from an earlier worker would make activation fail with a path
		// collision. Release any such paths before importing.
		await api.workflows.deactivateWorkflowsByName(WORKFLOW_NAME);

		const { workflowId } = await api.workflows.importWorkflowFromFile(
			'webhook-origin-isolation.json',
			{ makeUnique: false },
		);
		importedWorkflowId = workflowId;
	});

	test.afterAll(async ({ api }) => {
		// Deactivate so the fixed webhook paths are released for the next worker.
		if (importedWorkflowId) {
			await api.workflows.setActive(importedWorkflowId, false);
		}
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
		'sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-scripts allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols';

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
