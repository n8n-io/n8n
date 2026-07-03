import http from 'node:http';
import https from 'node:https';

import { test, expect, instanceAiMultiMainConfig } from './fixtures';
import { N8N_AUTH_COOKIE } from '../../../config/constants';

// Inherits the project topology: 2 mains + worker on the `multi-main` project,
// 1 main elsewhere (the test then skips). Conversational-only — never hits the
// unsupported agent-triggered worker-offload execution path.
test.use(instanceAiMultiMainConfig);

interface SseEvent {
	id?: number;
	name?: string;
	data: { type?: string; runId?: string; payload?: Record<string, unknown> };
}

/**
 * Read an Instance AI SSE stream directly from a specific main (bypassing the
 * load balancer), collecting frames until `until` matches or the timeout fires.
 * Uses raw `http` like the MCP cross-main tests, since Playwright's request
 * context buffers the whole response and never returns for a long-lived stream.
 */
async function collectSseUntil(opts: {
	baseUrl: string;
	threadId: string;
	cookieHeader: string;
	until: (event: SseEvent) => boolean;
	timeoutMs: number;
	/**
	 * Called once the response headers arrive. At that point the server has
	 * already registered the SSE subscription: the `/events` handler subscribes
	 * to the event bus before it flushes headers, so receiving headers is a
	 * race-free "subscribed" signal — no fixed delay needed.
	 */
	onSubscribed?: () => void;
}): Promise<SseEvent[]> {
	const { baseUrl, threadId, cookieHeader, until, timeoutMs, onSubscribed } = opts;
	const url = new URL(`${baseUrl}/rest/instance-ai/events/${threadId}`);
	const transport = url.protocol === 'https:' ? https : http;
	const events: SseEvent[] = [];

	return await new Promise<SseEvent[]>((resolve, reject) => {
		const req = transport.request(
			url,
			{ method: 'GET', headers: { Accept: 'text/event-stream', Cookie: cookieHeader } },
			(res) => {
				if (res.statusCode !== 200) {
					res.resume();
					reject(new Error(`SSE on ${baseUrl} returned HTTP ${res.statusCode}`));
					return;
				}
				onSubscribed?.();
				const timer = setTimeout(() => {
					req.destroy();
					reject(
						new Error(
							`SSE timed out after ${timeoutMs}ms; received: ${events.map((e) => e.name).join(', ') || '(none)'}`,
						),
					);
				}, timeoutMs);

				let buffer = '';
				res.setEncoding('utf8');
				res.on('data', (chunk: string) => {
					buffer += chunk;
					let sep: number;
					while ((sep = buffer.indexOf('\n\n')) >= 0) {
						const frame = buffer.slice(0, sep);
						buffer = buffer.slice(sep + 2);
						const event = parseSseFrame(frame);
						if (!event) continue;
						events.push(event);
						if (until(event)) {
							clearTimeout(timer);
							req.destroy();
							resolve(events);
							return;
						}
					}
				});
				res.on('end', () => {
					clearTimeout(timer);
					resolve(events);
				});
				res.on('error', (error) => {
					clearTimeout(timer);
					reject(error);
				});
			},
		);
		req.on('error', reject);
		req.end();
	});
}

function parseSseFrame(frame: string): SseEvent | undefined {
	let id: number | undefined;
	let name: string | undefined;
	const dataLines: string[] = [];
	for (const line of frame.split('\n')) {
		if (line.startsWith(':')) continue; // keep-alive comment
		if (line.startsWith('id:')) id = Number(line.slice(3).trim());
		else if (line.startsWith('event:')) name = line.slice(6).trim();
		else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
	}
	if (dataLines.length === 0) return undefined;
	try {
		const data = JSON.parse(dataLines.join('\n')) as SseEvent['data'];
		return { id, name: name ?? data.type, data };
	} catch {
		return undefined;
	}
}

test.describe(
	'Instance AI multi-main @capability:proxy',
	{ annotation: [{ type: 'owner', description: 'instanceAI' }] },
	() => {
		test('@mode:multi-main streams a run produced on one main to an SSE held by another', async ({
			api,
			mainUrls,
			createApiForMain,
		}) => {
			test.skip(mainUrls.length < 2, 'Requires at least 2 mains');

			// Thread is created via the load balancer; lives in the shared DB.
			const thread = await api.createInstanceAiThread();

			const mainA = await createApiForMain(0); // holds the SSE connection
			const mainB = await createApiForMain(1); // runs the agent

			const { cookies } = await mainA.request.storageState();
			const authCookie = cookies.find((c) => c.name === N8N_AUTH_COOKIE);
			expect(authCookie, 'auth cookie present for main A').toBeTruthy();
			const cookieHeader = `${authCookie!.name}=${authCookie!.value}`;

			// Subscribe to the SSE on main A and wait until the subscription is
			// registered (headers received) BEFORE producing on main B — otherwise
			// A's relay handler drops B's events (it gates on `hasSubscribers`) and
			// A never buffers them (it's not the producer). Deterministic, no sleep.
			let onSubscribed!: () => void;
			const subscribed = new Promise<void>((resolve) => {
				onSubscribed = resolve;
			});
			const ssePromise = collectSseUntil({
				baseUrl: mainUrls[0],
				threadId: thread.id,
				cookieHeader,
				until: (event) => event.name === 'run-finish',
				timeoutMs: 120_000,
				onSubscribed: () => onSubscribed(),
			});
			await subscribed;

			const { runId } = await mainB.startInstanceAiChat(
				thread.id,
				'Reply with exactly the single word: pong. Do not use any tools.',
			);

			const events = await ssePromise;
			const forRun = events.filter((event) => event.data?.runId === runId);
			expect(
				forRun.some((event) => event.name === 'run-start'),
				'main A received run-start for the run produced on main B',
			).toBeTruthy();
			expect(
				forRun.some((event) => event.name === 'run-finish'),
				'main A received run-finish for the run produced on main B',
			).toBeTruthy();
		});
	},
);
