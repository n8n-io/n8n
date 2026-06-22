import type { Locator, Page } from '@playwright/test';

import { dialogCloseIconIn } from './dialogLocators';
import { FloatingUiHelper } from './FloatingUiHelper';

/**
 * Base modal component for handling modal dialogs.
 *
 * For modals that can extend this class (constructed with a `Page`). Leaf
 * components injected with a `Locator` should import helpers from
 * `./dialogLocators` directly instead.
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

	/** Element Plus close (X) icon (`.el-dialog__close`) inside this modal's container. */
	getDialogCloseIcon(): Locator {
		return dialogCloseIconIn(this.container);
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
