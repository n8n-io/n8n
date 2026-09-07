import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

/**
 * A production webhook whose trigger provably evaluates nothing skips acquiring
 * an expression isolate for the webhook phase (`LiveWebhooks`). That proof is a
 * scan of declared values — it cannot see an `evaluateExpression()` call added
 * to a node's `webhook()` or to a helper it calls. Such a call throws
 * `IsolateError: No bridge acquired` under `N8N_EXPRESSION_ENGINE=vm`, which is
 * what these tests guard: a new evaluation on the webhook phase turns the
 * request into a 500.
 */
const ACQUIRED_METRIC = 'n8n_expression_pool_acquired_total';

// The acquire counter is instance-global, so the metric-delta tests must not
// run concurrently with this file's other webhook-firing tests.
test.describe.configure({ mode: 'default' });

async function isolateAcquires(api: ApiHelpers) {
	return await api.metrics.getCounter(ACQUIRED_METRIC);
}

/** Acquires attributable to one request, webhook phase and execution together. */
async function acquiresForTrigger(api: ApiHelpers, workflowFile: string, expected: string) {
	const { webhookPath } = await api.workflows.importWorkflowFromFile(workflowFile);

	const before = await isolateAcquires(api);
	const response = await api.webhooks.trigger(`/webhook/${webhookPath}`, { method: 'POST' });

	expect(response.ok()).toBe(true);
	expect(await response.json()).toMatchObject({ result: expected });

	return (await isolateAcquires(api)) - before;
}

/**
 * Imports the static workflow with a transform over the trigger's parameters
 * (and optionally the node itself), then triggers it. Every case in the
 * request-path matrix below runs with the webhook-phase isolate skipped, so a
 * newly added evaluation anywhere on that path fails these as a 500.
 */
async function triggerTransformed(
	api: ApiHelpers,
	transformNode: (node: {
		typeVersion: number;
		parameters: Record<string, unknown>;
	}) => void,
	requestOptions: Parameters<ApiHelpers['webhooks']['trigger']>[1] = {},
) {
	const { webhookPath } = await api.workflows.importWorkflowFromFile(
		'webhook-isolate-skip-static.json',
		{
			transform: (workflow) => {
				transformNode(workflow.nodes![0] as never);
				return workflow;
			},
		},
	);

	return await api.webhooks.trigger(`/webhook/${webhookPath}`, {
		method: 'POST',
		...requestOptions,
	});
}

