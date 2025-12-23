import { test, expect } from '../../../fixtures/base';

// Enable observability to use VictoriaLogs for log queries
test.use({
	addContainerCapability: {
		observability: true,
	},
});

test('Leader election @mode:multi-main @chaostest @capability:observability', async ({ chaos }) => {
	// First get the container (try main 1 first)
	const namePattern = 'n8n-main-*';

	const findContainerByLog = await chaos.waitForLog('Leader is now this', {
		namePattern,
	});

	expect(findContainerByLog, 'Leader should be found').toBeDefined();
	const currentLeader = findContainerByLog?.containerName;
	// Stop leader
	await chaos.stopContainer(currentLeader!);

	// Find new leader
	const newLeader = await chaos.waitForLog('Leader is now this', {
		namePattern,
	});

	expect(newLeader).toBeDefined();
});
