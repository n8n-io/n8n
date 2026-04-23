import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for the Workflow Credential Setup Modal
 * This modal appears in the workflow editor when users need to complete credential setup
 * after skipping or partially completing it during template setup
 */
export class WorkflowCredentialSetupModal extends BasePage {
	get container(): Locator {
		return this.page.getByTestId('setup-workflow-credentials-modal');
	}

	getContinueButton(): Locator {
		return this.container.getByTestId('continue-button');
	}

	/**
	 * Click the continue button to close the modal
	 */
	async clickContinue(): Promise<void> {
		await this.getContinueButton().click();
	}
}
