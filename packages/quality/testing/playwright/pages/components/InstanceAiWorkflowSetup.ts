import type { Locator } from '@playwright/test';

import { FloatingUiHelper } from './FloatingUiHelper';

export class InstanceAiWorkflowSetup {
	private floatingUi: FloatingUiHelper;

	constructor(private root: Locator) {
		this.floatingUi = new FloatingUiHelper(root.page());
	}

	getContainer(): Locator {
		return this.root;
	}

	getWizard(): Locator {
		return this.root;
	}

	getCard(): Locator {
		return this.root;
	}

	getStepText(text: string | RegExp = /\d+ of \d+/): Locator {
		return this.root.getByText(text);
	}

	getSetupCredentialButton(): Locator {
		return this.root.getByRole('button', { name: /^Set up credential(?:s)?$/ });
	}

	getCredentialSelect(): Locator {
		return this.getCard().getByRole('combobox').first();
	}

	getCredentialOption(credentialName: string): Locator {
		return this.floatingUi.getVisiblePopoverOption(credentialName);
	}

	getCredentialOptionById(credentialId: string): Locator {
		return this.root.page().getByTestId(`node-credentials-select-item-${credentialId}`);
	}

	getApplyButton(): Locator {
		return this.root.getByRole('button', { name: /^(Apply|Continue)$/ });
	}

	getLaterButton(): Locator {
		return this.root.getByRole('button', { name: 'Skip setup for now' });
	}

	getCardCheck(): Locator {
		return this.root.getByText('Complete', { exact: true });
	}

	getCardSkipped(): Locator {
		return this.root.getByTestId('instance-ai-workflow-setup-card-skipped');
	}

	getUsedByNodesHint(): Locator {
		return this.root.getByTestId('instance-ai-workflow-setup-card-nodes-hint');
	}

	getParameterInput(parameterName: string): Locator {
		return this.root.getByTestId(`parameter-input-${parameterName}`).getByRole('textbox');
	}

	getParameterIssues(parameterName: string): Locator {
		return this.root
			.getByTestId(`parameter-input-${parameterName}`)
			.getByTestId('parameter-issues');
	}

	getPrevButton(): Locator {
		return this.root.getByTestId('instance-ai-workflow-setup-prev');
	}

	getNextButton(): Locator {
		return this.root.getByTestId('instance-ai-workflow-setup-next');
	}

	async selectCredential(credentialName: string): Promise<void> {
		await this.selectCredentialOption(this.getCredentialOption(credentialName));
	}

	async selectCredentialById(credentialId: string): Promise<void> {
		await this.selectCredentialOption(this.getCredentialOptionById(credentialId));
	}

	async getSelectedCredentialLabel(): Promise<string> {
		return await this.getCredentialSelect().evaluate((element) => {
			if (element instanceof HTMLInputElement) {
				return element.value || element.placeholder;
			}

			return element.textContent?.trim() ?? '';
		});
	}

	private async selectCredentialOption(option: Locator): Promise<void> {
		await this.getCredentialSelect().click();
		await option.waitFor({ state: 'attached' });
		await option.dispatchEvent('click');
		await this.getCredentialSelect().press('Escape');
	}

	async fillParameter(parameterName: string, value: string): Promise<void> {
		await this.getParameterInput(parameterName).fill(value);
	}
}
