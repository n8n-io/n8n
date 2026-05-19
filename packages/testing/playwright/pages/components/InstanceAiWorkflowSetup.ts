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

	getGroupCard(): Locator {
		return this.root.getByTestId('instance-ai-workflow-setup-group-card');
	}

	getGroupCheck(): Locator {
		return this.root.getByTestId('instance-ai-workflow-setup-group-card-check');
	}

	getSection(nodeName: string): Locator {
		return this.root
			.getByTestId('instance-ai-workflow-setup-section')
			.filter({ hasText: nodeName });
	}

	getSectionHeader(nodeName: string): Locator {
		return this.getSection(nodeName).getByTestId('instance-ai-workflow-setup-section-header');
	}

	async selectSectionCredential(nodeName: string, credentialName: string): Promise<void> {
		await this.ensureSectionExpanded(nodeName);
		await this.getSection(nodeName).getByRole('combobox').first().click();
		await this.getCredentialOption(credentialName).click();
	}

	async fillSectionParameter(
		nodeName: string,
		parameterName: string,
		value: string,
	): Promise<void> {
		await this.ensureSectionExpanded(nodeName);
		await this.getSection(nodeName)
			.getByTestId(`parameter-input-${parameterName}`)
			.getByRole('textbox')
			.fill(value);
	}

	async selectCredential(credentialName: string): Promise<void> {
		await this.getCredentialSelect().click();
		await this.getCredentialOption(credentialName).click();
	}

	async fillParameter(parameterName: string, value: string): Promise<void> {
		await this.getParameterInput(parameterName).fill(value);
	}

	private async ensureSectionExpanded(nodeName: string): Promise<void> {
		const section = this.getSection(nodeName);
		const body = section.getByTestId('instance-ai-workflow-setup-section-body');
		// Allow any in-flight auto-expand to settle before deciding whether to
		// click the header — otherwise we can race the wizard's auto-expand-next
		// watcher and toggle a section that was already opening.
		try {
			await body.waitFor({ state: 'visible', timeout: 500 });
		} catch {
			await this.getSectionHeader(nodeName).click();
			await body.waitFor({ state: 'visible' });
		}
	}
}
