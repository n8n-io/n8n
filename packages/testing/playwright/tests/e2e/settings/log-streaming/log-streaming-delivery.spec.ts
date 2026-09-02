/**
 * E2E tests for real log-streaming webhook delivery.
 *
 * These tests point webhook destinations at the MockServer proxy container and
 * assert on the requests it actually received — proving header/method handling,
 * credential auth, event-subscription filtering, audit anonymization, and the
 * per-destination enable toggle end-to-end.
 *
 * Prerequisites:
 * - Log streaming feature enabled (enterprise license, @licensed)
 * - @capability:proxy tag to bring up the MockServer proxy
 */
import type { ProxyServer, RequestMade } from 'n8n-containers/services/proxy';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../../fixtures/base';
import type { ApiHelpers } from '../../../../services/api-helper';

// n8n reaches the proxy container via its internal docker network alias.
const PROXY_INTERNAL_URL = 'http://proxyserver:1080';

test.use({ capability: 'proxy' });

/** A request body recorded by MockServer can be a raw string or a wrapped object. */
function parseBody(body: unknown): unknown {
	if (body === undefined || body === null) return undefined;
	if (typeof body === 'string') {
		try {
			return JSON.parse(body);
		} catch {
			return body;
		}
	}
	if (typeof body === 'object') {
		const wrapped = body as { json?: unknown };
		if (wrapped.json !== undefined) return wrapped.json;
	}
	return body;
}

/** Read a header value case-insensitively from a recorded request. */
function getHeader(request: RequestMade['httpRequest'], name: string): string | undefined {
	const headers = request?.headers as Record<string, string[]> | undefined;
	if (!headers) return undefined;
	const lower = name.toLowerCase();
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === lower) return Array.isArray(value) ? value[0] : String(value);
	}
	return undefined;
}

/** All requests MockServer received for the given path. */
async function requestsForPath(proxy: ProxyServer, path: string): Promise<RequestMade[]> {
	const all = await proxy.getAllRequestsMade();
	return all.filter((r) => r.httpRequest?.path === path);
}

/** Parsed event payloads delivered to the given path. */
async function deliveredEvents(
	proxy: ProxyServer,
	path: string,
): Promise<Array<Record<string, unknown>>> {
	const requests = await requestsForPath(proxy, path);
	return requests
		.map((r) => parseBody(r.httpRequest?.body))
		.filter((b): b is Record<string, unknown> => typeof b === 'object' && b !== null);
}

/** Unique proxy path + a matching 200 expectation so MockServer serves rather than forwards. */
async function makeSink(
	proxy: ProxyServer,
	method = 'POST',
): Promise<{ path: string; url: string }> {
	const path = `/log-stream/${nanoid()}`;
	await proxy.createExpectation({
		httpRequest: { method, path },
		httpResponse: { statusCode: 200, body: 'ok' },
	});
	return { path, url: `${PROXY_INTERNAL_URL}${path}` };
}

