import { workflowBuilderEnabledRequirements } from '../../../config/ai-builder-fixtures';
import { test, expect } from '../../../fixtures/base';

/**
 * Regression test for N8N-9814
 * Bug: Missing tooltip on credits counter info icon in AI workflow builder panel
 *
 * Expected: Info icon should display a tooltip about credit renewal when hovered
 * Actual: No tooltip appears on hover or click
 */

// Enable proxy server for recording/replaying Anthropic API calls
test.use({
	capability: {
		services: ['proxy'],
		env: {
			N8N_AI_ANTHROPIC_KEY: 'sk-ant-test-key-for-mocked-tests',
		},
	},
});

test.describe(
	'Credits Tooltip @auth:owner @ai @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'AI' }],
	},
	() => {
		test.beforeEach(async ({ setupRequirements }) => {
			await setupRequirements(workflowBuilderEnabledRequirements);
		});

		test('should show tooltip when hovering over credits info icon', async ({ n8n }) => {
			// Navigate to new workflow with AI builder
			await n8n.page.goto('/workflow/new');

			// Open AI workflow builder panel by clicking "Build with AI" button
			await n8n.aiBuilder.getCanvasBuildWithAIButton().click();

			// Wait for assistant chat to be visible
			await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

			// Find and click the credits settings button (gear icon in header)
			const creditsSettingsButton = n8n.page.getByTestId('credits-settings-button');
			await expect(creditsSettingsButton).toBeVisible();
			await creditsSettingsButton.click();

			// Wait for the dropdown to be visible
			const creditsDropdown = n8n.page.getByTestId('credits-settings-dropdown');
			await expect(creditsDropdown).toBeVisible();

			// Find the info icon next to "Credits" label
			// The info icon is inside the credits label section
			const infoIcon = creditsDropdown.locator('[data-icon="info"]');
			await expect(infoIcon).toBeVisible();

			// Hover over the info icon
			await infoIcon.hover();

			// Assert: Tooltip should appear with credit renewal information
			// N8nTooltip typically renders with a specific role or class
			// Looking for tooltip content that mentions "credit" and "renew"
			const tooltip = n8n.page.locator('.el-tooltip__popper, [role="tooltip"]').filter({
				hasText: /credit/i,
			});

			await expect(tooltip).toBeVisible({ timeout: 5000 });

			// Verify tooltip contains expected information about credit renewal
			await expect(tooltip).toContainText(/renew/i);
		});

		test('should show tooltip on info icon in credits section with correct content', async ({
			n8n,
		}) => {
			// Navigate to new workflow with AI builder
			await n8n.page.goto('/workflow/new');

			// Open AI workflow builder panel
			await n8n.aiBuilder.getCanvasBuildWithAIButton().click();
			await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

			// Open credits settings dropdown
			const creditsSettingsButton = n8n.page.getByTestId('credits-settings-button');
			await creditsSettingsButton.click();

			// Wait for dropdown
			const creditsDropdown = n8n.page.getByTestId('credits-settings-dropdown');
			await expect(creditsDropdown).toBeVisible();

			// Find the info icon
			const infoIcon = creditsDropdown.locator('[data-icon="info"]');
			await expect(infoIcon).toBeVisible();

			// Hover over info icon to trigger tooltip
			await infoIcon.hover();

			// Wait a bit for tooltip to appear (N8nTooltip has show-after="300" delay)
			await n8n.page.waitForTimeout(400);

			// Assert tooltip appears and contains expected text
			// The tooltip should mention "One credit = one message" and renewal date
			const tooltip = n8n.page.locator('.el-tooltip__popper, [role="tooltip"]');
			await expect(tooltip).toBeVisible();
			await expect(tooltip).toContainText(/one credit.*one message/i);
		});
	},
);
