import { expect, type Locator } from '@playwright/test';

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

	/**
	 * Wrapper around a single credential slot. `.nth(eq)` indexes slots in
	 * document order, so `eq` selects the eq-th credential field regardless of
	 * which empty-state kind each slot happens to render.
	 */
	getSlot(eq: number = 0): Locator {
		return this.root.getByTestId('node-credentials-slot').nth(eq);
	}

	/** Empty state shown when no credential is set */
	getEmptyState(): Locator {
		return this.root.getByTestId('node-credentials-empty-state');
	}

	/** Direct create button shown for standard empty states with no alternate credential choice */
	getEmptyStateCreateButton(eq: number = 0): Locator {
		return this.getSlot(eq).getByTestId('node-credentials-empty-state').getByRole('button');
	}

	/** Quick-connect empty state (MCP / OAuth quick connect flows) */
	getQuickConnectEmptyState(): Locator {
		return this.root.getByTestId('quick-connect-empty-state');
	}

	/** Primary quick-connect action shown in the quick-connect empty state */
	getQuickConnectButton(eq: number = 0): Locator {
		return this.getSlot(eq).getByTestId('quick-connect-empty-state').getByRole('button').first();
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

	/**
	 * Select an existing credential by name and wait for the picker to hold it.
	 *
	 * Prefer this over relying on the NDV's implicit auto-selection, which picks
	 * the most recently updated credential of the type — in a parallel run that
	 * is often one created by another spec.
	 */
	async selectByName(name: string): Promise<void> {
		const combobox = this.getCombobox();
		await combobox.click();
		await this.getOptionByText(name).click();
		await expect(combobox).toHaveValue(name);
	}

	/** `node-credentials-select-item-new` row inside the open dropdown */
	getCreateNewItem(eq: number = 0): Locator {
		return this.floatingUi
			.getVisiblePopper()
			.getByTestId('node-credentials-select-item-new')
			.nth(eq);
	}

	getSetupManuallyLink(eq: number = 0): Locator {
		return this.getSlot(eq).getByTestId('setup-manually-link');
	}

	/**
	 * Enter the "create new credential" flow. Handles the three possible
	 * UI states for an empty credential slot:
	 *
	 *  - Quick-connect button (when quick connect is the only setup path)
	 *  - "Set up manually" link (when the picker offers auth alternatives)
	 *  - Standard empty-state button → opens the credential modal directly
	 *  - Standard empty-state picker with choices → opens the compact select
	 *    and clicks "Use my own credential"
	 *  - Existing picker → opens the dropdown and clicks "Create new"
	 *
	 * The dropdown states share the same create row (`node-credentials-select-item-new`);
	 * they differ only in which trigger opens the dropdown.
	 *
	 * `eq` indexes credential slots in document order (via {@link getSlot}), so
	 * it resolves the right field even when slots render different empty-state
	 * kinds (e.g. slot 0 quick-connect, slot 1 standard empty).
	 */
	async clickCreateNew(eq: number = 0): Promise<void> {
		const slot = this.getSlot(eq);
		const setupManually = this.getSetupManuallyLink(eq);
		const emptyState = slot.getByTestId('node-credentials-empty-state');
		const emptyStateCreateButton = this.getEmptyStateCreateButton(eq);
		const quickConnectEmptyState = slot.getByTestId('quick-connect-empty-state');
		const credentialSelect = slot.getByTestId('node-credentials-select');

		await Promise.race([
			quickConnectEmptyState.waitFor({ state: 'visible', timeout: 10_000 }),
			setupManually.waitFor({ state: 'visible', timeout: 10_000 }),
			emptyState.waitFor({ state: 'visible', timeout: 10_000 }),
			credentialSelect.waitFor({ state: 'visible', timeout: 10_000 }),
		]);

		if (await setupManually.isVisible()) {
			await setupManually.click();
			return;
		}

		if (await quickConnectEmptyState.isVisible()) {
			await this.getQuickConnectButton(eq).click();
			return;
		}

		if (await emptyStateCreateButton.isVisible()) {
			await emptyStateCreateButton.click();
			return;
		}

		// Both the populated picker and the empty-state select open a dropdown
		// whose footer row creates a new credential. `eq` picks which slot's
		// trigger to open; the resulting popper holds a single create row.
		const trigger = (await credentialSelect.isVisible()) ? credentialSelect : emptyState;
		await trigger.click();
		await this.getCreateNewItem().click();
	}
}
