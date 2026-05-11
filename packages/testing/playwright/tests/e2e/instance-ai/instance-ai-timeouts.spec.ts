import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

test.describe('Instance AI timeouts', () => {
	test.beforeEach(({}, testInfo) => {
		test.skip(
			testInfo.project.name.includes('multi-main'),
			'Instance AI background-task state is per-main-process; the seed endpoint and the browser may land on different mains.',
		);
	});

	test('should show a timeout message when a stuck background task times out', async ({
		api,
		n8n,
	}) => {
		const owner = await api.signin('owner');
		const simulation = await api.startInstanceAiBackgroundTimeoutSimulation(owner.id);

		await n8n.instanceAi.gotoThread(simulation.threadId);
		await expect(n8n.instanceAi.getAssistantMessages().first()).toContainText(
			'I started a background workflow-builder task.',
			{ timeout: 15_000 },
		);
		await expect(n8n.instanceAi.getBackgroundTaskIndicator()).toBeVisible({ timeout: 15_000 });

		await api.runInstanceAiLivenessSweep(simulation.timeoutAt);

		await expect(
			n8n.instanceAi.getAssistantMessageText(
				/Background workflow-builder task timed out after \d+ms/,
			),
		).toBeVisible({ timeout: 15_000 });
		await expect(n8n.instanceAi.getBackgroundTaskIndicator()).toBeHidden({ timeout: 15_000 });
	});
});
