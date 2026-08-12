import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';
import { ActionToggle } from './components/ActionToggle';
import { MessageBox } from './components/messageBoxLocators';

export interface UploadFilePayload {
	name: string;
	mimeType: string;
	buffer: Buffer;
}

/**
 * Page object for the Files list view (`/projects/:projectId/files` and
 * `/home/files`) shipped by the file-storage module: file cards, the hidden
 * upload input, the upload queue, conflict/rename/replace modals, bulk
 * delete, quota surfaces, and the preview panel.
 */
export class FilesPage extends BasePage {
	readonly actionToggle = new ActionToggle(this.page);

	private readonly messageBox = new MessageBox(this.page);

	async goto(projectId?: string) {
		const url = projectId ? `/projects/${projectId}/files` : '/home/files';
		await this.page.goto(url);
	}

	// --- Empty state ---

	getEmptyStateBox(): Locator {
		return this.getResourcesListEmptyState();
	}

	getEmptyStateButton(): Locator {
		return this.getEmptyStateBox().getByRole('button');
	}

	// --- File cards ---

	getFileCards(): Locator {
		return this.page.getByTestId('file-card');
	}

	getFileCardByName(name: string): Locator {
		return this.getFileCards().filter({ hasText: name });
	}

	getFileCardNames(): Locator {
		return this.page.getByTestId('file-card-name');
	}

	getFileCardSize(name: string): Locator {
		return this.getFileCardByName(name).getByTestId('file-card-size');
	}

	getFileCardCheckbox(name: string): Locator {
		return this.getFileCardByName(name).getByTestId('file-card-checkbox');
	}

	getFileCardActionsButton(name: string): Locator {
		return this.getFileCardByName(name).getByTestId('file-card-actions');
	}

	async openFileCardActions(name: string): Promise<void> {
		await this.getFileCardActionsButton(name).getByRole('button').click();
	}

	getFileCardAction(actionName: string): Locator {
		return this.actionToggle.getAction(actionName);
	}

	// --- Upload input & queue ---

	getUploadInput(): Locator {
		return this.page.getByTestId('files-upload-input');
	}

	/** Uploads by setting files on the hidden multi-file input directly. */
	async setUploadInputFiles(files: UploadFilePayload[]): Promise<void> {
		await this.getUploadInput().setInputFiles(files);
	}

	getUploadQueue(): Locator {
		return this.page.getByTestId('upload-queue');
	}

	getUploadQueueItems(): Locator {
		return this.page.getByTestId('upload-queue-item');
	}

	getUploadQueueItemByName(name: string): Locator {
		return this.getUploadQueueItems().filter({ hasText: name });
	}

	// --- Conflict modal ---

	getConflictModal(): Locator {
		return this.page.getByTestId('upload-conflict-modal');
	}

	getConflictReplaceButton(): Locator {
		return this.getConflictModal().getByTestId('upload-conflict-replace');
	}

	getConflictKeepBothButton(): Locator {
		return this.getConflictModal().getByTestId('upload-conflict-keep-both');
	}

	getConflictCancelButton(): Locator {
		return this.getConflictModal().getByTestId('upload-conflict-cancel');
	}

	getConflictApplyAllCheckbox(): Locator {
		return this.getConflictModal().getByTestId('upload-conflict-apply-all');
	}

	// --- Rename modal ---

	getRenameModal(): Locator {
		return this.page.getByTestId('rename-file-modal').filter({ visible: true });
	}

	getRenameInput(): Locator {
		return this.getRenameModal().getByTestId('rename-file-input');
	}

	getRenameError(): Locator {
		return this.getRenameModal().getByTestId('rename-file-error');
	}

	getRenameConfirmButton(): Locator {
		return this.getRenameModal().getByTestId('rename-file-confirm');
	}

	// --- Replace modal ---

	getReplaceModal(): Locator {
		return this.page.getByTestId('replace-file-modal').filter({ visible: true });
	}

	async setReplaceInputFiles(file: UploadFilePayload): Promise<void> {
		await this.getReplaceModal().getByTestId('replace-file-input').setInputFiles(file);
	}

	getReplaceConfirmButton(): Locator {
		return this.getReplaceModal().getByTestId('replace-file-confirm');
	}

	// --- Delete confirmation (ElMessageBox) ---

	getDeleteFileConfirmDialog(): Locator {
		return this.messageBox.root.filter({ hasText: /Delete \d+ files?|Delete file/ });
	}

	async confirmDeleteFile(): Promise<void> {
		await new MessageBox(this.getDeleteFileConfirmDialog()).confirmButton.click();
	}

	// --- Bulk actions ---

	getBulkDeleteButton(): Locator {
		return this.page.getByTestId('files-bulk-delete');
	}

	// --- Quota surfaces ---

	getStorageMeter(): Locator {
		return this.page.getByTestId('files-storage-meter');
	}

	getQuotaExceededBanner(): Locator {
		return this.page.getByTestId('banners-FILE_STORAGE_LIMIT_ERROR');
	}

	/** The "Add file" main button rendered by ProjectHeader on the Files tab. */
	getAddFileButton(): Locator {
		return this.page.getByTestId('add-resource-file');
	}

	// --- Preview panel ---

	getPreviewPanel(): Locator {
		return this.page.getByTestId('file-preview-panel');
	}

	// --- Search & sort (shared resources-list layout) ---

	async search(term: string): Promise<void> {
		await this.getResourcesListSearch().fill(term);
	}

	async sortBy(label: 'Sort by name (A-Z)' | 'Sort by name (Z-A)' | 'Sort by last updated') {
		await this.clickByTestId('resources-list-sort');
		await this.page
			.getByTestId('resources-list-sort-item')
			.filter({ hasText: label })
			.filter({ visible: true })
			.click();
	}
}
