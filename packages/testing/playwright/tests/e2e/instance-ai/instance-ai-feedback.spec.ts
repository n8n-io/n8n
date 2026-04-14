import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

test.describe(
	'Instance AI feedback @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('should show message rating after response', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage('What types of workflows can you help me build?');
			await n8n.instanceAi.waitForResponseComplete();

			// Rating controls should appear after the assistant responds
			const ratingContainer = n8n.instanceAi.getMessageRating();
			await expect(ratingContainer.first()).toBeVisible({ timeout: 10_000 });

			// Click the first rating button (thumbs up)
			const ratingButton = ratingContainer.first().getByRole('button').first();
			await ratingButton.click();

			// Feedback success indicator should appear
			await expect(n8n.instanceAi.getFeedbackSuccess().first()).toBeVisible({ timeout: 10_000 });
		});
	},
);
