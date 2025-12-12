import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class WorkflowActivationModal extends BasePage {
	getModal(): Locator {
		return this.page.getByTestId('activation-modal');
	}

	getDontShowAgainCheckbox(): Locator {
		return this.getModal().getByText("Don't show again");
	}

	getGotItButton(): Locator {
		return this.getModal().getByRole('button', { name: 'Got it' });
	}

	async close(): Promise<void> {
		await this.getDontShowAgainCheckbox().click();

		await this.getGotItButton().click();
	}

	async clickDontShowAgain(): Promise<void> {
		await this.getDontShowAgainCheckbox().click();
	}

	async clickGotIt(): Promise<void> {
		await this.getGotItButton().click();
	}
}
