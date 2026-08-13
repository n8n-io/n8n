import type { n8nPage } from '../pages/n8nPage';

export interface TestFilePayload {
	name: string;
	content: string;
	mimeType?: string;
}

const toUploadPayload = (file: TestFilePayload) => ({
	name: file.name,
	mimeType: file.mimeType ?? 'text/plain',
	buffer: Buffer.from(file.content),
});

/**
 * Multi-step flows for the Files list view: uploads through the hidden
 * input, and the rename / replace / delete modal round-trips.
 */
export class FilesComposer {
	constructor(private readonly n8n: n8nPage) {}

	/** Uploads one or more files by setting them on the hidden file input. */
	async uploadFiles(files: TestFilePayload[]): Promise<void> {
		await this.n8n.files.setUploadInputFiles(files.map(toUploadPayload));
	}

	/** Uploads a single file and waits for its card to appear in the list. */
	async uploadFileAndWaitForCard(file: TestFilePayload): Promise<void> {
		await this.uploadFiles([file]);
		await this.n8n.files.getFileCardByName(file.name).waitFor({ state: 'visible' });
	}

	/**
	 * Renames a file through the row action and modal. Leaves the modal open
	 * when the rename is rejected (e.g. name already exists) so tests can
	 * assert the inline error.
	 */
	async renameFile(currentName: string, newName: string): Promise<void> {
		await this.n8n.files.openFileCardActions(currentName);
		await this.n8n.files.getFileCardAction('rename').click();
		await this.n8n.files.getRenameInput().fill(newName);
		await this.n8n.files.getRenameConfirmButton().click();
	}

	/** Replaces a file's content through the row action and modal. */
	async replaceFile(name: string, replacement: TestFilePayload): Promise<void> {
		await this.n8n.files.openFileCardActions(name);
		await this.n8n.files.getFileCardAction('replace').click();
		await this.n8n.files.setReplaceInputFiles(toUploadPayload(replacement));
		await this.n8n.files.getReplaceConfirmButton().click();
	}

	/** Deletes a file through the row action, confirming the dialog. */
	async deleteFile(name: string): Promise<void> {
		await this.n8n.files.openFileCardActions(name);
		await this.n8n.files.getFileCardAction('delete').click();
		await this.n8n.files.getDeleteFileConfirmDialog().waitFor({ state: 'visible' });
		await this.n8n.files.confirmDeleteFile();
	}
}
