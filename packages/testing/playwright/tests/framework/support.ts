import { MailpitHelper } from 'n8n-containers/services/mailpit';
import type { ServiceHelpers } from 'n8n-containers/services/types';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { appendFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';

import { N8N_AUTH_COOKIE } from '../../config/constants';
import { INSTANCE_OWNER_CREDENTIALS } from '../../config/test-users';
import { applyDefaultFeatures, attach, resetDatabase, type Sut } from '../../fixtures/sut';
import type { ApiHelpers } from '../../services/api-helper';

export interface Evidence {
	type: string;
	server?: string;
	url?: string;
	method?: string;
	path?: string;
	status?: number;
	email?: string;
	cookie?: string;
}

export const marker = process.env.HARNESS_MARKER!;

export function record(event: Evidence) {
	appendFileSync(process.env.HARNESS_EVENTS!, `${JSON.stringify(event)}\n`);
}

const harnessCase = process.env.HARNESS_CASE ?? '';
const ATTACHED_CASES = ['attached', 'forbidden-reset'];
const SPLIT_URL_CASES = ['ui-only', 'ui-unauthenticated'];

/** Changes server state, then fails, so the retry must start from a reset. */
export async function failFirstAttempt(api: ApiHelpers, retry: number) {
	if (retry !== 0) return;
	await api.request.post('/state');
	throw new Error(`${marker}:retry-error`);
}

function strict<T extends object>(value: T): T {
	return new Proxy(value, {
		get(target, key, receiver) {
			if (!Object.hasOwn(target, key)) throw new Error(`Unsupported harness field: ${String(key)}`);
			return Reflect.get(target, key, receiver);
		},
	});
}

export async function provision() {
	const servers: Server[] = [];
	// An attached instance already has its users. A managed one gets them from the reset.
	const users = new Map<string, string>(
		ATTACHED_CASES.includes(harnessCase)
			? [INSTANCE_OWNER_CREDENTIALS].map((user) => [user.email, user.password])
			: [],
	);
	const sessions = new Map<string, string>();
	let changed = false;
	let mailCleared = false;
	let resets = 0;
	const stop = async () => {
		await Promise.all(
			servers.map(async (server) => {
				const closed = once(server, 'close');
				server.close();
				server.closeAllConnections();
				await closed;
			}),
		);
	};
	const listen = async (name: string) => {
		const server = createServer((req, res) => {
			let body = '';
			req.setEncoding('utf8');
			req.on('data', (chunk: string) => {
				body += chunk;
			});
			req.on('end', () => {
				const cookie = req.headers.cookie ?? '';
				const token = cookie
					.split('; ')
					.find((part) => part.startsWith(`${N8N_AUTH_COOKIE}=`))
					?.split('=')[1];
				let email = sessions.get(token ?? '');
				res.on('finish', () =>
					record({
						type: 'response',
						server: name,
						method: req.method,
						path: req.url,
						status: res.statusCode,
						email,
						cookie,
					}),
				);
				res.setHeader('Content-Type', 'application/json');
				try {
					const route = `${req.method} ${req.url}`;
					if (name === 'backend' && route === 'POST /rest/e2e/reset') {
						resets++;
						if (
							harnessCase === 'bootstrap-failure' ||
							(harnessCase === 'per-test-reset-failure' && resets === 2)
						) {
							res.writeHead(500).end(`${marker}:reset-error`);
							return;
						}
						const data = JSON.parse(body) as Record<
							string,
							{ email: string; password: string } | Array<{ email: string; password: string }>
						>;
						for (const user of Object.values(data).flat()) users.set(user.email, user.password);
						// A reset recreates users, so earlier sessions stop working.
						changed = false;
						sessions.clear();
						res.end('{}');
					} else if (
						name === 'backend' &&
						['PATCH /rest/e2e/feature', 'PATCH /rest/e2e/quota'].includes(route)
					) {
						res.end('{}');
					} else if (name === 'backend' && route === 'POST /rest/login') {
						const data = JSON.parse(body) as { emailOrLdapLoginId: string; password: string };
						email = data.emailOrLdapLoginId;
						if (!users.has(email) || users.get(email) !== data.password) {
							res.writeHead(401).end('Unknown credentials');
							return;
						}
						const session = randomUUID();
						sessions.set(session, email);
						res.setHeader(
							'Set-Cookie',
							`${N8N_AUTH_COOKIE}=${session}; Path=/; HttpOnly; SameSite=Lax`,
						);
						res.end(JSON.stringify({ data: { id: email } }));
					} else if (name === 'backend' && route === 'DELETE /api/v1/messages') {
						mailCleared = true;
						res.end('{}');
					} else if (name === 'backend' && route === 'GET /api/v1/messages') {
						res.writeHead(mailCleared ? 200 : 409).end(JSON.stringify({ messages: [] }));
					} else if (!email) {
						res.writeHead(401).end('Missing session');
					} else if (name === 'backend' && route === 'GET /identity') {
						res.end(JSON.stringify({ id: email }));
					} else if (name === 'backend' && route === 'POST /state') {
						changed = true;
						res.end('{}');
					} else if (name === 'backend' && route === 'GET /state') {
						res.end(JSON.stringify({ changed }));
					} else if (route === 'GET /consumer') {
						res.setHeader('Content-Type', 'text/html');
						res.end(
							`<html><head><link rel="icon" href="data:,"></head><body><h1>${email}</h1></body></html>`,
						);
					} else {
						res.writeHead(404).end(`Unexpected route: ${route}`);
					}
				} catch (error) {
					res.writeHead(500).end(String(error));
				}
			});
		});
		servers.push(server);
		server.on('close', () => record({ type: 'server-closed', server: name }));
		server.listen(0, '127.0.0.1');
		await once(server, 'listening');
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('Missing loopback address');
		const url = `http://127.0.0.1:${address.port}`;
		record({ type: 'server-listening', server: name, url });
		return url;
	};
	try {
		const url = await listen('backend');
		const editorUrl = SPLIT_URL_CASES.includes(harnessCase) ? await listen('frontend') : url;
		if (ATTACHED_CASES.includes(harnessCase)) {
			return { sut: attach({ N8N_BASE_URL: url, N8N_EDITOR_URL: editorUrl }), stop };
		}
		// A managed SUT, like the Testcontainers source: reset at start. Only the
		// listed fields exist. Any other read throws.
		const sut: Sut = strict({
			url,
			editorUrl,
			internalUrl: url,
			mainUrls: [url],
			services: strict({ mailpit: new MailpitHelper(url) }) as unknown as ServiceHelpers,
			stack: undefined,
			reset: async () => await resetDatabase(url),
			applyDefaults: async () => await applyDefaultFeatures(url),
			stop,
		});
		await sut.reset();
		return { sut, stop };
	} catch (error) {
		await stop();
		throw error;
	}
}
