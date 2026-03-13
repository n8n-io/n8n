import { nanoid } from 'nanoid';

import { setupInstanceAiMocks } from '../../../composables/InstanceAiComposer';
import { test, expect } from '../../../fixtures/base';

test.describe('Instance AI - Cancel Run', () => {
	test('should show stop button during streaming and cancel on click', async ({ n8n }) => {
		// Build SSE with only run-start (no run-finish) to simulate an ongoing stream
		const runId = nanoid();
		const agentId = nanoid();
		const sseBody = `id: 1\ndata: ${JSON.stringify({
			type: 'run-start',
			runId,
			agentId,
			userId: 'user-test',
			payload: { messageId: nanoid() },
		})}\n\n`;

		await setupInstanceAiMocks(n8n.page, sseBody, { runId });

		// Mock the cancel endpoint
		await n8n.page.route('**/instance-ai/chat/*/cancel', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ data: { ok: true } }),
			});
		});

		await n8n.navigate.toInstanceAi();

		await n8n.instanceAi.sendMessage('Build a complex workflow');

		// Stop button should become visible while the run is in progress
		await expect(n8n.instanceAi.getStopButton()).toBeVisible();

		// Intercept the cancel POST request
		const cancelPromise = n8n.page.waitForRequest(
			(req) =>
				req.url().includes('/instance-ai/chat/') &&
				req.url().includes('/cancel') &&
				req.method() === 'POST',
		);

		await n8n.instanceAi.getStopButton().click();

		// Verify the cancel endpoint was called
		const cancelRequest = await cancelPromise;
		expect(cancelRequest.url()).toContain('/cancel');
	});
});
