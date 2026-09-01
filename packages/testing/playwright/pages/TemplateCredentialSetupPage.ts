import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';
import { CredentialModal } from './components/CredentialModal';
import { MessageBox } from './components/messageBoxLocators';
import { SetupWorkflowCredentialsModal } from './components/SetupWorkflowCredentialsModal';

export class TemplateCredentialSetupPage extends BasePage {
	async goto(templateId: number) {
		await this.page.goto(`/templates/${templateId}/setup`);
	}

	readonly credentialModal = CredentialModal.fromPage(this.page);

	readonly canvasCredentialModal = SetupWorkflowCredentialsModal.fromPage(this.page);

	getTitle(titleText: string): Locator {
		return this.page.getByRole('heading', { name: titleText, level: 1 });
	}

	getInfoCallout(): Locator {
		return this.page.getByTestId('info-callout');
	}

	getFormSteps(): Locator {
		return this.page.getByTestId('setup-credentials-form-step');
	}

	getStepHeading(step: Locator): Locator {
		return step.getByTestId('credential-step-heading');
	}

	getStepDescription(step: Locator): Locator {
		return step.getByTestId('credential-step-description');
	}

	getSkipLink(): Locator {
		return this.page.getByRole('link', { name: 'Skip' });
	}

	getContinueButton(): Locator {
		return this.page.getByTestId('continue-button');
	}

	getCanvasSetupButton(): Locator {
		return this.page.getByTestId('setup-credentials-button');
	}

	getCanvasCredentialModal(): Locator {
		return this.canvasCredentialModal.getModal();
	}

	getSetupCredentialModalSteps(): Locator {
		return this.canvasCredentialModal.getFormSteps();
	}

	getCreateCredentialButton(appName: string): Locator {
		return this.page.getByRole('button', { name: `Create new ${appName} credential` });
	}

	getMessageBox(): Locator {
		return new MessageBox(this.page).root;
	}

	/** Opens credential creation modal and waits for it to be visible */
	async openCredentialCreation(appName: string): Promise<void> {
		await this.getCreateCredentialButton(appName).click();
		await this.credentialModal.waitForModal();
	}

	/** Waits for the message box to appear and clicks the cancel button to dismiss it */
	async dismissMessageBox(): Promise<void> {
		const messageBox = this.getMessageBox();
		await messageBox.waitFor({ state: 'visible' });
		await new MessageBox(messageBox).cancelButton.click();
	}
}
