import type { CycleContext } from './harness';
import { fail, metric, ok, step } from './harness';

const OWNER_EMAIL = 'owner@example.com';
const OWNER_PASSWORD = 'SuperSecret123';

interface RestResponse {
	code: number;
	ms: number;
	body: unknown;
	text: string;
}

/**
 * Minimal REST client against one running instance. Keeps its own cookie so a
 * login survives only as long as the instance it came from — every boot logs
 * in again.
 */
export class RestClient {
	private cookie = '';

	constructor(
		private readonly ctx: CycleContext,
		readonly baseUrl: string,
	) {}

	async request(method: string, path: string, payload?: unknown): Promise<RestResponse> {
		const headers: Record<string, string> = { 'browser-id': 'encryption-cycle' };
		if (this.cookie) headers.cookie = this.cookie;
		if (payload !== undefined) headers['content-type'] = 'application/json';
		const started = performance.now();
		const res = await fetch(`${this.baseUrl}${path}`, {
			method,
			headers,
			body: payload === undefined ? undefined : JSON.stringify(payload),
		});
		const text = await res.text();
		const ms = performance.now() - started;
		const setCookie = res.headers.get('set-cookie');
		if (setCookie) this.cookie = setCookie.split(';')[0];
		let body: unknown = null;
		try {
			body = JSON.parse(text);
		} catch {
			// non-JSON bodies stay available via `text`
		}
		return { code: res.status, ms, body, text };
	}

	private dataOf(res: RestResponse): Record<string, unknown> {
		return ((res.body as Record<string, unknown>)?.data ?? {}) as Record<string, unknown>;
	}

	async createOwner(): Promise<void> {
		step(this.ctx, 'creating the owner account');
		const res = await this.request('POST', '/rest/owner/setup', {
			email: OWNER_EMAIL,
			firstName: 'Spec',
			lastName: 'Owner',
			password: OWNER_PASSWORD,
		});
		if (res.code !== 200) fail('owner setup failed', `${res.code}: ${res.text.slice(0, 300)}`);
		ok(this.ctx, 'owner created');
	}

	/** The login DTO field name differs across releases; try both. */
	async login(): Promise<void> {
		step(this.ctx, `logging in as ${OWNER_EMAIL}`);
		this.cookie = '';
		let res = await this.request('POST', '/rest/login', {
			emailOrLdapLoginId: OWNER_EMAIL,
			password: OWNER_PASSWORD,
		});
		if (res.code !== 200) {
			res = await this.request('POST', '/rest/login', {
				email: OWNER_EMAIL,
				password: OWNER_PASSWORD,
			});
		}
		if (res.code !== 200) fail('login failed', `${res.code}: ${res.text.slice(0, 300)}`);
		ok(this.ctx, 'logged in');
	}

	async createCredential(name: string, secret: string): Promise<string> {
		const res = await this.request('POST', '/rest/credentials', {
			name,
			type: 'httpHeaderAuth',
			data: { name: secret, value: 'spec-header-password' },
		});
		if (res.code !== 200) {
			fail(`create credential "${name}" failed`, `${res.code}: ${res.text.slice(0, 300)}`);
		}
		return String(this.dataOf(res).id);
	}

	/**
	 * The unique secret lives in the NON-password `name` field: the API returns
	 * it decrypted verbatim, while both fields sit in one encrypted blob — so
	 * the round-trip proves the stored value decrypts. Records decrypt_ms.
	 */
	async assertDecrypts(credId: string, expected: string, label: string): Promise<void> {
		step(this.ctx, `checking decrypt of credential ${credId} (${label})`);
		const res = await this.request('GET', `/rest/credentials/${credId}?includeData=true`);
		if (res.code !== 200) {
			fail(`${label}: GET credential ${credId} returned ${res.code}`, res.text.slice(0, 300));
		}
		const data = this.dataOf(res).data as Record<string, unknown> | undefined;
		const got = data?.name;
		if (got !== expected) {
			fail(
				`${label}: credential ${credId} did not decrypt to the seeded secret`,
				`expected: ${expected}\nactual:   ${String(got)}`,
			);
		}
		metric(this.ctx, 'decrypt_ms', this.ctx.phase, Math.round(res.ms * 10) / 10);
		ok(
			this.ctx,
			`credential ${credId} decrypts to the seeded secret (${(res.ms / 1000).toFixed(3)}s)`,
		);
	}

	/** Rotates the data-encryption key; returns the new key id. Records rotate_ms. */
	async rotateKey(oldKeyId: string): Promise<string> {
		const res = await this.request('POST', '/rest/encryption/keys', { type: 'data_encryption' });
		if (res.code !== 200)
			fail('key rotation via API failed', `${res.code}: ${res.text.slice(0, 300)}`);
		metric(this.ctx, 'rotate_ms', this.ctx.phase, Math.round(res.ms * 10) / 10);
		const rawId = this.dataOf(res).id;
		const newId = typeof rawId === 'string' ? rawId : '';
		if (!newId || newId === oldKeyId) {
			fail('rotation did not produce a new key id', `old: ${oldKeyId}, new: ${newId}`);
		}
		return newId;
	}

	async createWorkflow(
		payload: Record<string, unknown>,
	): Promise<{ id: string; versionId: string }> {
		const res = await this.request('POST', '/rest/workflows', payload);
		if (res.code !== 200) fail('create workflow failed', `${res.code}: ${res.text.slice(0, 300)}`);
		const data = this.dataOf(res);
		return { id: String(data.id), versionId: String(data.versionId) };
	}

	/** Activation endpoint differs across releases; try the route, then the update fallback. */
	async activateWorkflow(id: string, versionId: string): Promise<void> {
		let res = await this.request('POST', `/rest/workflows/${id}/activate`, { versionId });
		if (res.code === 404 || res.code === 405) {
			res = await this.request('PATCH', `/rest/workflows/${id}`, { active: true, versionId });
		}
		if (res.code !== 200) {
			fail(`activate workflow ${id} failed`, `${res.code}: ${res.text.slice(0, 300)}`);
		}
	}

	async getWorkflowActive(id: string): Promise<boolean> {
		const res = await this.request('GET', `/rest/workflows/${id}`);
		if (res.code !== 200)
			fail(`GET workflow ${id} failed`, `${res.code}: ${res.text.slice(0, 300)}`);
		return Boolean(this.dataOf(res).active);
	}
}
