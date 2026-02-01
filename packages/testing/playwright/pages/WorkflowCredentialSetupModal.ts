import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for the Workflow Credential Setup Modal
 * This modal appears in the workflow editor when users need to complete credential setup
 * after skipping or partially completing it during template setup
 */
export class WorkflowCredentialSetupModal extends BasePage {
	/**
	 * Get the workflow credential setup modal
	 * @returns Locator for the modal element
	 */
	getModal(): Locator {
		return this.page.getByTestId('setup-workflow-credentials-modal');
	}

	/**
	 * Get the continue button in the modal
	 * @returns Locator for the continue button
	 */
	getContinueButton(): Locator {
		return this.page.getByTestId('continue-button');
	}

	/**
	 * Click the continue button to close the modal
	 */
	async clickContinue(): Promise<void> {
		await this.getContinueButton().click();
	}
}
