import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';
import { CredentialModal } from './components/CredentialModal';

export class TemplateCredentialSetupPage extends BasePage {
	readonly credentialModal = new CredentialModal(
		this.page.getByTestId('setup-workflow-credentials-modal'),
	);

	getSetupTemplateButton(): Locator {
		return this.page.getByTestId('setup-credentials-button');
	}

	getSetupCredentialModalSteps(): Locator {
		return this.page
			.getByTestId('setup-workflow-credentials-modal')
			.getByTestId('setup-credentials-form-step');
	}

	/** Opens credential creation modal and waits for it to be visible */
	async openTemplateSetupModal(): Promise<void> {
		await this.getSetupTemplateButton().click();
		await this.credentialModal.waitForModal();
	}
}
