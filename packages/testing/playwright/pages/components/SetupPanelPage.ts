import type { Locator } from '@playwright/test';

/**
 * Page object for the setup panel sidebar with configurable root element.
 *
 * @example
 * // Include in a page
 * class CanvasPage {
 *   readonly setupPanel = new SetupPanelPage(this.page.getByTestId('focus-sidebar'));
 * }
 *
 * // Usage in a test
 * await expect(n8n.canvas.setupPanel.getContainer()).toBeVisible();
 */
export class SetupPanelPage {
	constructor(private root: Locator) {}

	// --- Container & Structure ---

	getContainer(): Locator {
		return this.root.getByTestId('setup-panel-container');
	}

	getFooter(): Locator {
		return this.root.getByTestId('setup-panel-footer');
	}

	getTabs(): Locator {
		return this.root.getByTestId('setup-panel-tabs');
	}

	getCloseButton(): Locator {
		return this.root.getByTestId('setup-panel-close');
	}

	// --- Cards ---

	getCardsList(): Locator {
		return this.root.getByTestId('setup-cards-list');
	}

	getCards(): Locator {
		return this.root.getByTestId('node-setup-card');
	}

	getCardByNodeName(name: string): Locator {
		return this.getCards().filter({ hasText: name });
	}

	// --- Card State ---

	getCardHeader(card: Locator): Locator {
		return card.getByTestId('node-setup-card-header');
	}

	getCardNodesHint(card: Locator): Locator {
		return card.getByTestId('node-setup-card-nodes-hint');
	}

	getCardCredentialSelect(card: Locator): Locator {
		return card.getByTestId('node-credentials-select');
	}

	// --- Empty & Complete States ---

	getEmptyState(): Locator {
		return this.root.getByTestId('setup-cards-empty');
	}

	getEmptyHeading(): Locator {
		return this.root.getByTestId('setup-cards-empty-heading');
	}

	getCompleteMessage(): Locator {
		return this.root.getByTestId('setup-cards-complete-message');
	}

	// --- Trigger Elements ---

	getTriggerExecuteButton(card?: Locator): Locator {
		const scope = card ?? this.root;
		return scope.getByTestId('trigger-execute-button');
	}

	getTriggerListeningCallout(card?: Locator): Locator {
		const scope = card ?? this.root;
		return scope.getByTestId('trigger-listening-callout');
	}

	getWebhookUrlPreview(card?: Locator): Locator {
		const scope = card ?? this.root;
		return scope.getByTestId('webhook-url-preview');
	}

	// --- Footer Toggle ---

	getShowCompletedToggle(): Locator {
		return this.getFooter().locator('label');
	}

	// --- Activation ---

	/**
	 * Activate the focus sidebar with the Setup tab for a given workflow ID
	 * by setting localStorage and reloading the page.
	 */
	async activateForWorkflow(workflowId: string): Promise<void> {
		const page = this.root.page();
		await page.evaluate(
			({ wid }) => {
				const key = 'N8N_FOCUS_PANEL';
				const existing = localStorage.getItem(key);
				const data = existing ? JSON.parse(existing) : {};
				data[wid] = { isActive: true, parameters: [], width: 420 };
				const newValue = JSON.stringify(data);
				const oldValue = localStorage.getItem(key);
				localStorage.setItem(key, newValue);
				// Trigger storage event so Vue's useStorage picks up the change
				window.dispatchEvent(
					new StorageEvent('storage', { key, newValue, oldValue, storageArea: localStorage }),
				);
			},
			{ wid: workflowId },
		);
		// Wait for the setup panel tabs to appear
		await this.root.getByTestId('setup-panel-tabs').waitFor({ state: 'visible', timeout: 30_000 });
	}

	// --- Actions ---

	async clickTab(tab: 'Setup' | 'Focus'): Promise<void> {
		await this.getTabs().getByText(tab).click();
	}

	async clickClose(): Promise<void> {
		await this.getCloseButton().click();
	}

	async clickCardHeader(card: Locator): Promise<void> {
		await this.getCardHeader(card).click();
	}

	async toggleShowCompleted(): Promise<void> {
		await this.getShowCompletedToggle().click();
	}
}
