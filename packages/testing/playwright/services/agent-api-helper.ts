import type {
	AgentChatMessageDto,
	AgentChatMessagesResponse,
	AgentChatQueueResponse,
	AgentJsonConfig,
	AgentSseEvent,
} from '@n8n/api-types';

import type { ApiHelpers } from './api-helper';
import { N8N_AUTH_COOKIE } from '../config/constants';
import { TestError } from '../Types';

export class AgentApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	async create(projectId: string, schema: AgentJsonConfig): Promise<{ id: string }> {
		const response = await this.api.request.post(`/rest/projects/${projectId}/agents/v2`, {
			data: { name: schema.name, schema },
		});
		if (!response.ok()) throw new TestError(`Failed to create agent: ${await response.text()}`);
		return (await response.json()).data;
	}

	async delete(projectId: string, agentId: string): Promise<void> {
		const response = await this.api.request.delete(
			`/rest/projects/${projectId}/agents/v2/${agentId}`,
		);
		if (!response.ok()) throw new TestError(`Failed to delete agent: ${await response.text()}`);
	}

	async history(
		projectId: string,
		agentId: string,
		threadId: string,
	): Promise<AgentChatMessagesResponse> {
		const response = await this.api.request.get(
			`/rest/projects/${projectId}/agents/v2/${agentId}/chat/${threadId}/messages`,
		);
		if (!response.ok()) throw new TestError(`Failed to read chat: ${await response.text()}`);
		return (await response.json()).data;
	}

	async queuedMessages(
		projectId: string,
		agentId: string,
		threadId: string,
	): Promise<AgentChatQueueResponse> {
		const response = await this.api.request.get(
			`/rest/projects/${projectId}/agents/v2/${agentId}/chat/${threadId}/queue`,
		);
		if (!response.ok())
			throw new TestError(`Failed to read queued messages: ${await response.text()}`);
		return (await response.json()).data;
	}

	async removeQueuedMessage(
		projectId: string,
		agentId: string,
		threadId: string,
		queueId: string,
	): Promise<void> {
		const response = await this.api.request.delete(
			`/rest/projects/${projectId}/agents/v2/${agentId}/chat/${threadId}/queue/${queueId}`,
		);
		if (!response.ok())
			throw new TestError(`Failed to remove queued message: ${await response.text()}`);
	}

	async executions(
		projectId: string,
		agentId: string,
		threadId: string,
	): Promise<Array<{ id: string; status: string; userMessage: string | null }>> {
		const response = await this.api.request.get(
			`/rest/projects/${projectId}/agents/v2/${agentId}/threads/${threadId}`,
		);
		if (!response.ok()) throw new TestError(`Failed to read executions: ${await response.text()}`);
		return (await response.json()).data.executions;
	}

	async stop(
		projectId: string,
		agentId: string,
		threadId: string,
		executionId: string,
	): Promise<{ cancelRequested: boolean }> {
		const response = await this.api.request.delete(
			`/rest/projects/${projectId}/agents/v2/${agentId}/chat/${threadId}/executions/${executionId}`,
		);
		if (!response.ok()) throw new TestError(`Failed to stop chat: ${await response.text()}`);
		return (await response.json()).data;
	}

	/** Fetch exposes SSE before the response ends. Playwright buffers the response. */
	async openChat(
		baseUrl: string,
		projectId: string,
		agentId: string,
		payload: AgentChatMessageDto,
	) {
		const { cookies } = await this.api.request.storageState();
		const cookie = cookies.find((entry) => entry.name === N8N_AUTH_COOKIE);
		if (!cookie) throw new TestError('Missing authentication cookie');
		const controller = new AbortController();
		const response = await fetch(
			`${baseUrl}/rest/projects/${projectId}/agents/v2/${agentId}/chat`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Cookie: `${cookie.name}=${cookie.value}` },
				body: JSON.stringify(payload),
				signal: AbortSignal.any([controller.signal, AbortSignal.timeout(360_000)]),
			},
		);
		if (!response.ok || !response.body)
			throw new TestError(`Chat returned HTTP ${response.status}`);
		const events: AgentSseEvent[] = [];
		const done = this.readEvents(response.body, events).catch((error: unknown) => {
			if (!controller.signal.aborted) return String(error);
			return undefined;
		});
		return { events, done, disconnect: () => controller.abort() };
	}

	private async readEvents(
		body: ReadableStream<Uint8Array>,
		events: AgentSseEvent[],
	): Promise<void> {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) return;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';
				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					const event: AgentSseEvent = JSON.parse(line.slice(6));
					events.push(event);
				}
			}
		} finally {
			reader.releaseLock();
		}
	}
}
