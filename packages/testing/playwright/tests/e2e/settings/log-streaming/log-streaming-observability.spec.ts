/**
 * E2E tests for log streaming to VictoriaLogs via syslog.
 *
 * These tests verify that n8n log streaming events are correctly
 * sent to VictoriaLogs and can be queried using LogsQL.
 *
 * Prerequisites:
 * - Log streaming feature enabled (enterprise license)
 * - @capability:observability tag to bring up VictoriaLogs
 */

import { SYSLOG_DEFAULTS, ObservabilityHelper } from 'n8n-containers';

import { test, expect } from '../../../../fixtures/base';

// Worker-scoped fixtures must be at top level
test.use({ capability: 'observability' });

test.describe('Log Streaming to VictoriaLogs @capability:observability', () => {
	test.beforeEach(async ({ n8n }) => {
		// Enable log streaming feature for the test
		await n8n.api.enableFeature('logStreaming');
	});

	test('should configure syslog destination and send test message', async ({
		api,
		n8nContainer,
	}) => {
		// Get observability stack from the container
		const obsStack = n8nContainer.observability!;
		const obs = new ObservabilityHelper(obsStack);

		// Configure syslog destination pointing to VictoriaLogs
		const destination = await api.createSyslogDestination({
			...obsStack.victoriaLogs.syslog, // host, port
			...SYSLOG_DEFAULTS, // protocol, facility, app_name
			label: 'VictoriaLogs Test Destination',
		});

		expect(destination.id).toBeDefined();
		console.log(`Created syslog destination with ID: ${destination.id}`);

		// Send test message to the destination
		const testResult = await api.testLogStreamingDestination(destination.id);
		expect(testResult).toBe(true);

		// Wait for the test message to appear in VictoriaLogs
		// Use wildcard - LogsQL interprets dots as word separators
		const logEntry = await obs.logs.waitForLog('*destination.test*', {
			timeoutMs: 30000,
			start: '-1m',
		});

		expect(logEntry).toBeTruthy();

		// Clean up - delete the destination
		await api.deleteLogStreamingDestination(destination.id);
	});

	test('should query metrics from VictoriaMetrics', async ({ api, n8nContainer }) => {
		// Get observability stack from the container
		const obsStack = n8nContainer.observability!;
		const obs = new ObservabilityHelper(obsStack);

		// Import and activate a webhook workflow to generate metrics
		const { webhookPath, workflowId } = await api.workflows.importWorkflowFromFile(
			'simple-webhook-test.json',
		);

		// Trigger the workflow via webhook to generate metrics
		const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
			method: 'POST',
			data: { test: 'metrics' },
		});
		expect(webhookResponse.ok()).toBe(true);

		// Wait for workflow execution to complete
		const execution = await api.workflows.waitForExecution(workflowId, 10000);
		expect(execution.status).toBe('success');

		// Wait for metrics to be scraped (VictoriaMetrics scrapes every 5s)
		// Query for n8n version info metric (always present)
		const versionMetric = await obs.metrics.waitForMetric('n8n_version_info', {
			timeoutMs: 30000,
		});

		expect(versionMetric).toBeTruthy();
		console.log('n8n version metric:', versionMetric?.labels);
	});
});
