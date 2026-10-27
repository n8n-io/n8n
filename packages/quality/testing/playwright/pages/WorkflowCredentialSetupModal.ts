import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';
import { SetupWorkflowCredentialsModal } from './components/SetupWorkflowCredentialsModal';

/**
 * Page object for the Workflow Credential Setup Modal
 * This modal appears in the workflow editor when users need to complete credential setup
 * after skipping or partially completing it during template setup
 */
export class WorkflowCredentialSetupModal extends BasePage {
	readonly modal = SetupWorkflowCredentialsModal.fromPage(this.page);

	get container(): Locator {
		return this.modal.getModal();
	}

	getContinueButton(): Locator {
		return this.modal.getContinueButton();
	}

	/**
	 * Click the continue button to close the modal
	 */
	async clickContinue(): Promise<void> {
		await this.modal.clickContinue();
	}
}
