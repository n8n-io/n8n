import type { Locator, Page } from '@playwright/test';

/**
 * Locator helpers for Element Plus `.el-dialog*` selectors.
 *
 * Element Plus teleports `.el-dialog` to `<body>` and exposes a class-only close
 * icon (`.el-dialog__close`). Centralising the raw selectors here keeps them
 * out of tests, page objects, and components that can't `extends BaseModal`
 * (Locator-injected leaf components have no `Page` to pass to its constructor).
 */

export function dialogRootIn(scope: Page | Locator): Locator {
	return scope.locator('.el-dialog');
}

export function dialogCloseIconIn(scope: Page | Locator): Locator {
	return scope.locator('.el-dialog__close').first();
}
