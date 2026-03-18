import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the AI Builder Setup Wizard card UI.
 * Encapsulates all wizard locators so specs don't use raw selectors.
 */
export class BuilderSetupWizardPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	// #region Locators

	/** The outer wizard container (hidden once all cards complete + workflow executed) */
	getWizard(): Locator {
		return this.page.getByTestId('builder-setup-wizard');
	}

	/** The currently visible setup card */
	getCard(): Locator {
		return this.page.getByTestId('builder-setup-card');
	}

	/** Previous-step arrow inside the card footer */
	getPrevButton(): Locator {
		return this.page.getByTestId('builder-setup-card-prev');
	}

	/** Next-step arrow inside the card footer */
	getNextButton(): Locator {
		return this.page.getByTestId('builder-setup-card-next');
	}

	/** The trigger / node execute button inside the card */
	getExecuteStepButton(): Locator {
		return this.page.getByTestId('trigger-execute-button');
	}

	/** Green check mark shown when a card is complete */
	getCompleteCheck(): Locator {
		return this.getCard().getByTestId('builder-setup-card-check');
	}

	/** Credential label/picker section inside the card */
	getCredentialLabel(): Locator {
		return this.page.getByTestId('credentials-label');
	}

	/** Credential dropdown select inside the card */
	getCredentialSelect(): Locator {
		return this.getCard().getByTestId('node-credentials-select');
	}

	/** Parameter input for a specific parameter name */
	getParameterInput(paramName: string): Locator {
		return this.page.getByTestId(`parameter-input-${paramName}`);
	}

	/** "Used in X nodes" hint shown on grouped credential cards */
	getNodesHint(): Locator {
		return this.page.getByTestId('builder-setup-card-nodes-hint');
	}

	/** Step indicator text, e.g. "1 of 2" */
	getStepIndicator(current: number, total: number): Locator {
		return this.getCard().getByText(`${current} of ${total}`);
	}

	/** Card title (node name) */
	getCardTitle(name: string): Locator {
		return this.getCard().getByText(name, { exact: true });
	}

	// #endregion
}
