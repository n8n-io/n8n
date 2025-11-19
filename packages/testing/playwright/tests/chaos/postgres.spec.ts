import { Time } from '@n8n/constants';

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
		{
			const isLive = await api.isHealthy('liveness');
			const isReady = await api.isHealthy('readiness');
			console.log('isLive', isLive);
			console.log('isReady', isReady);
			expect(isLive).toBe(true);
			expect(isReady).toBe(true);
		}

		// ========== CHAOS INJECTION: Block Database Traffic ==========
		// Find postgres container and install iptables to simulate network issues
		const postgres = chaos.findContainers('postgres*')[0];

		// Install iptables in the postgres container (Alpine Linux)
		const apkUpdate = await postgres.exec(['apk', 'update']);
		console.log('apkUpdate', apkUpdate.output);
		const apkInstall = await postgres.exec(['apk', 'add', 'iptables']);
		console.log('apkInstall', apkInstall.output);
		// Block all incoming TCP traffic to PostgreSQL port 5432
		// This simulates a network partition between n8n and the database
		const rule = ['INPUT', '-p', 'tcp', '--dport', '5432', '-j', 'DROP'];
		const blockPostgresTraffic = await postgres.exec(['iptables', '-A', ...rule]);
		console.log('blockPostgresTraffic', blockPostgresTraffic.output);
		expect(apkUpdate.exitCode).toBe(0);
		expect(apkInstall.exitCode).toBe(0);
		expect(blockPostgresTraffic.exitCode).toBe(0);

		// ========== WAIT FOR CONNECTION ISSUES ==========
		console.log('wait for line 1');
		await chaos.waitForLog('Database connection timed out', {
			namePattern: 'n8n-*',
			timeoutMs: 20 * Time.seconds.toMilliseconds,
		});

		// ========== VERIFY: Health Checks ==========
		{
			const isLive = await api.isHealthy('liveness');
			const isReady = await api.isHealthy('readiness');
			console.log('isLive', isLive);
			console.log('isReady', isReady);
			expect(isLive).toBe(true);
			expect(isReady).toBe(false);
		}

		// ========== RESTORE DATABASE CONNECTION ==========
		// Remove the iptables rule to allow traffic again
		const allowPostgresTraffic = await postgres.exec(['iptables', '-D', ...rule]);
		console.log('allowPostgresTraffic', allowPostgresTraffic.output);
		expect(allowPostgresTraffic.exitCode).toBe(0);

		// ========== VERIFY: Automatic Recovery ==========
		console.log('wait for line 2');
		await chaos.waitForLog('Database connection recovered', {
			namePattern: 'n8n-*',
			timeoutMs: 20 * Time.seconds.toMilliseconds,
		});
	},
);
