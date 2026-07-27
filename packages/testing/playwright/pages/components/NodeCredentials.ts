import type { Locator } from '@playwright/test';

import { FloatingUiHelper } from './FloatingUiHelper';

/**
 * Page object for the in-NDV credential picker (`node-credentials-select` wrapper).
 *
 * Centralizes the `node-credentials-select` selector so it lives in exactly
 * one place across the codebase. Re-used by the AI Builder setup wizard and
 * the Chat Hub modals, which render the same picker inside their own scopes.
 *
 * Teleported parts (dropdown options, `node-credentials-select-item-new`)
 * are resolved through the visible popper, so the picker can be opened from
 * inside its component scope without leaking to the page root.
 *
 * @example
 * // Inside a hosting page object
 * readonly credentials = new NodeCredentials(this.container);
 *
 * // Inside a test
 * await n8n.ndv.credentials.getSelect().click();
 * await n8n.ndv.credentials.getOptionByText('My credential').click();
 */
export class NodeCredentials {
	private readonly floatingUi: FloatingUiHelper;

	constructor(private readonly root: Locator) {
		this.floatingUi = new FloatingUiHelper(root.page());
	}

	/** The credential picker wrapper (in-NDV `node-credentials-select`) */
	getSelect(): Locator {
		return this.root.getByTestId('node-credentials-select');
	}

	/** Empty state shown when no credential is set */
	getEmptyState(): Locator {
		return this.root.getByTestId('node-credentials-empty-state');
	}

	/** Quick-connect empty state (MCP / OAuth quick connect flows) */
	getQuickConnectEmptyState(): Locator {
		return this.root.getByTestId('quick-connect-empty-state');
	}

	/** Combobox input that holds the selected credential name */
	getCombobox(): Locator {
		return this.root.getByRole('combobox', { name: 'Select Credential' });
	}

	/** Credential field label rendered above the picker */
	getLabel(): Locator {
		return this.root.getByTestId('credentials-label');
	}

	/** Credential type/name label rendered by the picker */
	getLabelByText(text: string): Locator {
		return this.root.getByText(text);
	}

	/** Teleported "Create new credential" entry shown in the open dropdown */
	getCreateNewOption(): Locator {
		return this.floatingUi.getVisiblePopper().getByText('Create new credential');
	}

	/** Teleported dropdown options (`role=option`) once the picker is open */
	getDropdownOptions(): Locator {
		return this.floatingUi.getVisiblePopoverOption();
	}

	/** Teleported option matching the given visible text */
	getOptionByText(text: string): Locator {
		return this.floatingUi.getVisiblePopper().getByText(text);
	}

	/** `node-credentials-select-item-new` row inside the open dropdown */
	getCreateNewItem(eq: number = 0): Locator {
		return this.floatingUi
			.getVisiblePopper()
			.getByTestId('node-credentials-select-item-new')
			.nth(eq);
	}

	getSetupManuallyLink(eq: number = 0): Locator {
		return this.root.getByTestId('setup-manually-link').nth(eq);
	}

	getSetupCredentialButton(eq: number = 0): Locator {
		return this.root.getByTestId('setup-credential-button').nth(eq);
	}

	/**
	 * Enter the "create new credential" flow. Handles the three possible
	 * UI states for an empty credential slot:
	 *
	 *  - "Set up manually" link (when the picker offers auth alternatives)
	 *  - "Set up credential" button (quick-connect empty state)
	 *  - Existing picker → opens the dropdown and clicks "Create new"
	 */
	async clickCreateNew(eq: number = 0): Promise<void> {
		const setupManually = this.getSetupManuallyLink(eq);
		const setupCredential = this.getSetupCredentialButton(eq);
		const credentialSelect = this.getSelect().nth(eq);

		await Promise.race([
			setupManually.waitFor({ state: 'visible', timeout: 10_000 }),
			setupCredential.waitFor({ state: 'visible', timeout: 10_000 }),
			credentialSelect.waitFor({ state: 'visible', timeout: 10_000 }),
		]);

		if (await setupManually.isVisible()) {
			await setupManually.click();
		} else if (await setupCredential.isVisible()) {
			await setupCredential.click();
		} else {
			await credentialSelect.click();
			await this.getCreateNewItem(eq).click();
		}
	}
}
