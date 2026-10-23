import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const HEARTBEAT = 'n8n|heartbeat';
const HEARTBEAT_ACK = 'n8n|heartbeat-ack';
const QUESTION = 'What is your name?';

test.use({ capability: { webhooks: 1, workers: 1 } });

function withChatWebhookId(webhookId: string) {
	return (workflow: Partial<IWorkflowBase>) => {
		workflow.nodes?.forEach((node) => {
			if (node.type === '@n8n/n8n-nodes-langchain.chatTrigger') {
				node.webhookId = webhookId;
			}
		});
		return workflow;
	};
}

function buildChatWsUrl(
	backendUrl: string,
	params: { sessionId: string; executionId: string; resumeToken?: string },
) {
	const url = new URL('/chat', backendUrl);
	url.protocol = url.protocol.replace('http', 'ws');
	url.searchParams.set('sessionId', params.sessionId);
	url.searchParams.set('executionId', params.executionId);
	url.searchParams.set('isPublic', 'true');
	if (params.resumeToken) url.searchParams.set('token', params.resumeToken);
	return url.toString();
}

function openChatSocket(wsUrl: string) {
	const socket = new WebSocket(wsUrl);
	const received: string[] = [];
	const waiters: Array<{
		predicate: (message: string) => boolean;
		resolve: (message: string) => void;
	}> = [];

	socket.addEventListener('message', (event) => {
		const message = String(event.data);
		if (message === HEARTBEAT) {
			socket.send(HEARTBEAT_ACK);
			return;
		}
		received.push(message);
		const index = waiters.findIndex(({ predicate }) => predicate(message));
		if (index !== -1) waiters.splice(index, 1)[0].resolve(message);
	});

	const opened = new Promise<void>((resolve, reject) => {
		socket.addEventListener('open', () => resolve());
		socket.addEventListener('error', () =>
			reject(new Error(`WebSocket connection to ${wsUrl} failed`)),
		);
	});

	const waitForMessage = async (predicate: (message: string) => boolean, timeoutMs = 30_000) => {
		const existing = received.find(predicate);
		if (existing) return existing;

		return await new Promise<string>((resolve, reject) => {
			const waiter = {
				predicate,
				resolve: (message: string) => {
					clearTimeout(timeout);
					resolve(message);
				},
			};
			const timeout = setTimeout(() => {
				waiters.splice(waiters.indexOf(waiter), 1);
				reject(
					new Error(
						`No matching chat message within ${timeoutMs}ms. Received: ${JSON.stringify(received)}`,
					),
				);
			}, timeoutMs);
			waiters.push(waiter);
		});
	};

	return { socket, opened, waitForMessage };
}

test.describe(
	'Chat sendAndWait with dedicated webhook process @mode:queue',
	{ annotation: [{ type: 'owner', description: 'NODES' }] },
	() => {
		test('should deliver the sendAndWait message over WebSocket and resume the execution on reply', async ({
			api,
			backendUrl,
		}) => {
			const webhookId = nanoid();
			const { workflowId } = await api.workflows.importWorkflowFromFile('chat-send-and-wait.json', {
				transform: withChatWebhookId(webhookId),
			});

			const sessionId = nanoid();
			const triggerResponse = await api.webhooks.trigger(`/webhook/${webhookId}/chat`, {
				method: 'POST',
				data: { action: 'sendMessage', sessionId, chatInput: 'hello' },
			});
			expect(triggerResponse.ok()).toBe(true);

			const { executionId, resumeToken } = (await triggerResponse.json()) as {
				executionId: string;
				resumeToken?: string;
			};
			expect(executionId).toBeTruthy();

			await api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 30_000);

			const chat = openChatSocket(
				buildChatWsUrl(backendUrl, { sessionId, executionId, resumeToken }),
			);

			try {
				await chat.opened;

				const question = await chat.waitForMessage((message) => message.includes(QUESTION));
				expect(question).toContain(QUESTION);

				chat.socket.send(
					JSON.stringify({ action: 'sendMessage', sessionId, chatInput: 'E2E reply' }),
				);

				const execution = await api.workflows.waitForWorkflowStatus(workflowId, 'success', 30_000);
				expect(execution.status).toBe('success');
			} finally {
				chat.socket.close();
			}
		});
	},
);
