import { test, expect } from '../../../fixtures/base';

// Settings tests use base fixtures (no proxy needed) with isolated container
test.use({ capability: { env: { TEST_ISOLATION: 'instance-ai-settings' } } });

test.describe(
	'Instance AI settings @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('should display settings page with enable toggle', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.getSettingsButton().click();

			await expect(n8n.instanceAi.getSettingsContainer()).toBeVisible({ timeout: 10_000 });
			// The enable toggle should be visible on the settings page
			await expect(n8n.instanceAi.getSettingsEnableToggle()).toBeVisible({ timeout: 5_000 });
		});
	},
);
