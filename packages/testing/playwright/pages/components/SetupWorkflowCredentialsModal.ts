import type { Locator, Page } from '@playwright/test';

/**
 * Shared component for the "Setup workflow credentials" modal that appears in
 * the workflow editor (e.g. after importing a template or skipping credential
 * setup). Owns the `setup-workflow-credentials-modal` test-id so it is declared
 * in a single place.
 */
export class SetupWorkflowCredentialsModal {
	constructor(private readonly root: Locator) {}

	static fromPage(page: Page): SetupWorkflowCredentialsModal {
		return new SetupWorkflowCredentialsModal(page.getByTestId('setup-workflow-credentials-modal'));
	}

	getModal(): Locator {
		return this.root;
	}

	getContinueButton(): Locator {
		return this.root.getByTestId('continue-button');
	}

	getFormSteps(): Locator {
		return this.root.getByTestId('setup-credentials-form-step');
	}

	async clickContinue(): Promise<void> {
		await this.getContinueButton().click();
	}
}
