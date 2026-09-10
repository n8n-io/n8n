import { createHmac } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface RegisteredHook {
	id: string;
	target_url: string;
	events?: string[];
	/** When registered with a secret, deliveries are HMAC-signed with it. */
	secret?: string;
	[key: string]: unknown;
}

interface RegistryCall {
	method: string;
	path: string;
	body?: unknown;
}

/**
 * A stateful mock "hook registry" for webhook-trigger lifecycle testing — the
 * vendor API that E2eTestDeclarativeWebhookTrigger registers against:
 *
 *   GET    /hooks       → { hooks: RegisteredHook[] }
 *   POST   /hooks       → registers the body, returns { id }
 *   DELETE /hooks/:id   → deregisters
 *   POST   /fire        → delivers the body to every registered target_url,
 *                         returns { delivered }
 *
 * Usable programmatically from a spec (start/stop, `hooks`, `calls`, `fire()`)
 * and standalone for manual demos via `pnpm --filter=n8n-playwright hook-registry`.
 */
export class HookRegistryServer {
	readonly hooks = new Map<string, RegisteredHook>();

	/** Every lifecycle call received, for assertions. */
	readonly calls: RegistryCall[] = [];

	private server?: Server;

	private nextId = 1;

	constructor(private readonly log: (line: string) => void = () => {}) {}

	get port(): number {
		const address = this.server?.address() as AddressInfo | null | undefined;
		if (!address) throw new Error('Hook registry is not listening');
		return address.port;
	}

	/** Base URL as reachable from this host. */
	get url(): string {
		return `http://localhost:${this.port}`;
	}

	async start(port = 0): Promise<this> {
		this.server = createServer((req, res) => {
			void this.handle(req, res);
		});
		await new Promise<void>((resolve, reject) => {
			this.server!.once('error', reject);
			// No host: bind dual-stack (`::`), so both `localhost` resolutions
			// (127.0.0.1 and ::1) reach the registry.
			this.server!.listen(port, resolve);
		});
		this.log(`hook registry listening on ${this.url}`);
		return this;
	}

	async stop(): Promise<void> {
		if (!this.server) return;
		await new Promise<void>((resolve, reject) =>
			this.server!.close((error) => (error ? reject(error) : resolve())),
		);
		this.server = undefined;
	}

	/**
	 * Delivers a payload to every registered hook, like the vendor firing an
	 * event. A hook registered with a `secret` gets its delivery signed:
	 * `x-registry-signature: sha256=<HMAC-SHA256 hex over the raw body>`.
	 */
	async fire(payload: Record<string, unknown>): Promise<{ delivered: number; statuses: number[] }> {
		const statuses: number[] = [];
		for (const hook of this.hooks.values()) {
			const body = JSON.stringify(payload);
			const headers: Record<string, string> = { 'content-type': 'application/json' };
			if (typeof hook.secret === 'string' && hook.secret !== '') {
				headers['x-registry-signature'] =
					`sha256=${createHmac('sha256', hook.secret).update(body).digest('hex')}`;
			}
			const response = await fetch(hook.target_url, { method: 'POST', headers, body });
			this.log(
				`fired ${body}${headers['x-registry-signature'] ? ' (signed)' : ''} → ${hook.target_url} (${response.status})`,
			);
			statuses.push(response.status);
		}
		return { delivered: statuses.length, statuses };
	}

	/**
	 * Delivers a payload to one target with a caller-supplied signature, for
	 * asserting that a forged or absent signature is rejected.
	 */
	async fireWithSignature(
		targetUrl: string,
		payload: Record<string, unknown>,
		signature?: string,
	): Promise<{ status: number }> {
		const body = JSON.stringify(payload);
		const headers: Record<string, string> = { 'content-type': 'application/json' };
		if (signature !== undefined) headers['x-registry-signature'] = signature;

		const response = await fetch(targetUrl, { method: 'POST', headers, body });
		this.log(
			`fired ${body} (signature: ${signature ?? 'none'}) → ${targetUrl} (${response.status})`,
		);

		return { status: response.status };
	}

	private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const method = req.method ?? 'GET';
		const path = (req.url ?? '/').split('?')[0];
		const body = await this.readBody(req);
		this.calls.push({ method, path, body });
		this.log(`${method} ${path}${body ? ` ${JSON.stringify(body)}` : ''}`);

		const respond = (statusCode: number, payload: unknown) => {
			res.writeHead(statusCode, { 'content-type': 'application/json' });
			res.end(JSON.stringify(payload));
		};

		if (method === 'GET' && path === '/hooks') {
			respond(200, { hooks: [...this.hooks.values()] });
		} else if (method === 'POST' && path === '/hooks') {
			const id = `h${this.nextId++}`;
			this.hooks.set(id, { ...(body as Record<string, unknown>), id } as RegisteredHook);
			respond(200, { id });
		} else if (method === 'DELETE' && path.startsWith('/hooks/')) {
			const id = path.slice('/hooks/'.length);
			if (this.hooks.delete(id)) respond(200, { deleted: id });
			else respond(404, { error: `no hook ${id}` });
		} else if (method === 'POST' && path === '/fire') {
			respond(200, await this.fire(body as Record<string, unknown>));
		} else {
			respond(404, { error: `no route ${method} ${path}` });
		}
	}

	private async readBody(req: IncomingMessage): Promise<unknown> {
		const chunks: Buffer[] = [];
		for await (const chunk of req) chunks.push(chunk as Buffer);
		if (chunks.length === 0) return undefined;
		const raw = Buffer.concat(chunks).toString('utf8');
		try {
			return JSON.parse(raw);
		} catch {
			return raw;
		}
	}
}
