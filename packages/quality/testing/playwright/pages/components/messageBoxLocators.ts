import type { Locator, Page } from '@playwright/test';

/**
 * Locator helpers for Element Plus `.el-message-box*` (ElMessageBox confirm/prompt).
 *
 * Element Plus teleports the confirm/prompt box to `<body>` and exposes class-only
 * action buttons (`.btn--confirm`, `.btn--cancel`) and a class-only close icon
 * (`.el-message-box__headerbtn`). Centralising the raw selectors here keeps them
 * out of tests, page objects, and components.
 *
 * Construct with the teleport scope (`this.page`, an injected `root` Locator, or a
 * `<body>`-rooted Locator) — never a page object `container`, since the box renders
 * outside it. Takes `Page | Locator` directly and extends nothing, so it also works
 * for Locator-injected leaf components that have no `Page` to pass to a base class.
 */
export class MessageBox {
	constructor(private readonly scope: Page | Locator) {}

	get root(): Locator {
		return this.scope.locator('.el-message-box');
	}

	get confirmButton(): Locator {
		return this.scope.locator('.btn--confirm');
	}

	get cancelButton(): Locator {
		return this.scope.locator('.btn--cancel');
	}

	get closeIcon(): Locator {
		return this.scope.locator('.el-message-box__headerbtn');
	}

	buttonByText(text: string | RegExp): Locator {
		return this.scope.locator('.el-message-box__btns button').filter({ hasText: text });
	}
}