/** Run a throwaway manual workflow to emit `n8n.workflow.*` events. Returns the execution id. */
async function triggerWorkflowEvents(api: ApiHelpers): Promise<string> {
	const workflow = await api.workflows.createWorkflow({
		name: `Log streaming trigger ${nanoid()}`,
		nodes: [
			{
				id: nanoid(),
				name: 'Manual',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
	});
	const { executionId } = await api.workflows.runManually(workflow.id, 'Manual');
	return executionId;
}

/** Whether any delivered event carries the given execution id in its payload. */
function deliveredExecution(events: Array<Record<string, unknown>>, executionId: string): boolean {
	return events.some((e) => {
		const payload = e.payload as Record<string, unknown> | undefined;
		return payload?.executionId === executionId;
	});
}

/** Create then delete an API key to emit `n8n.audit.user.api.deleted` (carries `is_own`). */
async function triggerApiKeyDeletedEvent(api: ApiHelpers): Promise<void> {
	const key = await api.publicApi.createApiKey();
	await api.publicApi.deleteApiKey(key.id);
}

test.describe(
	'Log Streaming delivery @capability:proxy @licensed',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		test.beforeEach(async ({ api, services }) => {
			await api.enableFeature('logStreaming');
			await api.deleteAllLogStreamingDestinations();
			await services.proxy.clearAllExpectations();
		});

		test('should deliver configured method and custom headers set via the UI', async ({
			n8n,
			services,
		}) => {
			const { path } = await makeSink(services.proxy, 'PUT');
			const headerName = 'X-Custom-Header';
			const headerValue = `value-${nanoid()}`;

			await n8n.navigate.toLogStreaming();
			await n8n.settingsLogStreaming.openDestinationModalForType(0); // Webhook
			await n8n.settingsLogStreaming.setDestinationName('UI Webhook');
			await n8n.settingsLogStreaming.writeUrlToDestinationUrlInput(`${PROXY_INTERNAL_URL}${path}`);
			await n8n.settingsLogStreaming.selectMethod('PUT');
			await n8n.settingsLogStreaming.toggleSendHeaders();
			await n8n.settingsLogStreaming.selectSpecifyHeaders('Using JSON');
			await n8n.settingsLogStreaming.fillJsonHeaders(JSON.stringify({ [headerName]: headerValue }));
			await n8n.settingsLogStreaming.saveDestination();

			// The method + header survive a reload (proving they persisted).
			await n8n.page.reload();
			await n8n.settingsLogStreaming.clickDestinationCard(0);
			expect(await n8n.settingsLogStreaming.getMethodValue()).toBe('PUT');

			await n8n.settingsLogStreaming.sendTestEvent();

			await expect
				.poll(async () => (await requestsForPath(services.proxy, path)).length)
				.toBeGreaterThan(0);
			const [request] = await requestsForPath(services.proxy, path);
			expect(request.httpRequest?.method).toBe('PUT');
			expect(getHeader(request.httpRequest, headerName)).toBe(headerValue);
		});

		test('should deliver the Authorization header from a generic header-auth credential', async ({
			api,
			services,
		}) => {
			const { path, url } = await makeSink(services.proxy);
			const token = `Bearer ${nanoid()}`;
			const credential = await api.credentials.createCredential({
				name: `Log streaming header auth ${nanoid()}`,
				type: 'httpHeaderAuth',
				data: { name: 'Authorization', value: token },
			});

			const destination = await api.createWebhookDestination({
				url,
				authentication: 'genericCredentialType',
				genericAuthType: 'httpHeaderAuth',
				credentials: { httpHeaderAuth: { id: credential.id, name: credential.name } },
			});
			await api.testLogStreamingDestination(destination.id);

			await expect
				.poll(async () => (await requestsForPath(services.proxy, path)).length)
				.toBeGreaterThan(0);
			const [request] = await requestsForPath(services.proxy, path);
			expect(getHeader(request.httpRequest, 'Authorization')).toBe(token);
		});

		test('should route events to destinations by their event subscriptions', async ({
			api,
			services,
		}) => {
			const workflowSink = await makeSink(services.proxy);
			const auditSink = await makeSink(services.proxy);

			await api.createWebhookDestination({
				url: workflowSink.url,
				subscribedEvents: ['n8n.workflow'],
				label: 'Workflow events',
			});
			await api.createWebhookDestination({
				url: auditSink.url,
				subscribedEvents: ['n8n.audit'],
				label: 'Audit events',
			});

			await triggerWorkflowEvents(api);
			await triggerApiKeyDeletedEvent(api);

			// The workflow destination receives workflow events and no audit events.
			await expect
				.poll(async () => await deliveredEvents(services.proxy, workflowSink.path))
				.toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							eventName: expect.stringMatching(/^n8n\.workflow\./),
						}),
					]),
				);
			const workflowEvents = await deliveredEvents(services.proxy, workflowSink.path);
			expect(workflowEvents.every((e) => String(e.eventName).startsWith('n8n.workflow.'))).toBe(
				true,
			);

			// The audit destination receives the api-key-deleted event and no workflow events.
			await expect
				.poll(async () => await deliveredEvents(services.proxy, auditSink.path))
				.toEqual(
					expect.arrayContaining([
						expect.objectContaining({ eventName: 'n8n.audit.user.api.deleted' }),
					]),
				);
			const auditEvents = await deliveredEvents(services.proxy, auditSink.path);
			expect(auditEvents.every((e) => String(e.eventName).startsWith('n8n.audit.'))).toBe(true);
		});

		test('should redact underscored audit fields when anonymization is enabled', async ({
			api,
			services,
		}) => {
			const { path, url } = await makeSink(services.proxy);

			await api.createWebhookDestination({
				url,
				subscribedEvents: ['n8n.audit'],
				anonymizeAuditMessages: true,
			});

			await triggerApiKeyDeletedEvent(api);

			await expect
				.poll(async () => await deliveredEvents(services.proxy, path))
				.toEqual(
					expect.arrayContaining([
						expect.objectContaining({ eventName: 'n8n.audit.user.api.deleted' }),
					]),
				);
			const events = await deliveredEvents(services.proxy, path);
			const deleted = events.find((e) => e.eventName === 'n8n.audit.user.api.deleted');
			const payload = deleted?.payload as Record<string, unknown>;
			// The @Redactable decorator prefixes user fields with `_`, which the
			// anonymizer replaces with `*`. `is_own` (no underscore) is left intact.
			expect(payload._email).toBe('*');
		});

		test('should stop delivering once a destination is toggled off', async ({
			n8n,
			api,
			services,
		}) => {
			const target = await makeSink(services.proxy);
			await api.createWebhookDestination({
				url: target.url,
				subscribedEvents: ['n8n.workflow'],
			});

			await n8n.navigate.toLogStreaming();

			// Delivery works while the destination is enabled.
			const enabledExecId = await triggerWorkflowEvents(api);
			await expect
				.poll(async () =>
					deliveredExecution(await deliveredEvents(services.proxy, target.path), enabledExecId),
				)
				.toBe(true);

			// Toggle the destination off via the card switch (awaits the save response,
			// so the disabled state is committed before we re-trigger). Only this card
			// exists yet, so index 0 is unambiguous.
			await n8n.settingsLogStreaming.clickCardToggle(0);

			// A second, still-enabled destination acts as a delivery barrier: once it
			// receives the new execution, the event pipeline has processed it — no
			// fixed sleep needed.
			const control = await makeSink(services.proxy);
			await api.createWebhookDestination({
				url: control.url,
				subscribedEvents: ['n8n.workflow'],
			});

			const disabledExecId = await triggerWorkflowEvents(api);
			await expect
				.poll(async () =>
					deliveredExecution(await deliveredEvents(services.proxy, control.path), disabledExecId),
				)
				.toBe(true);

			// The toggled-off destination received nothing for the second execution.
			expect(
				deliveredExecution(await deliveredEvents(services.proxy, target.path), disabledExecId),
			).toBe(false);
		});
	},
);
