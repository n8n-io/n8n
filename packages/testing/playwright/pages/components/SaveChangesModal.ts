import type { Locator } from '@playwright/test';

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
		return this.root.locator('.btn--cancel');
	}

	getCloseButton(): Locator {
		return this.root.locator('.el-message-box__headerbtn');
	}

	getSaveButton(): Locator {
		return this.root.getByRole('button', { name: 'Save' });
	}

	async clickCancel(): Promise<void> {
		await this.getCancelButton().click();
	}

	async clickClose(): Promise<void> {
		await this.getCloseButton().click();
	}

	async clickSave(): Promise<void> {
		await this.getSaveButton().click();
	}
}
