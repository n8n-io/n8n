import { MailpitHelper } from 'n8n-containers/services/mailpit';
import type { N8NStack } from 'n8n-containers/stack';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { appendFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';

import { N8N_AUTH_COOKIE } from '../../config/constants';

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
	const users = new Map<string, string>();
	const sessions = new Map<string, string>();
	let mailCleared = false;
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
						if (process.env.HARNESS_CASE === 'bootstrap-failure') {
							res.writeHead(500).end(`${marker}:reset-error`);
							return;
						}
						const data = JSON.parse(body) as Record<
							string,
							{ email: string; password: string } | Array<{ email: string; password: string }>
						>;
						for (const user of Object.values(data).flat()) users.set(user.email, user.password);
						// Session invalidation is not modeled: this suite checks fixture ordering, not DB semantics.
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
					} else if (route === 'GET /consumer') {
						res.setHeader('Content-Type', 'text/html');
						res.end(
							`<html><head><link rel="icon" href="data:,"></head><body><h1>${email}</h1></body></html>`,
						);
					} else if (
						name === 'backend' &&
						['PATCH /rest/e2e/feature', 'PATCH /rest/e2e/quota'].includes(route)
					) {
						res.end('{}');
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
		const baseUrl = await listen('backend');
		const frontendUrl = process.env.HARNESS_CASE === 'ui-only' ? await listen('frontend') : baseUrl;
		const services = strict({ mailpit: new MailpitHelper(baseUrl) });
		// Only the supplied endpoint, service, and lifecycle surface is implemented. All other reads throw.
		const stack = strict({ baseUrl, mainUrls: [baseUrl], services, stop }) as unknown as N8NStack;
		return { stack, frontendUrl };
	} catch (error) {
		await stop();
		throw error;
	}
}
