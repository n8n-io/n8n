import type { Page } from '@playwright/test';

/**
 * Page object for AI Workflow Builder interactions
 */
export class AIBuilderPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	// #region Locators

	getWorkflowSuggestions() {
		return this.page.getByTestId('workflow-suggestions');
	}

	getSuggestionPills() {
		// Get buttons within the pills container section, not the prompt input section
		return this.getWorkflowSuggestions()
			.locator('section[aria-label="Workflow suggestions"]')
			.getByRole('button');
	}

	getCanvasBuildWithAIButton() {
		return this.page.getByTestId('canvas-build-with-ai-button');
	}

	// #endregion

	// #region Actions

	async waitForWorkflowBuildComplete(options?: { timeout?: number }) {
		const timeout = options?.timeout ?? 300000; // Default 5 minutes
		const workingIndicator = this.page.getByText('Working...');

		// First wait for the indicator to appear (building has started)
		await workingIndicator.waitFor({ state: 'visible', timeout });

		// Then wait for it to disappear (building is complete)
		await workingIndicator.waitFor({ state: 'hidden', timeout });
	}

	// #endregion
}
