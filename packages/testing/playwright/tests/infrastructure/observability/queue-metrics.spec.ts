/**
 * Queue Metrics Monitoring Tests
 *
 * Verifies queue metrics are properly collected. Requires observability stack.
 *
 * Run with: pnpm test:container:multi-main --grep "queue metrics"
 */

import type { MetricResult } from 'n8n-containers';

import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		mains: 1,
		workers: 1,
	},
});

test.describe('Queue Metrics Monitoring @capability:observability @capability:queue', () => {
	test('should collect queue metrics after workflow execution', async ({
		api,
		n8nContainer,
		request,
	}) => {
		const obs = n8nContainer.services.observability;
		const baseUrl = n8nContainer.baseUrl;

		const { webhookPath } = await api.workflows.importWorkflowFromFile('simple-webhook-test.json');

		// Trigger a few webhook requests
		const requests = Array.from({ length: 10 }, (_, i) =>
			api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: { requestId: i },
			}),
		);

		const responses = await Promise.all(requests);
		const successCount = responses.filter((r) => r.ok()).length;

		// Wait for metrics interval
		await new Promise((resolve) => setTimeout(resolve, 7000));

		// Query raw metrics from n8n
		const metricsResponse = await request.get(`${baseUrl}/metrics`);
		const metricsText = await metricsResponse.text();
		const completedMatch = metricsText.match(/n8n_scaling_mode_queue_jobs_completed (\d+)/);
		// eslint-disable-next-line playwright/no-conditional-in-test
		const rawCompleted = completedMatch ? parseInt(completedMatch[1], 10) : 0;

		// Also check VictoriaMetrics
		const vmCompleted = await obs.metrics.waitForMetric('n8n_scaling_mode_queue_jobs_completed', {
			timeoutMs: 15000,
			intervalMs: 2000,
			predicate: (values: MetricResult[]) => values.length > 0 && values[0].value > 0,
		});

		// eslint-disable-next-line playwright/no-conditional-in-test
		const completedValue = vmCompleted?.value ?? rawCompleted;

		expect(completedValue).toBeGreaterThanOrEqual(successCount);
	});
});
