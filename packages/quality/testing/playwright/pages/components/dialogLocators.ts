import type { Locator, Page } from '@playwright/test';

/**
 * Locator helpers for dialog close controls.
 *
 * Element Plus teleports `.el-dialog` to `<body>` and exposes a class-only close
 * icon (`.el-dialog__close`). Design-system dialogs use
 * `data-test-id="dialog-close-button"`. Centralising the raw selectors here keeps
 * them out of tests, page objects, and components that can't `extends BaseModal`
 * (Locator-injected leaf components have no `Page` to pass to its constructor).
 */

export function dialogRootIn(scope: Page | Locator): Locator {
	return scope.locator('.el-dialog');
}

export function dialogCloseIconIn(scope: Page | Locator): Locator {
	return scope.locator('.el-dialog__close').first();
}

function dialogCloseButtonIn(scope: Page | Locator): Locator {
	return scope.getByTestId('dialog-close-button').first();
}

/**
 * Click the dialog close (X) control within `scope`, but only if it's currently visible.
 * Prefer the design-system button. Fall back to the Element Plus close icon.
 *
 * `scope` must be the modal's own root (not a page-wide `getByRole('dialog')`) so that,
 * when modals are stacked, the close control resolves to the intended dialog.
 */
export async function closeDialogIfOpen(scope: Page | Locator): Promise<void> {
	const designSystemClose = dialogCloseButtonIn(scope);
	if (await designSystemClose.isVisible()) {
		await designSystemClose.click();
		return;
	}

	const closeBtn = dialogCloseIconIn(scope);
	if (!(await closeBtn.isVisible())) return;
	await closeBtn.click();
}
