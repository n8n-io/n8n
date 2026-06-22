import type { Locator, Page } from '@playwright/test';

/**
 * Workflow menu on the editor header (`workflow-menu` trigger) plus the
 * teleported (Element Plus) dropdown items and confirmation surfaces it opens.
 *
 * Lives on the editor header, not inside `workflow-settings-dialog`. The
 * teleport-popper items render at the document root, so they're resolved
 * through the `Page` rather than scoped to a container.
 *
 * @example
 * // Inside a test
 * await n8n.workflowMenu.openSettings();
 * await n8n.workflowMenu.clickArchive();
 * await n8n.workflowMenu.confirmArchiveModal();
 */
export class WorkflowMenu {
	constructor(private readonly page: Page) {}

	// Trigger

	getTrigger(): Locator {
		return this.page.getByTestId('workflow-menu');
	}

	async open(): Promise<void> {
		await this.getTrigger().click();
	}

	// Menu items (teleported)

	getSettingsItem(): Locator {
		return this.page.getByTestId('workflow-menu-item-settings');
	}

	getDuplicateItem(): Locator {
		return this.page.getByTestId('workflow-menu-item-duplicate');
	}

	getDeleteItem(): Locator {
		return this.page.getByTestId('workflow-menu-item-delete');
	}

	getArchiveItem(): Locator {
		return this.page.getByTestId('workflow-menu-item-archive');
	}

	getArchiveItemWrapper(): Locator {
		return this.getArchiveItem();
	}

	getUnarchiveItem(): Locator {
		return this.page.getByTestId('workflow-menu-item-unarchive');
	}

	getPushToGitItem(): Locator {
		return this.page.getByTestId('workflow-menu-item-push');
	}

	getUnpublishItem(): Locator {
		return this.page.getByTestId('workflow-menu-item-unpublish');
	}

	// Open + click compound actions

	async openSettings(): Promise<void> {
		await this.open();
		await this.getSettingsItem().click();
	}

	async openDuplicate(): Promise<void> {
		await this.open();
		await this.getDuplicateItem().click();
	}

	async clickDelete(): Promise<void> {
		await this.getDeleteItem().click();
	}

	async clickArchive(): Promise<void> {
		await this.getArchiveItem().click();
	}

	async clickUnarchive(): Promise<void> {
		await this.getUnarchiveItem().click();
	}

	async clickUnpublish(): Promise<void> {
		await this.getUnpublishItem().click();
	}

	// Confirmation surfaces opened by the menu items

	getUnpublishModal(): Locator {
		return this.page.getByTestId('workflow-history-version-unpublish-modal');
	}

	async confirmUnpublishModal(): Promise<void> {
		await this.getUnpublishModal().getByRole('button', { name: 'Unpublish' }).click();
	}

	async confirmDeleteModal(): Promise<void> {
		await this.page.getByRole('button', { name: 'delete' }).click();
	}

	async confirmArchiveModal(): Promise<void> {
		await this.page.locator('.btn--confirm').click();
	}

	// Duplicate modal (opened by openDuplicate)

	getDuplicateModal(): Locator {
		return this.page.getByTestId('duplicate-modal');
	}

	getDuplicateNameInput(): Locator {
		return this.getDuplicateModal().locator('input').first();
	}

	getDuplicateTagsInput(): Locator {
		return this.getDuplicateModal().locator('.el-select__tags input');
	}

	getDuplicateSaveButton(): Locator {
		return this.getDuplicateModal().getByRole('button', { name: /duplicate|save/i });
	}
}
