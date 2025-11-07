import type { Locator } from '@playwright/test';

import { BasePage } from '../BasePage';

/**
 * Tags Manager Modal component for managing workflow tags.
 * Used within CanvasPage as `n8n.canvas.tagsManagerModal.*`
 *
 * @example
 * // Access via canvas page
 * await n8n.canvas.openTagManagerModal();
 * await n8n.canvas.tagsManagerModal.clickAddNewButton();
 * await expect(n8n.canvas.tagsManagerModal.getTable()).toBeVisible();
 */
export class TagsManagerModal extends BasePage {
	constructor(private root: Locator) {
		super(root.page());
	}

	getModal(): Locator {
		return this.root;
	}

	getTable(): Locator {
		return this.root.getByTestId('tags-table');
	}

	getTagInputInModal(): Locator {
		return this.getTable().locator('input').first();
	}

	getFirstTagRow(): Locator {
		return this.getTable().locator('tbody tr').first();
	}

	getDeleteTagButton(): Locator {
		return this.root.getByTestId('delete-tag-button');
	}

	getDeleteTagConfirmButton(): Locator {
		return this.root.getByText('Delete tag', { exact: true });
	}

	getDeleteConfirmationMessage(): Locator {
		return this.root.getByText('Are you sure you want to delete this tag?');
	}

	async clickAddNewButton(): Promise<void> {
		await this.root.getByRole('button', { name: 'Add new' }).click();
	}

	async clickDoneButton(): Promise<void> {
		await this.clickButtonByName('Done');
	}
}
