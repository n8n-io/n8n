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

import { test, expect } from '../../../fixtures/base';

// Configure test to run with multi-main queue mode and observability stack
test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		mains: 2,
		workers: 1,
	},
});

test.describe('Multi-main Observability @capability:observability @mode:multi-main', () => {
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
		const obs = n8nContainer.services.observability;

		// Expected targets: 2 mains + 1 worker = 3 instances
		const expectedTargets = 3;

		// ========== STEP 1: Wait for all targets to be healthy ==========
		// The 'up' metric indicates which targets are being scraped (1=up, 0=down)
		// Poll until all expected targets are healthy (containers may still be starting)
		const healthyTarget = await obs.metrics.waitForMetric('up', {
			timeoutMs: 90000, // Allow time for all containers to start and be scraped
			intervalMs: 2000,
			predicate: (results) => {
				const healthy = results.filter((r) => r.value === 1);
				console.log(
					`Waiting for healthy targets: ${healthy.length}/${expectedTargets}`,
					healthy.map((r) => r.labels.instance),
				);
				return healthy.length >= expectedTargets;
			},
		});

		expect(healthyTarget, 'Expected all scrape targets to become healthy').toBeTruthy();

		// ========== STEP 2: Verify final state ==========
		const allInstances = await obs.metrics.query('up');
		const healthyTargets = allInstances.filter((m) => m.value === 1);

		console.log(
			`Final state: ${healthyTargets.length}/${allInstances.length} healthy targets:`,
			healthyTargets.map((m) => m.labels.instance),
		);

		expect(healthyTargets.length).toBe(expectedTargets);
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

		const obs = n8nContainer.services.observability;

		// ========== STEP 2: Configure syslog destination ==========
		// Create a syslog destination pointing to VictoriaLogs
		const destination = await api.createSyslogDestination({
			host: obs.syslog.host,
			port: obs.syslog.port,
			protocol: obs.syslog.protocol,
			label: 'Multi-main VictoriaLogs',
		});

		console.log('Created syslog destination:', destination.id);
		console.log(`  Target: ${obs.syslog.host}:${obs.syslog.port} (${obs.syslog.protocol})`);

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
