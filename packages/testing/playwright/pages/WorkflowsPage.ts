import { BasePage } from './BasePage';
import { resolveFromRoot } from '../utils/path-helper';

export class WorkflowsPage extends BasePage {
	async clickNewWorkflowCard() {
		await this.clickByTestId('new-workflow-card');
	}

	async clickAddFirstProjectButton() {
		await this.clickByTestId('add-first-project-button');
	}

	async clickAddProjectButton() {
		await this.clickByTestId('project-plus-button');
	}

	async clickAddWorklowButton() {
		await this.clickByTestId('add-resource-workflow');
	}

	/**
	 * Import a workflow from a fixture file
	 * @param fixtureKey - The key of the fixture file to import
	 * @param workflowName - The name of the workflow to import
	 * Naming the file causes the workflow to save so we don't need to click save
	 */
	async importWorkflow(fixtureKey: string, workflowName: string) {
		await this.clickByTestId('workflow-menu');

		const [fileChooser] = await Promise.all([
			this.page.waitForEvent('filechooser'),
			this.clickByText('Import from File...'),
		]);
		await fileChooser.setFiles(resolveFromRoot('workflows', fixtureKey));
		// eslint-disable-next-line playwright/no-wait-for-timeout
		await this.page.waitForTimeout(250);

		await this.clickByTestId('inline-edit-preview');
		await this.fillByTestId('inline-edit-input', workflowName);
		await this.page.getByTestId('inline-edit-input').press('Enter');
	}

	workflowTags() {
		return this.page.getByTestId('workflow-tags').locator('.el-tag');
	}
}
