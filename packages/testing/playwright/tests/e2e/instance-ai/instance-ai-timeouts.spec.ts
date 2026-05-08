import { test, expect, instanceAiTestConfig } from './fixtures';

test.use({
	...instanceAiTestConfig,
	capability: {
		...instanceAiTestConfig.capability,
		env: {
			...instanceAiTestConfig.capability.env,
			N8N_INSTANCE_AI_ACTIVE_RUN_IDLE_TIMEOUT: '0',
			N8N_INSTANCE_AI_ACTIVE_RUN_MAX_LIFETIME: '0',
			N8N_INSTANCE_AI_BACKGROUND_TASK_IDLE_TIMEOUT: '1000',
			N8N_INSTANCE_AI_BACKGROUND_TASK_MAX_LIFETIME: '0',
			N8N_INSTANCE_AI_CONFIRMATION_TIMEOUT: '0',
		},
	},
});

test.describe('Instance AI timeouts', () => {
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
