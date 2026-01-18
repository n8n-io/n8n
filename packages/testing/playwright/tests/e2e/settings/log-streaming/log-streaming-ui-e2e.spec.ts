/**
 * End-to-end UI test for log streaming feature.
 *
 * This test verifies:
 * 1. Log streaming can be configured via the UI
 * 2. Test events are streamed to VictoriaLogs via syslog
 * 3. Events can be queried from VictoriaLogs
 */

import { test, expect } from '../../../../fixtures/base';

test.use({ capability: 'observability' });

test.describe('Log Streaming UI E2E @capability:observability', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.api.enableFeature('logStreaming');
	});

	test('should configure syslog destination via UI and send test event', async ({
		n8n,
		n8nContainer,
	}) => {
		const obs = n8nContainer.services.observability;

		// ========== STEP 1: Configure Log Streaming via UI ==========
		await n8n.navigate.toLogStreaming();
		await expect(n8n.settingsLogStreaming.getActionBoxLicensed()).toBeVisible();

		// Create syslog destination pointing to VictoriaLogs
		await n8n.settingsLogStreaming.createSyslogDestination({
			name: 'VictoriaLogs E2E Test',
			host: obs.syslog.host,
			port: obs.syslog.port,
		});
		// Send test event
		await n8n.settingsLogStreaming.sendTestEvent();

		// ========== STEP 3: Verify Event in VictoriaLogs ==========
		// Use wildcard search - LogsQL interprets dots as word separators
		const testEvent = await obs.logs.waitForLog('*destination.test*', {
			timeoutMs: 30000,
			start: '-2m',
		});

		expect(testEvent).toBeTruthy();
	});
});
