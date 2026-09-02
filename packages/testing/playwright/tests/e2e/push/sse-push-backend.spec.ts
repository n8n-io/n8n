import { test, expect } from '../../../fixtures/base';

/**
 * The default container stack runs the `websocket` push backend, so `sse` needs a
 * container of its own. Only meaningful in container mode: the origin check this
 * covers is gated on `NODE_ENV=production`, which the image sets but a local
 * `pnpm start` does not.
 */
test.use({ capability: { env: { N8N_PUSH_BACKEND: 'sse' } } });

test.beforeEach(({ n8nContainer }) => {
	test.skip(!n8nContainer, 'container-only: requires the SSE backend configuration');
});

test.describe(
	'SSE push backend',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should deliver execution results over an SSE push connection', async ({ n8n }) => {
			// `EventSource` sends no `Origin` on a same-origin GET, so the connection has to
			// be accepted on the strength of `Sec-Fetch-Site` alone.
			const pushResponse = n8n.page.waitForResponse((response) =>
				response.url().includes('/push?pushRef='),
			);

			await n8n.start.fromImportedWorkflow('manual-trigger-with-code.json');
			expect((await pushResponse).status()).toBe(200);

			// Run status per node arrives over that connection, so it cannot show up unless
			// the stream stayed open.
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('Code')).toBeVisible();
		});
	},
);
