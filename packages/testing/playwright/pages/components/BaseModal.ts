import type { Locator, Page } from '@playwright/test';

import { closeDialogIfOpen } from './dialogLocators';
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

	async waitForModal() {
		await this.container.waitFor({ state: 'visible' });
	}

	/** Close the modal via its Element Plus close (X) icon, if it's currently visible. */
	async close(): Promise<void> {
		await closeDialogIfOpen(this.container);
	}

	/** A text element visible inside this modal's container (e.g. a validation error). */
	getText(text: string | RegExp, options?: { exact?: boolean }): Locator {
		return this.container.getByText(text, options);
	}

	async fillInput(text: string) {
		await this.container.getByRole('textbox').fill(text);
	}

	async clickButton(buttonText: string | RegExp) {
		await this.container.getByRole('button', { name: buttonText }).click();
	}
}
