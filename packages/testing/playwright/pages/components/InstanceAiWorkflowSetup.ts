import type { Locator } from '@playwright/test';

export class InstanceAiWorkflowSetup {
	constructor(private root: Locator) {}

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
		return this.root.page().getByRole('option', { name: credentialName });
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

	getPrevButton(): Locator {
		return this.root.getByTestId('instance-ai-workflow-setup-prev');
	}

	getNextButton(): Locator {
		return this.root.getByTestId('instance-ai-workflow-setup-next');
	}

	getStatusChip(state: 'applying' | 'applied' | 'partial' | 'deferred'): Locator {
		return this.root.getByTestId(`instance-ai-workflow-setup-status-${state}`);
	}

	async selectCredential(credentialName: string): Promise<void> {
		await this.getCredentialSelect().click();
		await this.getCredentialOption(credentialName).click();
	}
}
