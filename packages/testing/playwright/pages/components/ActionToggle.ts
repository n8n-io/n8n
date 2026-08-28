import type { Locator, Page } from '@playwright/test';

/**
 * Wraps the Element Plus row/resource action menu
 * (`[data-testid="action-toggle-dropdown"]`). Multiple toggles can be present
 * on a page, so use the menu-item accessor to scope to the currently open one.
 */
export class ActionToggle {
	constructor(private readonly page: Page) {}

	/** Root of the action menu dropdown. */
	get root(): Locator {
		return this.page.getByTestId('action-toggle-dropdown');
	}

	/**
	 * Opens the action toggle nested inside the given row/resource trigger
	 * (the card, table row, or cell that hosts the `action-toggle` button).
	 */
	async open(trigger: Locator): Promise<void> {
		await trigger.getByTestId('action-toggle').getByRole('button').click();
	}

	/** Action item scoped inside the toggle, e.g. `action-delete`. */
	getAction(name: string): Locator {
		return this.root.getByTestId(`action-${name}`);
	}

	/** Menu item by index from the currently open (visible) toggle. */
	getMenuItem(index: number): Locator {
		return this.root.filter({ visible: true }).getByRole('menuitem').nth(index);
	}
}
