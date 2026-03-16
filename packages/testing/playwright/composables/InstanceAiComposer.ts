import type { Page } from '@playwright/test';
import { nanoid } from 'nanoid';

/**
 * Sets up all page.route() intercepts for Instance AI synthetic tests.
 * Mocks SSE events endpoint + all REST endpoints.
 * Routes are scoped to the page and auto-cleaned on page close.
 *
 * The SSE mock is stateful: it only delivers events AFTER a chat POST
 * has been made, preventing the initial EventSource connection from
 * receiving events before the user sends a message.
 */
export async function setupInstanceAiMocks(
	page: Page,
	sseBody: string,
	options?: {
		runId?: string;
		threads?: Array<{ id: string; title: string; createdAt: string }>;
	},
): Promise<void> {
	const runId = options?.runId ?? nanoid();
	const threads = options?.threads ?? [];

	let chatMessageSent = false;
	let eventsDelivered = false;

	// SSE events endpoint — stateful: only deliver events after a chat POST
	await page.route('**/instance-ai/events/**', async (route) => {
		if (chatMessageSent && !eventsDelivered) {
			// First SSE connection after chat POST: deliver the mock events
			eventsDelivered = true;
			await route.fulfill({
				status: 200,
				contentType: 'text/event-stream; charset=UTF-8',
				headers: {
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
					'X-Accel-Buffering': 'no',
				},
				body: sseBody,
			});
		} else {
			// Before chat POST: return empty SSE with fast retry (100ms) so events
			// arrive quickly once a message is sent. After delivery: use long retry
			// (60s) to prevent a reconnect loop during the rest of the test.
			const retryMs = eventsDelivered ? 60000 : 100;
			await route.fulfill({
				status: 200,
				contentType: 'text/event-stream; charset=UTF-8',
				headers: {
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
					'X-Accel-Buffering': 'no',
				},
				body: `retry: ${retryMs}\n\n`,
			});
		}
	});

	// Chat POST endpoint — sets the flag for SSE event delivery
	await page.route('**/instance-ai/chat/**', async (route) => {
		if (route.request().method() === 'POST') {
			chatMessageSent = true;
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ data: { runId } }),
			});
		} else {
			await route.continue();
		}
	});

	// Confirm endpoint
	await page.route('**/instance-ai/confirm/**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ data: { ok: true } }),
		});
	});

	// Threads list endpoint
	await page.route('**/instance-ai/threads', async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					data: { threads, total: threads.length, page: 0, hasMore: false },
				}),
			});
		} else {
			await route.continue();
		}
	});

	// Thread messages endpoint
	await page.route('**/instance-ai/threads/*/messages**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				data: { threadId: 'test', messages: [], nextEventId: 0 },
			}),
		});
	});

	// Thread status endpoint
	await page.route('**/instance-ai/threads/*/status', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				data: { hasActiveRun: false, isSuspended: false, backgroundTasks: [] },
			}),
		});
	});

	// Module settings endpoint — instance-ai enabled with gateway connected
	// to prevent InstanceAiDirectoryShare from probing the local daemon.
	await page.route('**/module-settings', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				data: {
					'instance-ai': {
						enabled: true,
						localGateway: true,
						gatewayConnected: true,
						gatewayDirectory: '/tmp/test',
						localGatewayDisabled: false,
						localGatewayFallbackDirectory: null,
					},
				},
			}),
		});
	});

	// Gateway status endpoint — prevent polling errors
	await page.route('**/instance-ai/gateway/status', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ data: { connected: true } }),
		});
	});

	// Block daemon probing (EventSource to local daemon at 127.0.0.1:7655)
	await page.route('**/127.0.0.1:7655/**', async (route) => {
		await route.abort();
	});
}
