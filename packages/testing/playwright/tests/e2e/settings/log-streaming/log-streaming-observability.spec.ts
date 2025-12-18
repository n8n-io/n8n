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

import { getLogStreamingSyslogConfig, ObservabilityHelper } from 'n8n-containers';

import { test, expect } from '../../../../fixtures/base';

// Worker-scoped fixtures must be at top level
test.use({
	addContainerCapability: {
		observability: true,
	},
});

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
		const syslogConfig = getLogStreamingSyslogConfig(
			obsStack.victoriaLogs.syslog.host,
			obsStack.victoriaLogs.syslog.port,
		);

		// Configure syslog destination pointing to VictoriaLogs
		const destination = await api.createSyslogDestination({
			host: syslogConfig.host,
			port: syslogConfig.port,
			protocol: syslogConfig.protocol,
			facility: syslogConfig.facility,
			app_name: syslogConfig.app_name,
			label: 'VictoriaLogs Test Destination',
		});

		expect(destination.id).toBeDefined();
		console.log(`Created syslog destination with ID: ${destination.id}`);

		// Send test message to the destination
		const testResult = await api.testLogStreamingDestination(destination.id);
		expect(testResult).toBe(true);

		// Wait for the test message to appear in VictoriaLogs
		// The test message contains "n8n.destination.test"
		const logEntry = await obs.logs.waitForLog('n8n.destination.test', {
			timeoutMs: 30000,
			start: '-1m',
		});

		expect(logEntry).toBeTruthy();
		expect(logEntry?.message).toContain('n8n.destination.test');

		// Clean up - delete the destination
		await api.deleteLogStreamingDestination(destination.id);
	});

	test('should capture workflow execution events in VictoriaLogs', async ({
		api,
		n8nContainer,
	}) => {
		// Get observability stack from the container
		const obsStack = n8nContainer.observability!;
		const obs = new ObservabilityHelper(obsStack);
		const syslogConfig = getLogStreamingSyslogConfig(
			obsStack.victoriaLogs.syslog.host,
			obsStack.victoriaLogs.syslog.port,
		);

		// Configure syslog destination
		const destination = await api.createSyslogDestination({
			host: syslogConfig.host,
			port: syslogConfig.port,
			protocol: syslogConfig.protocol,
			facility: syslogConfig.facility,
			app_name: syslogConfig.app_name,
			label: 'VictoriaLogs Workflow Events',
			// Subscribe only to workflow events
			subscribedEvents: ['n8n.workflow.started', 'n8n.workflow.success', 'n8n.workflow.failed'],
		});

		// Import and activate a webhook workflow
		const { webhookPath, workflowId } = await api.workflows.importWorkflowFromFile(
			'simple-webhook-test.json',
		);

		// Trigger the workflow via webhook
		const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
			method: 'POST',
			data: { test: 'log-streaming' },
		});
		expect(webhookResponse.ok()).toBe(true);

		// Wait for workflow execution to complete
		const execution = await api.workflows.waitForExecution(workflowId, 10000);
		expect(execution.status).toBe('success');

		// Wait for workflow.started event
		const startedEvent = await obs.logs.waitForLog('n8n.workflow.started', {
			timeoutMs: 30000,
			start: '-2m',
		});

		expect(startedEvent).toBeTruthy();
		console.log('Workflow started event received:', startedEvent?.message);

		// Wait for workflow.success event
		const successEvent = await obs.logs.waitForLog('n8n.workflow.success', {
			timeoutMs: 30000,
			start: '-2m',
		});

		expect(successEvent).toBeTruthy();
		console.log('Workflow success event received:', successEvent?.message);

		// Clean up
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
