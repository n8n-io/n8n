import { test, expect } from '../../fixtures/base';

test('Leader election @mode:multi-main @chaostest', async ({ chaos }) => {
	// First get the container (try main 1 first)
	const namePattern = 'n8n-main-*';

	const findContainerByLog = await chaos.waitForLog('Leader is now this', {
		namePattern,
	});

	expect(findContainerByLog).toBeDefined();
	const currentLeader = findContainerByLog.containerName;
	// Stop leader
	await chaos.stopContainer(currentLeader);

	// Find new leader
	const newLeader = await chaos.waitForLog('Leader is now this', {
		namePattern,
	});

	expect(newLeader).toBeDefined();
});
