import type { StructuredChunk } from 'n8n-workflow';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Streaming Webhook Responses',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('returns ordered text and JSON chunks and closes the stream @engine:v2', async ({
			api,
		}) => {
			const { webhookPath, workflowId } =
				await api.workflows.importWorkflowFromFile('webhook-streaming.json');
			const payload = { message: 'Hello\nfrom the streaming webhook 👋' };

			try {
				// Playwright waits for the response body, so this also checks that the stream ends.
				const response = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
					data: payload,
				});

				expect(response.status()).toBe(200);
				expect(response.headers()['content-type']).toContain('application/json');
				expect(response.headers()['transfer-encoding']).toBe('chunked');
				expect(response.headers()['cache-control']).toBe('no-cache');

				const chunks: StructuredChunk[] = (await response.text())
					.split('\n')
					.filter((line) => line.trim())
					.map((line) => JSON.parse(line));

				expect(
					chunks.map(({ type, content, metadata }) => ({
						type,
						content,
						nodeName: metadata.nodeName,
					})),
				).toEqual([
					{ type: 'begin', nodeName: 'Respond with Text' },
					{ type: 'item', content: payload.message, nodeName: 'Respond with Text' },
					{ type: 'end', nodeName: 'Respond with Text' },
					{ type: 'begin', nodeName: 'Respond with JSON' },
					{ type: 'item', content: JSON.stringify(payload), nodeName: 'Respond with JSON' },
					{ type: 'end', nodeName: 'Respond with JSON' },
				]);

				const execution = await api.workflows.waitForExecution(workflowId);
				expect(execution.status).toBe('success');
				await api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
			} finally {
				await api.workflows.deactivate(workflowId);
				await api.workflows.archive(workflowId);
				await api.workflows.delete(workflowId);
			}
		});
	},
);
