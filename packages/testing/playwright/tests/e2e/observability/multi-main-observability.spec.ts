/**
 * Multi-Main Observability E2E Tests
 *
 * These tests verify that the observability stack (VictoriaMetrics + VictoriaLogs)
 * works correctly with n8n's multi-main architecture in queue mode.
 *
 * Architecture under test:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Queue Mode Cluster (2 mains + 1 worker)                               │
 * │                                                                         │
 * │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
 * │  │   Main 1     │    │   Main 2     │    │   Worker 1   │              │
 * │  │ (leader)     │    │ (follower)   │    │              │              │
 * │  │ :5678/metrics│    │ :5679/metrics│    │ :5680/metrics│              │
 * │  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
 * │         │                   │                   │                       │
 * │         │    Syslog (TCP)   │                   │                       │
 * │         └───────────────────┼───────────────────┘                       │
 * │                             │                                           │
 * │                             ▼                                           │
 * │  ┌──────────────────────────────────────────────────────────────────┐  │
 * │  │              VictoriaLogs (:9428)                                 │  │
 * │  │  - Receives syslog on port 514                                   │  │
 * │  │  - LogsQL queries via HTTP API                                   │  │
 * │  └──────────────────────────────────────────────────────────────────┘  │
 * │                                                                         │
 * │  ┌──────────────────────────────────────────────────────────────────┐  │
 * │  │              VictoriaMetrics (:8428)                              │  │
 * │  │  - Scrapes /metrics from all n8n instances every 5s              │  │
 * │  │  - PromQL queries via HTTP API                                   │  │
 * │  └──────────────────────────────────────────────────────────────────┘  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Test scenarios:
 * 1. Metrics scraping - Verify VictoriaMetrics discovers and scrapes all instances
 * 2. Log streaming - Verify logs from cluster reach VictoriaLogs via syslog
 *
 * Run with:
 *   pnpm playwright test -- --grep "Multi-main Observability"
 */

import { getLogStreamingSyslogConfig, ObservabilityHelper } from 'n8n-containers';

import { test, expect } from '../../../fixtures/base';

// Configure test to run with multi-main queue mode and observability stack
test.use({
	addContainerCapability: {
		observability: true,
		queueMode: { mains: 2, workers: 1 },
	},
});

test.describe('Multi-main Observability @capability:observability @capability:multi-main', () => {
	/**
	 * Test: Metrics scraping from multi-main cluster
	 *
	 * Verifies that VictoriaMetrics can discover and scrape metrics from all
	 * n8n instances in the queue mode cluster (2 mains + 1 worker).
	 *
	 * This tests the Prometheus-compatible /metrics endpoint exposure and
	 * service discovery configuration in VictoriaMetrics.
	 */
	test('should scrape metrics from all n8n instances', async ({ n8nContainer }) => {
		const obsStack = n8nContainer.observability!;
		const obs = new ObservabilityHelper(obsStack);

		// ========== STEP 1: Verify metrics are being scraped ==========
		// Wait for the n8n_version_info metric which is always present
		// VictoriaMetrics scrapes every 5s, so we allow up to 60s for discovery
		const versionMetric = await obs.metrics.waitForMetric('n8n_version_info', {
			timeoutMs: 60000,
		});

		expect(versionMetric).toBeTruthy();
		console.log('n8n version metric found:', versionMetric?.labels);

		// ========== STEP 2: Query scrape targets ==========
		// The 'up' metric indicates which targets are being scraped (1=up, 0=down)
		// Expected targets: 2 mains + 1 worker = 3 instances
		const allInstances = await obs.metrics.query('up');
		console.log(
			`Found ${allInstances.length} scrape targets:`,
			allInstances.map((m) => m.labels.instance),
		);

		// Verify we have at least the 2 main instances (worker may or may not expose metrics)
		expect(
			allInstances.length,
			'Expected at least 2 scrape targets (main instances)',
		).toBeGreaterThanOrEqual(2);

		// ========== STEP 3: Verify all targets are healthy ==========
		const healthyTargets = allInstances.filter((m) => m.value === 1);
		console.log(`Healthy targets: ${healthyTargets.length}/${allInstances.length}`);
		expect(
			healthyTargets.length,
			'Expected all scrape targets to be healthy (up=1)',
		).toBeGreaterThanOrEqual(2);
	});

	/**
	 * Test: Log streaming to VictoriaLogs in multi-main setup
	 *
	 * Verifies that log streaming can be configured via API and that events
	 * are correctly delivered to VictoriaLogs via syslog protocol.
	 *
	 * This tests:
	 * - Log streaming feature flag enablement
	 * - Syslog destination configuration via REST API
	 * - TCP syslog delivery from n8n to VictoriaLogs
	 * - LogsQL query capability in VictoriaLogs
	 */
	test('should configure log streaming and receive events', async ({ api, n8nContainer }) => {
		// ========== STEP 1: Enable log streaming feature ==========
		await api.enableFeature('logStreaming');

		const obsStack = n8nContainer.observability!;
		const obs = new ObservabilityHelper(obsStack);
		const syslogConfig = getLogStreamingSyslogConfig(
			obsStack.victoriaLogs.syslog.host,
			obsStack.victoriaLogs.syslog.port,
		);

		// ========== STEP 2: Configure syslog destination ==========
		// Create a syslog destination pointing to VictoriaLogs
		const destination = await api.createSyslogDestination({
			host: syslogConfig.host,
			port: syslogConfig.port,
			protocol: syslogConfig.protocol,
			label: 'Multi-main VictoriaLogs',
		});

		console.log('Created syslog destination:', destination.id);
		console.log(`  Target: ${syslogConfig.host}:${syslogConfig.port} (${syslogConfig.protocol})`);

		// ========== STEP 3: Send test message ==========
		// The test message triggers n8n to send a "n8n.destination.test" event
		const testResult = await api.testLogStreamingDestination(destination.id);
		expect(testResult, 'Test message should be sent successfully').toBe(true);
		console.log('Test message sent to log streaming destination');

		// ========== STEP 4: Verify message arrives in VictoriaLogs ==========
		// Query VictoriaLogs for the test message using LogsQL
		const logEntry = await obs.logs.waitForLog('n8n.destination.test', {
			timeoutMs: 30000,
		});

		expect(logEntry, 'Test message should appear in VictoriaLogs').toBeTruthy();
		console.log('Test message received in VictoriaLogs:', logEntry?.message);

		// ========== CLEANUP ==========
		await api.deleteLogStreamingDestination(destination.id);
		console.log('Cleaned up syslog destination');
	});
});
