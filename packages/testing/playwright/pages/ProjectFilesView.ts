import { BasePage } from './BasePage';
import { ActionToggle } from './components/ActionToggle';
import { MessageBox } from './components/messageBoxLocators';

export class ProjectFilesView extends BasePage {
	readonly actionToggle = new ActionToggle(this.page);
	readonly messageBox = new MessageBox(this.page);

	async goto(projectId: string) {
		await this.page.goto(`/projects/${projectId}/files`);
	}

	getTable() {
		return this.page.getByTestId('project-files-table');
	}

	getEmptyState() {
		return this.page.getByTestId('project-files-empty-state');
	}

	getUploadButton() {
		return this.page.getByTestId('project-files-upload-button');
	}

	getSearchInput() {
		return this.page.getByTestId('project-files-search').locator('input');
	}

	getUsage() {
		return this.page.getByTestId('project-files-usage');
	}

	getRowByName(name: string) {
		return this.getTable().locator('tr').filter({ hasText: name });
	}

	/**
	 * Sets the hidden file input directly rather than clicking the button: the
	 * click opens an OS file dialog Playwright cannot drive.
	 */
	async uploadFile(name: string, contents: string, mimeType = 'text/plain') {
		await this.page.getByTestId('project-files-input').setInputFiles({
			name,
			mimeType,
			buffer: Buffer.from(contents),
		});
	}

	async clickRowAction(name: string, action: 'download' | 'rename' | 'delete') {
		await this.actionToggle.open(this.getRowByName(name));
		await this.actionToggle.getAction(action).click();
	}
}
