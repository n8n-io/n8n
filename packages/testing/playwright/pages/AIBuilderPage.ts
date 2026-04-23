import { expect, type Locator, type Page } from '@playwright/test';

import { BuilderSetupWizard } from './components/BuilderSetupWizard';

/**
 * Page object for AI Workflow Builder interactions
 */
export class AIBuilderPage {
	readonly page: Page;
	readonly wizard: BuilderSetupWizard;

	constructor(page: Page) {
		this.page = page;
		this.wizard = new BuilderSetupWizard(page);
	}

	get container(): Locator {
		return this.page.getByTestId('canvas-choice-prompt');
	}

	// #region Locators

	getWorkflowSuggestions() {
		return this.container.getByTestId('workflow-suggestions');
	}

	getCanvasChoicePrompt() {
		return this.container;
	}

	getSuggestionPills() {
		// Get buttons within the pills container section, not the prompt input section
		return this.getWorkflowSuggestions()
			.locator('section[aria-label="Workflow suggestions"]')
			.getByRole('button');
	}

	getCanvasBuildWithAIButton() {
		return this.container.getByTestId('canvas-build-with-ai-button');
	}

	// #endregion

	// #region Actions

	async waitForCanvasBuildEntry() {
		const buildButton = this.getCanvasBuildWithAIButton();

		await expect(this.getCanvasChoicePrompt()).toBeVisible();
		await expect(buildButton).toBeVisible();
		await expect(buildButton).toBeEnabled();
	}

	async waitForWorkflowBuildComplete(options?: { timeout?: number }) {
		const timeout = options?.timeout ?? 300000; // Default 5 minutes
		const workingIndicator = this.container.getByText('Working...');

		// First wait for the indicator to appear (building has started)
		await workingIndicator.waitFor({ state: 'visible', timeout });

		// Then wait for it to disappear (building is complete)
		await workingIndicator.waitFor({ state: 'hidden', timeout });
	}

	// #endregion
}
