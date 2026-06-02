import { test, expect, instanceAiTestConfig, SKIP_PROXY_SETUP_ANNOTATION } from './fixtures';

const TERMINAL_FALLBACK_TEXT = 'I finished the run, but I did not generate a final response';
const BACKGROUND_CANCELLED_TEXT = 'The background workflow-builder task was cancelled.';

type ThreadStatusResponse = {
	data?: {
		backgroundTasks?: Array<{
			taskId?: string;
			status?: string;
		}>;
	};
};

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI background lifecycle @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test(
			'should recover when a background builder task is cancelled',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ api, n8n }) => {
				const owner = await api.signin('owner');
				const simulation = await api.startInstanceAiBackgroundTimeoutSimulation(owner.id);

				await n8n.instanceAi.gotoThread(simulation.threadId);
				await expect(n8n.instanceAi.getAssistantMessages().first()).toContainText(
					'I started a background workflow-builder task.',
					{ timeout: 15_000 },
				);
				await expect(n8n.instanceAi.getAssistantMessageText(TERMINAL_FALLBACK_TEXT)).toHaveCount(0);

				let taskId = '';
				await expect
					.poll(
						async () => {
							const response = await api.request.get(
								`/rest/instance-ai/threads/${simulation.threadId}/status`,
							);
							expect(response.ok()).toBe(true);

							const body = (await response.json()) as ThreadStatusResponse;
							const [task] = body.data?.backgroundTasks ?? [];
							taskId = task?.taskId ?? '';

							return task?.status;
						},
						{ timeout: 15_000 },
					)
					.toBe('running');
				expect(taskId).not.toBe('');

				const cancelResponse = await api.request.post(
					`/rest/instance-ai/chat/${simulation.threadId}/tasks/${taskId}/cancel`,
				);
				expect(cancelResponse.ok()).toBe(true);

				await expect(n8n.instanceAi.getAssistantMessageText(BACKGROUND_CANCELLED_TEXT)).toBeVisible(
					{
						timeout: 15_000,
					},
				);
				await expect(n8n.instanceAi.getAssistantMessageText(TERMINAL_FALLBACK_TEXT)).toHaveCount(0);
				await expect(n8n.instanceAi.getBackgroundTaskIndicator()).toBeHidden();
				await expect(n8n.instanceAi.getSendButton()).toBeVisible();

				await n8n.page.reload();
				await expect(n8n.instanceAi.getChatInput()).toBeVisible({ timeout: 30_000 });
				await expect(
					n8n.instanceAi.getAssistantMessageText(BACKGROUND_CANCELLED_TEXT),
				).toBeVisible();
				await expect(n8n.instanceAi.getAssistantMessageText(TERMINAL_FALLBACK_TEXT)).toHaveCount(0);
				await expect(n8n.instanceAi.getBackgroundTaskIndicator()).toBeHidden();
				await expect(n8n.instanceAi.getSendButton()).toBeVisible();
			},
		);
	},
);
