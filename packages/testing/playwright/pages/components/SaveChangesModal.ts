import type { Locator } from '@playwright/test';

import { messageBoxCancelButtonIn, messageBoxCloseIconIn } from './messageBoxLocators';

/**
 * Save Changes Modal component for handling unsaved changes dialogs.
 * Appears when navigating away from workflow with unsaved changes.
 */
export class SaveChangesModal {
	constructor(private root: Locator) {}

	getModal(): Locator {
		return this.root.filter({ hasText: 'Save changes before leaving?' });
	}

	getCancelButton(): Locator {
		return messageBoxCancelButtonIn(this.root);
	}

	getCloseButton(): Locator {
		return messageBoxCloseIconIn(this.root);
	}

	async clickCancel(): Promise<void> {
		await this.getCancelButton().click();
	}

	async clickClose(): Promise<void> {
		await this.getCloseButton().click();
	}
}
