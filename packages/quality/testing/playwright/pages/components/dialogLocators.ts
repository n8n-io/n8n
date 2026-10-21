import type { Locator, Page } from '@playwright/test';

/**
 * Locator helpers for dialog shells.
 *
 * Dialogs teleport to the page root. The close control is a button named Close.
 * Centralising the selectors here keeps them out of tests, page objects, and
 * components that can't `extends BaseModal` (Locator-injected leaf components
 * have no `Page` to pass to its constructor).
 */

export function dialogRootIn(scope: Page | Locator): Locator {
	return scope.getByRole('dialog');
}

export function dialogCloseIconIn(scope: Page | Locator): Locator {
	return scope.getByTestId('dialog-close-button');
}

/**
 * Click the dialog close (X) icon within `scope`, but only if it's currently visible.
 *
 * `scope` must be the modal's own root (not a page-wide `getByRole('dialog')`) so that,
 * when modals are stacked, the close icon resolves to the intended dialog.
 */
export async function closeDialogIfOpen(scope: Page | Locator): Promise<void> {
	const closeBtn = dialogCloseIconIn(scope);
	if (!(await closeBtn.isVisible())) return;
	await closeBtn.click();
}
