import { expect } from '@playwright/test';
import { nanoid } from 'nanoid';

import { createBuilderStreamingResponse } from '../config/ai-builder-wizard-fixtures';
import type { n8nPage } from '../pages/n8nPage';

/**
 * Multi-step flows for the AI Builder Setup Wizard.
 * Handles stream mocking, workflow generation, autosave, and follow-up messages.
 */
export class BuilderWizardComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Intercept the builder streaming endpoint and respond with mock workflow data.
	 */
	async mockBuilderStream(responseBody?: string) {
		const body = responseBody ?? createBuilderStreamingResponse();
		await this.n8n.page.route('**/rest/ai/build', async (route) => {
			await route.fulfill({
				contentType: 'application/json-lines',
				body,
			});
		});
	}

	/**
	 * Replace the builder stream mock with a new response (for follow-up messages).
	 */
	async remockBuilderStream(responseBody: string) {
		await this.n8n.page.unroute('**/rest/ai/build');
		await this.mockBuilderStream(responseBody);
	}

	/**
	 * Open the builder chat and send a prompt to trigger workflow generation.
	 */
	async triggerWorkflowGeneration() {
		await this.n8n.canvas.waitForBlankCanvasReady();
		await this.n8n.aiBuilder.waitForCanvasBuildEntry();
		await this.n8n.aiBuilder.getCanvasBuildWithAIButton().click();
		await expect(this.n8n.aiAssistant.getAskAssistantChat()).toBeVisible();
		await this.n8n.aiAssistant.sendMessage('Create a Slack notification workflow');
		await this.n8n.aiAssistant.waitForStreamingComplete();
	}

	/**
	 * Mock workflow autosave (PATCH) so it completes instantly with a checksum.
	 * with builder-generated nodes reaches the backend.
	 */
	async mockAutosave() {
		await this.n8n.page.route('**/rest/workflows/*', async (route) => {
			if (route.request().method() === 'PATCH') {
				const body = route.request().postDataJSON() as Record<string, unknown>;
				await route.fulfill({
					contentType: 'application/json',
					body: JSON.stringify({
						data: {
							...body,
							checksum: nanoid(),
							updatedAt: new Date().toISOString(),
						},
					}),
				});
				return;
			}
			await route.continue();
		});
	}

	/**
	 * Send a follow-up message to the builder after executing a workflow step.
	 * Handles autosave timing and focus management that can interfere after execution.
	 */
	async sendFollowUpMessage(message: string) {
		// Close any dialogs that may have opened (e.g., rename dialog from canvas focus)
		await this.n8n.page.keyboard.press('Escape');

		const chatInput = this.n8n.aiAssistant.getChatInput();
		await expect(chatInput).toBeEnabled({ timeout: 5000 });

		await chatInput.click();
		await chatInput.fill(message);
		await expect(this.n8n.aiAssistant.getSendMessageButton()).toBeEnabled({ timeout: 5000 });
		await this.n8n.aiAssistant.getSendMessageButton().click();
	}

	/**
	 * Navigate to the card showing the given node name.
	 * Handles both regular and node group card types.
	 * Clicks next first, then prev if needed — avoids brittle position-based navigation.
	 */
	async navigateToCard(nodeName: string) {
		const wizard = this.n8n.aiBuilder.wizard;

		// Check for the node name in either card type
		const isTargetVisible = () =>
			wizard
				.getWizard()
				.getByText(nodeName, { exact: true })
				.isVisible()
				.catch(() => false);

		if (await isTargetVisible()) return;

		// Try clicking next (works with both regular and node group card buttons)
		for (let i = 0; i < 10; i++) {
			if (!(await this.clickAnyNavButton('next'))) break;
			if (await isTargetVisible()) return;
		}

		// Try clicking prev if forward navigation didn't find it
		for (let i = 0; i < 10; i++) {
			if (!(await this.clickAnyNavButton('prev'))) break;
			if (await isTargetVisible()) return;
		}

		throw new Error(`Could not navigate to card "${nodeName}"`);
	}

	/**
	 * Click whichever navigation button is visible and enabled (regular or node group).
	 */
	private async clickAnyNavButton(direction: 'next' | 'prev'): Promise<boolean> {
		const wizard = this.n8n.aiBuilder.wizard;
		const btn = direction === 'next' ? wizard.getNextButton() : wizard.getPrevButton();

		try {
			if ((await btn.isVisible()) && (await btn.isEnabled())) {
				await btn.click();
				return true;
			}
		} catch {
			// Button may have detached during check
		}
		return false;
	}
}
