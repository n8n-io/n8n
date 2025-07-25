import { test, expect } from '../../fixtures/base';

test(
	'Database connection timeout health check bug @mode:postgres @chaostest',
	{
		annotation: {
			type: 'issue',
			description: 'CAT-1018',
		},
	},
	async ({ api, chaos }) => {
		test.setTimeout(300000);

		// ========== SETUP: Verify Initial Health ==========
		// Ensure n8n starts in a healthy state before we begin chaos testing
		const initialHealth = await api.isHealthy();
		expect(initialHealth).toBe(true);
		console.log('✓ n8n is initially healthy');

		// ========== CHAOS INJECTION: Block Database Traffic ==========
		// Find postgres container and install iptables to simulate network issues
		const postgres = chaos.findContainers('postgres*')[0];

		// Install iptables in the postgres container (Alpine Linux)
		await postgres.exec(['apk', 'update']);
		await postgres.exec(['apk', 'add', 'iptables']);

		// Block all incoming TCP traffic to PostgreSQL port 5432
		// This simulates a network partition between n8n and the database
		await postgres.exec(['iptables', '-A', 'INPUT', '-p', 'tcp', '--dport', '5432', '-j', 'DROP']);
		console.log('✓ Database port 5432 is now blocked - simulating network partition');

		// ========== WAIT FOR CONNECTION ISSUES ==========
		// First, wait for the connection pool to detect the timeout
		// This message appears when the pg-pool library detects connection issues
		await chaos.waitForLog('Connection terminated due to connection timeout', {
			namePattern: 'n8n-*',
			timeoutMs: 180000, // 3 minutes - connection pools can take time to timeout
		});

		// ========== TRIGGER ACTIVE DATABASE QUERY ==========
		// The timeout error only appears when n8n tries to query the database
		// We trigger this by calling an endpoint that requires DB access
		console.log('Triggering database query to expose timeout errors...');
		await api.get('/rest/settings');

		// Now wait for the specific error from the bug report
		const errorLog = await chaos.waitForLog('timeout exceeded when trying to connect', {
			namePattern: 'n8n-*',
			timeoutMs: 180000,
			throwOnTimeout: false, // Don't fail if not found - we'll check later
		});

		// This doesn't always show up, it shows up when I manually interact with the UI/API
		expect.soft(errorLog, 'n8n should be logging timeout errors').toBeDefined();
		console.log('✓ n8n is logging timeout errors as expected');

		// ========== BUG VERIFICATION: Health Check Should Fail But Doesn't ==========
		// This is the core bug: health endpoint reports OK despite DB being unreachable
		// In a properly functioning system, the health check should fail when the DB is down
		console.log('Checking health endpoint during database outage...');
		const healthDuringOutage = await api.isHealthy();

		// Using soft assertion to continue test even if bug is fixed
		expect.soft(healthDuringOutage).toBe(false);

		expect
			.soft(healthDuringOutage, 'Health endpoint should report unhealthy during database outage')
			.toBe(false);

		// ========== RESTORE DATABASE CONNECTION ==========
		// Remove the iptables rule to allow traffic again
		console.log('Restoring database connectivity...');
		await postgres.exec(['iptables', '-D', 'INPUT', '-p', 'tcp', '--dport', '5432', '-j', 'DROP']);
		console.log('✓ Network partition removed - database should be reachable again');

		// ========== BUG VERIFICATION: Recovery Should Happen But Doesn't ==========
		// The second part of the bug: n8n doesn't automatically recover when DB comes back
		console.log('Waiting for n8n to automatically recover...');
		// Check we don't see this log anymore, we should replace this with a recovery log if we have one, I couldn't find one though
		const recoveryLog = await chaos.waitForLog('Connection terminated due to connection timeout', {
			namePattern: 'n8n-*',
			timeoutMs: 60000, // 1 minute should be enough for recovery
			throwOnTimeout: false,
		});

		expect
			.soft(recoveryLog?.containerName, 'n8n should automatically reconnect to the database')
			.toBeNull();

		// ========== WORKAROUND: Manual Restart Required ==========
		// Since n8n doesn't auto-recover, we need to restart the container
		// This mimics what the bug reporter had to do in production
		console.log('Performing manual restart as workaround...');
		const n8nContainer = chaos.findContainers('n8n-*')[0];
		await n8nContainer.restart();

		// Wait for n8n to fully start up after restart
		const n8nRecoveryLog = await chaos.waitForLog('Editor is now accessible via', {
			namePattern: 'n8n-*',
			timeoutMs: 60000,
		});

		expect(n8nRecoveryLog, 'n8n should start successfully after manual restart').toBeDefined();
		console.log('✓ n8n recovered after manual restart');

		// ========== SUMMARY ==========
		console.log('\n=== Test Summary ===');
		console.log('Bug reproduced successfully:');
		console.log('1. Health check incorrectly reports healthy during DB outage');
		console.log('2. n8n does not automatically recover when DB connection is restored');
		console.log('3. Manual restart is required to restore functionality');
	},
);
