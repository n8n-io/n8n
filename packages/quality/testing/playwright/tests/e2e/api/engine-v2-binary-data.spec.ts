import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../../fixtures/base';

/**
 * Both planes of engine v2 share one binary data store. Each test moves a file
 * across the plane boundary in one direction: a node on the data plane stores
 * a file that the control plane streams, or the control plane stores an upload
 * that a node on the data plane reads. On a stack without engine v2 the same
 * specs run on the legacy engine, where both sides are one process.
 */

const FILE_TEXT = 'binary data crosses the plane boundary';

/** Webhook (lastNode, first entry binary) -> Edit Fields -> Convert to File (text). */
const fileWrittenOnDataPlane: Partial<IWorkflowBase> = {
	name: 'Engine v2 binary data: file written on the data plane',
	active: true,
	nodes: [
		{
			parameters: {
				httpMethod: 'GET',
				path: 'binary-out',
				responseMode: 'lastNode',
				responseData: 'firstEntryBinary',
				options: {},
			},
			id: 'webhook',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2.2,
			position: [0, 0],
			webhookId: 'binary-out',
		},
		{
			parameters: {
				assignments: {
					assignments: [{ id: 'text', name: 'text', value: FILE_TEXT, type: 'string' }],
				},
				options: {},
			},
			id: 'set',
			name: 'Edit Fields',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [220, 0],
		},
		{
			parameters: {
				operation: 'toText',
				sourceProperty: 'text',
				binaryPropertyName: 'data',
				options: { fileName: 'out.txt' },
			},
			id: 'convert',
			name: 'Convert to File',
			type: 'n8n-nodes-base.convertToFile',
			typeVersion: 1.1,
			position: [440, 0],
		},
	],
	connections: {
		Webhook: { main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]] },
		'Edit Fields': { main: [[{ node: 'Convert to File', type: 'main', index: 0 }]] },
	},
	settings: { executionOrder: 'v1' },
};

/**
 * Webhook (raw body as a file, responseNode) -> Extract from File (text) ->
 * Respond to Webhook (that text). The extraction forces a node on the data
 * plane to read the bytes: a response with the file itself would only send the
 * reference back, and the control plane would stream its own file.
 */
const fileReceivedOnControlPlane: Partial<IWorkflowBase> = {
	name: 'Engine v2 binary data: file received on the control plane',
	active: true,
	nodes: [
		{
			parameters: {
				httpMethod: 'POST',
				path: 'binary-in',
				responseMode: 'responseNode',
				options: { binaryData: true },
			},
			id: 'webhook',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2.2,
			position: [0, 0],
			webhookId: 'binary-in',
		},
		{
			parameters: {
				operation: 'text',
				binaryPropertyName: 'data',
				destinationKey: 'text',
				options: {},
			},
			id: 'extract',
			name: 'Extract from File',
			type: 'n8n-nodes-base.extractFromFile',
			typeVersion: 1.1,
			position: [220, 0],
		},
		{
			parameters: {
				respondWith: 'text',
				responseBody: '={{ $json.text }}',
				options: {},
			},
			id: 'respond',
			name: 'Respond to Webhook',
			type: 'n8n-nodes-base.respondToWebhook',
			typeVersion: 1.5,
			position: [440, 0],
		},
	],
	connections: {
		Webhook: { main: [[{ node: 'Extract from File', type: 'main', index: 0 }]] },
		'Extract from File': { main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]] },
	},
	settings: { executionOrder: 'v1' },
};

test.describe(
	'Engine v2 binary data across the planes',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('serves a file that a node on the data plane stored @engine:v2', async ({ api }) => {
			const { webhookPath, workflowId } =
				await api.workflows.importWorkflowFromDefinition(fileWrittenOnDataPlane);

			const response = await api.webhooks.trigger(`/webhook/${webhookPath}`);

			expect(response.ok()).toBe(true);
			expect(response.headers()['content-type']).toContain('text/plain');
			expect(await response.text()).toBe(FILE_TEXT);
			await api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
		});

		test('lets a node on the data plane read a file the control plane received @engine:v2', async ({
			api,
		}) => {
			const { webhookPath, workflowId } = await api.workflows.importWorkflowFromDefinition(
				fileReceivedOnControlPlane,
			);
			const upload = FILE_TEXT.repeat(1000);

			// Octet stream: the body parser leaves it unread, so the node stores the
			// stream as a file. A text or JSON body is parsed first and never stored.
			const response = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				headers: { 'content-type': 'application/octet-stream' },
				data: Buffer.from(upload),
			});

			// The body first: a failed run answers with the error, which names the cause.
			expect(await response.text()).toBe(upload);
			expect(response.ok()).toBe(true);
			await api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
		});
	},
);