test.describe(
	'Webhook isolate skip',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		test('skips the webhook-phase isolate only when the trigger evaluates nothing', async ({
			api,
		}) => {
			// Identical workflows but for the trigger's parameters, so the difference
			// in acquires is the webhook phase — the execution costs the same in both
			const staticAcquires = await acquiresForTrigger(
				api,
				'webhook-isolate-skip-static.json',
				'static-ok',
			);
			const expressionAcquires = await acquiresForTrigger(
				api,
				'webhook-isolate-skip-expression.json',
				'expression-ok',
			);

			expect(expressionAcquires).toBeGreaterThan(staticAcquires);
		});

		test('serves an immediate response with custom code, body and headers natively', async ({
			api,
		}) => {
			const response = await triggerTransformed(api, (node) => {
				node.parameters.responseMode = 'onReceived';
				node.parameters.options = {
					responseData: 'custom-body',
					responseCode: { values: { responseCode: 202 } },
					responseHeaders: { entries: [{ name: 'x-isolate-skip', value: 'native' }] },
				};
			});

			expect(response.status()).toBe(202);
			expect(await response.text()).toBe('custom-body');
			expect(response.headers()['x-isolate-skip']).toBe('native');
		});

		test('serves an empty-body response natively', async ({ api }) => {
			const response = await triggerTransformed(api, (node) => {
				node.parameters.responseMode = 'onReceived';
				node.parameters.options = { noResponseBody: true };
			});

			expect(response.status()).toBe(200);
			expect(await response.text()).toBe('');
		});

		test('serves a last-node response with property selection and content type natively', async ({
			api,
		}) => {
			const response = await triggerTransformed(api, (node) => {
				node.parameters.options = {
					responsePropertyName: 'result',
					responseContentType: 'text/plain',
				};
			});

			expect(response.ok()).toBe(true);
			expect(response.headers()['content-type']).toContain('text/plain');
			expect(await response.text()).toContain('static-ok');
		});

		test('parses a multipart body without the webhook-phase isolate', async ({ api }) => {
			const boundary = '----isolateSkipBoundary';
			const response = await triggerTransformed(api, () => {}, {
				headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
				data: [
					`--${boundary}`,
					'Content-Disposition: form-data; name="field1"',
					'',
					'value1',
					`--${boundary}--`,
					'',
				].join('\r\n'),
			});

			expect(response.ok()).toBe(true);
			expect(await response.json()).toMatchObject({ result: 'static-ok' });
		});

		test('evaluates a matching trigger condition natively on typeVersion 2.2', async ({ api }) => {
			const response = await triggerTransformed(
				api,
				(node) => {
					node.typeVersion = 2.2;
					node.parameters.options = {
						triggerConditions: {
							conditions: [
								{ source: 'body', property: 'campaign.id', operator: 'equals', value: 'invite' },
							],
						},
					};
				},
				{
					headers: { 'content-type': 'application/json' },
					data: { campaign: { id: 'invite' } },
				},
			);

			expect(response.ok()).toBe(true);
			expect(await response.json()).toMatchObject({ result: 'static-ok' });
		});

		test('rejects a non-matching trigger condition without creating an execution', async ({
			api,
		}) => {
			const response = await triggerTransformed(
				api,
				(node) => {
					node.typeVersion = 2.2;
					node.parameters.options = {
						triggerConditions: {
							conditions: [
								{ source: 'body', property: 'campaign.id', operator: 'equals', value: 'invite' },
							],
						},
					};
				},
				{
					headers: { 'content-type': 'application/json' },
					data: { campaign: { id: 'other' } },
				},
			);

			// 200 with the generic message: the request was filtered before an
			// execution was created, still without a webhook-phase isolate.
			expect(response.status()).toBe(200);
			expect(await response.json()).toMatchObject({ message: 'Webhook call received' });
		});

		test('trigger conditions cost fewer acquires than the expression variant', async ({ api }) => {
			// Comparative, like the headline test: the 2.2 conditions variant stays on
			// the skip path while the deprecated expression variant acquires per request.
			// Import first — activation itself acquires, and only the request matters.
			const { webhookPath } = await api.workflows.importWorkflowFromFile(
				'webhook-isolate-skip-static.json',
				{
					transform: (workflow) => {
						const node = workflow.nodes![0] as unknown as {
							typeVersion: number;
							parameters: Record<string, unknown>;
						};
						node.typeVersion = 2.2;
						node.parameters.options = {
							triggerConditions: {
								conditions: [{ source: 'body', property: 'campaign', operator: 'exists' }],
							},
						};
						return workflow;
					},
				},
			);

			const before = await isolateAcquires(api);
			const conditionsResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				data: { campaign: 'x' },
			});
			expect(conditionsResponse.ok()).toBe(true);
			expect(await conditionsResponse.json()).toMatchObject({ result: 'static-ok' });
			const conditionsAcquires = (await isolateAcquires(api)) - before;

			const expressionAcquires = await acquiresForTrigger(
				api,
				'webhook-isolate-skip-expression.json',
				'expression-ok',
			);

			expect(expressionAcquires).toBeGreaterThan(conditionsAcquires);
		});

		test('acquires for typeVersion 1, whose body parsing evaluates a template', async ({ api }) => {
			// Same comparative shape as the headline test: v1 must fall back to the
			// engine, so it costs strictly more acquires than the gated v2 request.
			const staticAcquires = await acquiresForTrigger(
				api,
				'webhook-isolate-skip-static.json',
				'static-ok',
			);

			const before = await isolateAcquires(api);
			const response = await triggerTransformed(api, (node) => {
				node.typeVersion = 1;
			});
			expect(response.ok()).toBe(true);
			const v1Acquires = (await isolateAcquires(api)) - before;

			expect(v1Acquires).toBeGreaterThan(staticAcquires);
		});

		test('rejects an unauthenticated n8n user-auth request without the webhook-phase isolate', async ({
			api,
		}) => {
			// The deepest skip-path case: `authentication: 'n8nOAuth2'` is a static
			// parameter, so the skip applies, and the 401 is produced inside
			// `webhook()` after resolving the webhook URL natively. Credential
			// resolution never uses this workflow's bridge — a 500 here would mean
			// it started to.
			const response = await triggerTransformed(api, (node) => {
				node.parameters.authentication = 'n8nOAuth2';
			});

			expect(response.status()).toBe(401);
			expect(response.headers()['www-authenticate']).toContain('n8n Webhook');
		});
	},
);
