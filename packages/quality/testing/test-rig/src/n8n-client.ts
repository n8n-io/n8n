import { sleep } from '@n8n/utils/sleep';

import { until } from './process';

const OWNER = { email: 'owner@example.com', password: 'SuperSecret123' };

export interface Response {
	status: number;
	body: string;
}

const isUnregistered = (status: number, body: string) =>
	status === 404 && body.includes('is not registered');

/** REST and webhook calls against the stack's main instance or load balancer. */
export class N8nClient {
	private cookie = '';

	constructor(readonly baseUrl: string) {}

	async request(method: string, path: string, payload?: unknown) {
		const headers: Record<string, string> = { 'browser-id': 'test-rig' };
		if (this.cookie) headers.cookie = this.cookie;
		if (payload !== undefined) headers['content-type'] = 'application/json';
		const res = await fetch(`${this.baseUrl}${path}`, {
			method,
			headers,
			body: payload === undefined ? undefined : JSON.stringify(payload),
		});
		const setCookie = res.headers.get('set-cookie');
		if (setCookie) this.cookie = setCookie.split(';')[0];
		const text = await res.text();
		let body: unknown;
		try {
			body = JSON.parse(text);
		} catch {
			body = text;
		}
		return { status: res.status, body };
	}

	async signIn() {
		await this.request('POST', '/rest/owner/setup', {
			...OWNER,
			firstName: 'Rig',
			lastName: 'Owner',
		});
		const res = await this.request('POST', '/rest/login', {
			emailOrLdapLoginId: OWNER.email,
			password: OWNER.password,
		});
		if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
	}

	/**
	 * Creates a workflow and returns its id. Activates it unless `activate` is false;
	 * with 'try', an activation the version refuses is ignored.
	 */
	async createWorkflow(
		workflow: Record<string, unknown>,
		options: { activate?: boolean | 'try' } = {},
	) {
		const created = await this.request('POST', '/rest/workflows', workflow);
		if (created.status !== 200) throw new Error(`create workflow: ${JSON.stringify(created.body)}`);
		const { id, versionId } = (created.body as { data: { id: string; versionId: string } }).data;
		if (options.activate === false) return id;
		let res = await this.request('POST', `/rest/workflows/${id}/activate`, { versionId });
		if (res.status === 404 || res.status === 405) {
			res = await this.request('PATCH', `/rest/workflows/${id}`, { active: true, versionId });
		}
		if (res.status !== 200 && options.activate !== 'try') {
			throw new Error(`activate workflow: ${JSON.stringify(res.body)}`);
		}
		return id;
	}

	/** Creates a credential and returns its id. */
	async createCredential(name: string, type: string, data: Record<string, unknown>) {
		const res = await this.request('POST', '/rest/credentials', { name, type, data });
		if (res.status !== 200) throw new Error(`create credential: ${JSON.stringify(res.body)}`);
		return (res.body as { data: { id: string } }).data.id;
	}

	/** Calls a production webhook; retries while the webhook is not registered yet, since activation can finish after its response. */
	async webhook(
		path: string,
		payload: unknown = {},
		registerTimeoutMs = 15_000,
	): Promise<Response> {
		const deadline = Date.now() + registerTimeoutMs;
		for (;;) {
			const res = await fetch(`${this.baseUrl}/webhook/${path}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const body = await res.text();
			if (!isUnregistered(res.status, body) || Date.now() > deadline)
				return { status: res.status, body };
			await sleep(250);
		}
	}

	/** Waits until a production webhook path is registered, without starting the workflow. */
	async waitForWebhook(path: string, timeoutMs = 15_000) {
		await until(
			`webhook ${path} registered`,
			async () => {
				const res = await fetch(`${this.baseUrl}/webhook/${path}`, { method: 'OPTIONS' });
				return !isUnregistered(res.status, await res.text());
			},
			timeoutMs,
			250,
		);
	}

	/** Fires a webhook without waiting; `result` settles with the response or the abort. */
	webhookInBackground(path: string, payload: unknown = {}) {
		const controller = new AbortController();
		const startedAt = Date.now();
		const result = fetch(`${this.baseUrl}/webhook/${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
			signal: controller.signal,
		}).then(
			async (res) => ({ status: res.status, body: await res.text(), ms: Date.now() - startedAt }),
			(error: Error) => ({ status: 0, body: error.message, ms: Date.now() - startedAt }),
		);
		return { result, abort: () => controller.abort() };
	}
}
