import type { AgentChatMessagesResponse, AgentJsonConfig, AgentSseEvent } from '@n8n/api-types';

import type { ApiHelpers } from './api-helper';
import { N8N_AUTH_COOKIE } from '../config/constants';
import { TestError } from '../Types';

export class AgentApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	/**
	 * Create an agent. Pass a full schema for a runnable agent, or only a
	 * name for an empty agent that has no config yet.
	 */
	async create(projectId: string, schema: AgentJsonConfig | string): Promise<{ id: string }> {
		const data = typeof schema === 'string' ? { name: schema } : { name: schema.name, schema };
		const response = await this.api.request.post(`/rest/projects/${projectId}/agents/v2`, {
			data,
		});
		if (!response.ok()) throw new TestError(`Failed to create agent: ${await response.text()}`);
		return (await response.json()).data;
	}

	/**
	 * Fetch the current write lock for an agent. Returns null when no
	 * lock is held.
	 */
	async getWriteLock(
		projectId: string,
		agentId: string,
	): Promise<{ userId: string; clientId: string } | null> {
		const response = await this.api.request.get(
			`/rest/projects/${projectId}/agents/v2/${agentId}/collaboration/write-lock`,
		);
		if (!response.ok()) {
			throw new TestError(`Failed to fetch agent write lock: ${await response.text()}`);
		}
		// The REST layer wraps the body as { data: ... }, including
		// { data: null } when no lock is held.
		const result = await response.json();
		return result && 'data' in result ? result.data : result;
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

	async executions(
		projectId: string,
		agentId: string,
		threadId: string,
	): Promise<Array<{ id: string; status: string }>> {
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

	/** Playwright buffers responses. Read acceptance with fetch, then close only the reader. */
	async startAndDisconnect(
		baseUrl: string,
		projectId: string,
		agentId: string,
		threadId: string,
	): Promise<string> {
		const { cookies } = await this.api.request.storageState();
		const cookie = cookies.find((entry) => entry.name === N8N_AUTH_COOKIE);
		if (!cookie) throw new TestError('Missing authentication cookie');
		const controller = new AbortController();
		try {
			const response = await fetch(
				`${baseUrl}/rest/projects/${projectId}/agents/v2/${agentId}/chat`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Cookie: `${cookie.name}=${cookie.value}` },
					body: JSON.stringify({ sessionId: threadId, message: 'Reply with the word survived.' }),
					signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]),
				},
			);
			if (!response.ok || !response.body)
				throw new TestError(`Chat returned HTTP ${response.status}`);
			return await this.readAcceptance(response.body);
		} finally {
			controller.abort();
		}
	}

	private async readAcceptance(body: ReadableStream<Uint8Array>): Promise<string> {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) throw new TestError('Chat closed before acceptance');
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';
				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					const event: AgentSseEvent = JSON.parse(line.slice(6));
					if (event.type === 'error') throw new TestError(event.message);
					if (event.type === 'execution-started') return event.executionId;
				}
			}
		} finally {
			reader.releaseLock();
		}
	}
}
