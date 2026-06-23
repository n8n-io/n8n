import type { Locator, Page } from '@playwright/test';

/**
 * Locator helpers for Element Plus `.el-message-box*` (ElMessageBox confirm/prompt) selectors.
 *
 * Element Plus teleports the confirm/prompt box to `<body>` and exposes class-only
 * action buttons (`.btn--confirm`, `.btn--cancel`) and a class-only close icon
 * (`.el-message-box__headerbtn`). Centralising the raw selectors here keeps them
 * out of tests, page objects, and components that can't `extends BaseModal`
 * (Locator-injected leaf components have no `Page` to pass to its constructor).
 *
 * Pass the teleport scope (`this.page` or a `<body>`-rooted Locator) — never a page
 * object `container`, since the box renders outside it.
 */

export function messageBoxRootIn(scope: Page | Locator): Locator {
	return scope.locator('.el-message-box');
}

export function messageBoxConfirmButtonIn(scope: Page | Locator): Locator {
	return scope.locator('.btn--confirm');
}

export function messageBoxCancelButtonIn(scope: Page | Locator): Locator {
	return scope.locator('.btn--cancel');
}

export function messageBoxCloseIconIn(scope: Page | Locator): Locator {
	return scope.locator('.el-message-box__headerbtn');
}

export function messageBoxButtonByTextIn(scope: Page | Locator, text: string | RegExp): Locator {
	return scope.locator('.el-message-box__btns button').filter({ hasText: text });
}
