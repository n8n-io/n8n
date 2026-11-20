import type { AgentJsonConfig, AgentSseEvent } from '@n8n/api-types';
import type { IWorkflowBase } from 'n8n-workflow';

/** Local throwaway stacks only. The cockpit shows it so you can open the n8n UI. */
export const OWNER = {
	email: 'bench@n8n.io',
	firstName: 'Agent',
	lastName: 'Bench',
	password: 'AgentBench123',
};

/** A non-2xx reply. `retryAfterSec` comes from the `Retry-After` header. */
export class HttpError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly retryAfterSec?: number,
	) {
		super(message);
	}
}

function httpError(label: string, response: Response, body: string) {
	const retryAfter = Number(response.headers.get('retry-after'));
	return new HttpError(
		`${label} returned HTTP ${response.status}: ${body.slice(0, 300)}`,
		response.status,
		Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
	);
}

/** A small fetch client. The bench runs outside Playwright, so it has no request context. */
export class N8nClient {
	private cookie = '';

	constructor(readonly baseUrl: string) {}

	/** Create the owner on a fresh instance, and keep its auth cookie. */
	async setupOwner(): Promise<void> {
		const response = await fetch(`${this.baseUrl}/rest/owner/setup`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(OWNER),
		});
		if (!response.ok) throw new Error(`Owner setup failed: ${await response.text()}`);
		const auth = response.headers
			.getSetCookie()
			.map((entry) => entry.split(';')[0])
			.find((entry) => entry.startsWith('n8n-auth='));
		if (!auth) throw new Error('Owner setup returned no auth cookie');
		this.cookie = auth;
	}

	async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			method,
			headers: { 'Content-Type': 'application/json', Cookie: this.cookie },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		if (!response.ok) {
			throw new Error(`${method} ${path} returned ${response.status}: ${await response.text()}`);
		}
		const json: { data?: T } & T = await response.json();
		return json.data ?? json;
	}

	async personalProjectId(): Promise<string> {
		return (await this.request<{ id: string }>('GET', '/rest/projects/personal')).id;
	}

	async createCredential(name: string, type: string, data: Record<string, string>) {
		return await this.request<{ id: string }>('POST', '/rest/credentials', { name, type, data });
	}

	async createWorkflow(projectId: string, workflow: Partial<IWorkflowBase>) {
		return await this.request<{ id: string; name: string; versionId: string }>(
			'POST',
			'/rest/workflows',
			{ ...workflow, projectId },
		);
	}

	async activateWorkflow(id: string, versionId: string) {
		await this.request('POST', `/rest/workflows/${id}/activate`, { versionId });
	}

	async createDataTable(
		projectId: string,
		name: string,
		columns: Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'date' }>,
	) {
		return await this.request<{ id: string }>('POST', `/rest/projects/${projectId}/data-tables`, {
			name,
			columns,
		});
	}

	async insertDataTableRows(
		projectId: string,
		dataTableId: string,
		rows: Array<Record<string, string | number | boolean | null>>,
	) {
		await this.request('POST', `/rest/projects/${projectId}/data-tables/${dataTableId}/insert`, {
			data: rows,
		});
	}

	async createAgent(projectId: string, schema: AgentJsonConfig) {
		return await this.request<{ id: string }>('POST', `/rest/projects/${projectId}/agents/v2`, {
			name: schema.name,
			schema,
		});
	}

	async connectIntegration(
		projectId: string,
		agentId: string,
		integration: { type: string; credentialId: string; settings?: Record<string, unknown> },
	) {
		await this.request(
			'POST',
			`/rest/projects/${projectId}/agents/v2/${agentId}/integrations/connect`,
			integration,
		);
	}

	async publishAgent(projectId: string, agentId: string) {
		await this.request('POST', `/rest/projects/${projectId}/agents/v2/${agentId}/publish`, {});
	}

	/**
	 * One turn through the Responses API of the webhook integration. It does
	 * not stream, so the call returns when the reply is complete.
	 */
	async respond(
		agentId: string,
		input: string,
		timeoutMs: number,
	): Promise<{ conversationId: string; text: string }> {
		const response = await fetch(`${this.baseUrl}/agent-webhook/${agentId}/responses`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ input }),
			signal: AbortSignal.timeout(timeoutMs),
		});
		const body = await response.text();
		if (!response.ok) throw httpError('Responses API', response, body);
		const json: {
			conversation?: { id?: string };
			output?: Array<{ type: string; content?: Array<{ text?: string }> }>;
		} = JSON.parse(body);
		const text = (json.output ?? [])
			.filter((item) => item.type === 'message')
			.flatMap((item) => item.content ?? [])
			.map((part) => part.text ?? '')
			.join('');
		if (!json.conversation?.id) throw new Error('Responses API returned no conversation');
		return { conversationId: json.conversation.id, text };
	}

	/**
	 * Call a production webhook. A new activation can take a moment to register
	 * on every main, so a 404 is retried for a few seconds.
	 */
	async callWebhook<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
		const deadline = Date.now() + 10_000;
		while (true) {
			const response = await fetch(`${this.baseUrl}/webhook/${path}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(timeoutMs),
			});
			const text = await response.text();
			if (response.status === 404 && Date.now() < deadline) {
				await new Promise((resolve) => setTimeout(resolve, 500));
				continue;
			}
			if (!response.ok) throw httpError('Webhook', response, text);
			return JSON.parse(text);
		}
	}

	/**
	 * One timed call for the main probe. Returns the time in ms and the HTTP
	 * status, or status 0 when the call failed or timed out.
	 */
	async probe(
		target: 'health' | 'rest' | 'webhook',
		webhookPath: string,
		timeoutMs: number,
	): Promise<{ ms: number; status: number }> {
		const started = performance.now();
		const [method, path, auth] =
			target === 'health'
				? ['GET', '/healthz', false]
				: target === 'rest'
					? ['GET', '/rest/workflows?take=5', true]
					: ['POST', `/webhook/${webhookPath}`, false];
		try {
			const response = await fetch(`${this.baseUrl}${path}`, {
				method,
				headers: {
					'Content-Type': 'application/json',
					...(auth ? { Cookie: this.cookie } : {}),
				},
				body: method === 'POST' ? '{"ping":true}' : undefined,
				signal: AbortSignal.timeout(timeoutMs),
			});
			await response.arrayBuffer();
			return { ms: performance.now() - started, status: response.status };
		} catch {
			return { ms: performance.now() - started, status: 0 };
		}
	}

	/** Instance key to process type, e.g. `main` or `worker`. Empty when the registry is off. */
	async processTypes(): Promise<Map<string, string>> {
		try {
			const { instances } = await this.request<{
				instances: Array<{ instanceKey: string; instanceType: string }>;
			}>('GET', '/rest/instance-registry');
			return new Map(instances.map((i) => [i.instanceKey, i.instanceType]));
		} catch {
			return new Map();
		}
	}

	/**
	 * Send one chat message and read the SSE stream to the end. `onEvent` gets
	 * every event as it arrives, so the caller can time the first token.
	 */
	async chat(
		projectId: string,
		agentId: string,
		message: string,
		sessionId: string,
		onEvent: (event: AgentSseEvent) => void,
		timeoutMs: number,
		newSession = true,
	): Promise<void> {
		const response = await fetch(
			`${this.baseUrl}/rest/projects/${projectId}/agents/v2/${agentId}/chat`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Cookie: this.cookie },
				body: JSON.stringify({
					sessionId,
					message,
					messageId: crypto.randomUUID(),
					// The API accepts only `true`. A follow-up leaves the field out.
					...(newSession ? { newSession: true } : {}),
				}),
				signal: AbortSignal.timeout(timeoutMs),
			},
		);
		if (!response.ok || !response.body) {
			throw httpError('Chat', response, await response.text());
		}
		const reader = response.body.getReader();
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
					onEvent(event);
					if (event.type === 'done') return;
				}
			}
		} finally {
			await reader.cancel().catch(() => {});
		}
	}
}
