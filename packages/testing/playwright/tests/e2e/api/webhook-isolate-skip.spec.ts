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

async function isolateAcquires(api: ApiHelpers) {
	const metrics = await (await api.request.get('/metrics')).text();
	const line = metrics.split('\n').find((l) => l.startsWith(ACQUIRED_METRIC));

	return line ? Number(line.split(' ')[1]) : 0;
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
	},
);
