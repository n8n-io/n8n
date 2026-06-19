import type { Locator, Page } from '@playwright/test';

import { FloatingUiHelper } from './FloatingUiHelper';

/**
 * Base modal component for handling modal dialogs.
 *
 * Element Plus teleports `.el-dialog` to <body> and exposes a class-only close
 * icon (`.el-dialog__close`). The raw selectors are centralised here so callers
 * never reach for `.el-dialog*` directly.
 */
export class BaseModal extends FloatingUiHelper {
	constructor(protected readonly page: Page) {
		super(page);
	}

	get container() {
		return this.page.getByRole('dialog');
	}

	getCloseButton() {
		return this.container.getByRole('button', { name: /close/i });
	}

	/** Element Plus dialog root (`.el-dialog`) scoped to this modal's page. */
	getDialogRoot(): Locator {
		return BaseModal.dialogRootIn(this.page);
	}

	/** Element Plus close (X) icon (`.el-dialog__close`) inside this modal's container. */
	getDialogCloseIcon(): Locator {
		return BaseModal.dialogCloseIconIn(this.container);
	}

	/** Escape hatch for callers without a BaseModal instance — keeps `.el-dialog` in one file. */
	static dialogRootIn(scope: Page | Locator): Locator {
		return scope.locator('.el-dialog');
	}

	/** Escape hatch for callers without a BaseModal instance — keeps `.el-dialog__close` in one file. */
	static dialogCloseIconIn(scope: Page | Locator): Locator {
		return scope.locator('.el-dialog__close').first();
	}

	async waitForModal() {
		await this.container.waitFor({ state: 'visible' });
	}

	async fillInput(text: string) {
		await this.container.getByRole('textbox').fill(text);
	}

	async clickButton(buttonText: string | RegExp) {
		await this.container.getByRole('button', { name: buttonText }).click();
	}
}
