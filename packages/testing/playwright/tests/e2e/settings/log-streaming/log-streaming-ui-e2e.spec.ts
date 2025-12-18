/**
 * End-to-end UI test for log streaming feature.
 *
 * This is the happy path test that verifies:
 * 1. Log streaming can be configured via the UI
 * 2. Workflow execution events are streamed to the configured destination
 * 3. Events can be queried from VictoriaLogs
 *
 * This test serves as a foundation that others can build upon.
 */

import { ObservabilityHelper } from 'n8n-containers';

import { test, expect } from '../../../../fixtures/base';

test.use({
	addContainerCapability: {
		observability: true,
	},
});

test.describe('Log Streaming UI E2E @capability:observability', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.api.enableFeature('logStreaming');
	});

	test('should configure syslog destination via UI and capture workflow events', async ({
		api,
		n8n,
		n8nContainer,
	}) => {
		const obsStack = n8nContainer.observability!;
		const obs = new ObservabilityHelper(obsStack);

		// ========== STEP 1: Configure Log Streaming via UI ==========
		await n8n.navigate.toLogStreaming();
		await expect(n8n.settingsLogStreaming.getActionBoxLicensed()).toBeVisible();

		// Create syslog destination pointing to VictoriaLogs
		await n8n.settingsLogStreaming.createSyslogDestination({
			name: 'VictoriaLogs E2E Test',
			host: obsStack.victoriaLogs.syslog.host,
			port: obsStack.victoriaLogs.syslog.port,
		});

		await n8n.page.pause();

		// Verify destination was created
		await n8n.page.reload();
		await expect(n8n.settingsLogStreaming.getDestinationCards().first()).toBeVisible();

		// ========== STEP 2: Import and Trigger Workflow via Webhook ==========
		// Import workflow via API (cleaner than creating via UI)
		const { webhookPath, workflowId } = await api.workflows.importWorkflowFromFile(
			'simple-webhook-test.json',
		);

		// Trigger the workflow via webhook
		const testPayload = { message: 'Log streaming E2E test' };
		const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
			method: 'POST',
			data: testPayload,
		});
		expect(webhookResponse.ok()).toBe(true);

		// Wait for workflow execution to complete
		const execution = await api.workflows.waitForExecution(workflowId, 10000);
		expect(execution.status).toBe('success');

		// ========== STEP 3: Verify Events in VictoriaLogs ==========
		// Wait for workflow.started event
		const startedEvent = await obs.logs.waitForLog('n8n.workflow.started', {
			timeoutMs: 30000,
			start: '-2m',
		});

		expect(startedEvent).toBeTruthy();
		console.log('Workflow started event captured:', startedEvent?.message.substring(0, 100));

		// Wait for workflow.success event
		const successEvent = await obs.logs.waitForLog('n8n.workflow.success', {
			timeoutMs: 30000,
			start: '-2m',
		});

		expect(successEvent).toBeTruthy();
		console.log('Workflow success event captured:', successEvent?.message.substring(0, 100));

		// ========== CLEANUP ==========
		// Delete the destination via UI
		await n8n.navigate.toLogStreaming();
		await n8n.settingsLogStreaming.clickDestinationCard(0);
		await n8n.settingsLogStreaming.deleteDestination();
		await n8n.settingsLogStreaming.confirmDialog();
	});
});
