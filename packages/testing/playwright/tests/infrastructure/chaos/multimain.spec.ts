import type { LogEntry } from 'n8n-containers';

import { test, expect } from '../../../fixtures/base';

// Enable observability to use VictoriaLogs for log queries
test.use({ capability: 'observability' });

// Helper to extract container name from log entry
// Vector enriches logs with Docker metadata including container_name
const getContainerName = (log: LogEntry): string | undefined => log.container_name ?? log.container;

test('Leader election @mode:multi-main @chaostest @capability:observability', async ({
	n8nContainer,
}) => {
	// Find the current leader by querying VictoriaLogs
	// Vector enriches logs with container_name from Docker metadata
	const leaderLog = await n8nContainer.logs.waitForLog('Leader is now this', {
		timeoutMs: 30000,
		start: '-5m',
	});

	expect(leaderLog, 'Leader should be found').toBeDefined();

	// Extract the leader container name from the log entry
	const currentLeader = getContainerName(leaderLog!);
	expect(currentLeader, 'Leader container_name should be in log entry').toBeDefined();

	// Stop the leader container
	await n8nContainer.stopContainer(currentLeader!);

	// Wait for new leader election (another instance should take over)
	// Use LogsQL to exclude logs from the stopped container
	const newLeaderLog = await n8nContainer.logs.waitForLog(
		`Leader is now this AND NOT container_name:${currentLeader}`,
		{
			timeoutMs: 30000,
			start: '-5m', // Look at all recent logs, filtering by container excludes the old leader
		},
	);

	expect(newLeaderLog).toBeDefined();
	const newLeader = getContainerName(newLeaderLog!);
	expect(newLeader).toBeDefined();
	expect(newLeader).not.toBe(currentLeader);
});
