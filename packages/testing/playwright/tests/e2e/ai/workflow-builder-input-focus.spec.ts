import { workflowBuilderEnabledRequirements } from '../../../config/ai-builder-fixtures';
import { test, expect } from '../../../fixtures/base';

/**
 * Regression test for N8N-9766: AI WF builder textarea only focuses when clicking on placeholder line
 *
 * Issue: When using the AI Workflow builder, users expect to click anywhere in the textarea
 * container area to focus the input. Currently, only clicking directly on the placeholder
 * text line focuses the textarea.
 *
 * Expected: Clicking anywhere in the input area (above, below, or around the placeholder)
 * should focus the textarea.
 *
 * Actual: Only clicking on the placeholder line itself focuses the textarea.
 */

test.describe(
	'Workflow Builder Input Focus @auth:owner @ai',
	{
		annotation: [
			{ type: 'owner', description: 'AI' },
			{ type: 'issue', description: 'N8N-9766' },
		],
	},
	() => {
		test.beforeEach(async ({ setupRequirements }) => {
			await setupRequirements(workflowBuilderEnabledRequirements);
		});

		test('should focus textarea when clicking on the input container above placeholder', async ({
			n8n,
		}) => {
			await n8n.page.goto('/workflow/new');
			await n8n.aiBuilder.getCanvasBuildWithAIButton().click();

			// Wait for the suggestions to be visible
			await expect(n8n.aiBuilder.getWorkflowSuggestions()).toBeVisible();

			// Get the chat input - when suggestions are shown, it uses chat-suggestions-input
			const chatInputContainer = n8n.page.getByTestId('chat-suggestions-input');
			await expect(chatInputContainer).toBeVisible();

			const textarea = chatInputContainer.locator('textarea');
			await expect(textarea).toBeVisible();

			// Ensure textarea is not focused initially
			await expect(textarea).not.toBeFocused();

			// Get the bounding box of the container
			const containerBox = await chatInputContainer.boundingBox();
			expect(containerBox).not.toBeNull();

			if (containerBox) {
				// Click in the upper portion of the container (above the placeholder text)
				// This simulates clicking in the empty space above the placeholder
				const clickX = containerBox.x + containerBox.width / 2;
				const clickY = containerBox.y + 10; // 10px from the top

				await n8n.page.mouse.click(clickX, clickY);

				// The textarea should now be focused
				// This assertion will FAIL until the bug is fixed
				await expect(textarea).toBeFocused();
			}
		});

		test('should focus textarea when clicking on the input container below placeholder', async ({
			n8n,
		}) => {
			await n8n.page.goto('/workflow/new');
			await n8n.aiBuilder.getCanvasBuildWithAIButton().click();

			await expect(n8n.aiBuilder.getWorkflowSuggestions()).toBeVisible();

			const chatInputContainer = n8n.page.getByTestId('chat-suggestions-input');
			await expect(chatInputContainer).toBeVisible();

			const textarea = chatInputContainer.locator('textarea');
			await expect(textarea).toBeVisible();

			// Ensure textarea is not focused initially
			await expect(textarea).not.toBeFocused();

			const containerBox = await chatInputContainer.boundingBox();
			expect(containerBox).not.toBeNull();

			if (containerBox) {
				// Click in the lower portion of the container (below the placeholder text)
				// This simulates clicking in the empty space below the placeholder
				const clickX = containerBox.x + containerBox.width / 2;
				const clickY = containerBox.y + containerBox.height - 30; // 30px from the bottom (avoiding the send button)

				await n8n.page.mouse.click(clickX, clickY);

				// The textarea should now be focused
				// This assertion will FAIL until the bug is fixed
				await expect(textarea).toBeFocused();
			}
		});

		test('should focus textarea when clicking on the scroll area wrapper', async ({ n8n }) => {
			await n8n.page.goto('/workflow/new');
			await n8n.aiBuilder.getCanvasBuildWithAIButton().click();

			await expect(n8n.aiBuilder.getWorkflowSuggestions()).toBeVisible();

			const chatInputContainer = n8n.page.getByTestId('chat-suggestions-input');
			await expect(chatInputContainer).toBeVisible();

			const textarea = chatInputContainer.locator('textarea');
			await expect(textarea).toBeVisible();

			// Ensure textarea is not focused initially
			await expect(textarea).not.toBeFocused();

			// Find the scroll area wrapper (the parent of the textarea)
			const scrollArea = chatInputContainer.locator('[data-reka-scroll-area-viewport]').first();

			// Click on the scroll area (which contains the textarea but not directly on the textarea)
			const scrollAreaBox = await scrollArea.boundingBox();
			expect(scrollAreaBox).not.toBeNull();

			if (scrollAreaBox) {
				// Click at the top of the scroll area
				const clickX = scrollAreaBox.x + scrollAreaBox.width / 2;
				const clickY = scrollAreaBox.y + 5;

				await n8n.page.mouse.click(clickX, clickY);

				// The textarea should now be focused
				// This assertion will FAIL until the bug is fixed
				await expect(textarea).toBeFocused();
			}
		});

		test('should focus textarea when clicking anywhere in the input wrapper area', async ({
			n8n,
		}) => {
			await n8n.page.goto('/workflow/new');
			await n8n.aiBuilder.getCanvasBuildWithAIButton().click();

			await expect(n8n.aiBuilder.getWorkflowSuggestions()).toBeVisible();

			const chatInputContainer = n8n.page.getByTestId('chat-suggestions-input');
			await expect(chatInputContainer).toBeVisible();

			const textarea = chatInputContainer.locator('textarea');
			await expect(textarea).toBeVisible();

			// Ensure textarea is not focused initially
			await expect(textarea).not.toBeFocused();

			const containerBox = await chatInputContainer.boundingBox();
			expect(containerBox).not.toBeNull();

			if (containerBox) {
				// Try clicking at different positions within the container
				const testPositions = [
					{ name: 'top-left', x: containerBox.x + 20, y: containerBox.y + 15 },
					{ name: 'top-right', x: containerBox.x + containerBox.width - 20, y: containerBox.y + 15 },
					{
						name: 'middle-left',
						x: containerBox.x + 20,
						y: containerBox.y + containerBox.height / 2,
					},
				];

				for (const pos of testPositions) {
					// Reset focus
					await n8n.page.mouse.click(10, 10); // Click outside
					await expect(textarea).not.toBeFocused();

					// Click at test position
					await n8n.page.mouse.click(pos.x, pos.y);

					// The textarea should now be focused
					// This assertion will FAIL until the bug is fixed
					await expect(textarea).toBeFocused({
						timeout: 1000,
					});
				}
			}
		});
	},
);
