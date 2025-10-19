import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class WorkflowSettingsModal extends BasePage {
	getModal(): Locator {
		return this.page.getByTestId('workflow-settings-dialog');
	}

	getWorkflowMenu(): Locator {
		return this.page.getByTestId('workflow-menu');
	}

	getSettingsMenuItem(): Locator {
		return this.page.getByTestId('workflow-menu-item-settings');
	}

	getErrorWorkflowField(): Locator {
		return this.page.getByTestId('workflow-settings-error-workflow');
	}

	getTimezoneField(): Locator {
		return this.page.getByTestId('workflow-settings-timezone');
	}

	getSaveFailedExecutionsField(): Locator {
		return this.page.getByTestId('workflow-settings-save-failed-executions');
	}

	getSaveSuccessExecutionsField(): Locator {
		return this.page.getByTestId('workflow-settings-save-success-executions');
	}

	getSaveManualExecutionsField(): Locator {
		return this.page.getByTestId('workflow-settings-save-manual-executions');
	}

	getSaveExecutionProgressField(): Locator {
		return this.page.getByTestId('workflow-settings-save-execution-progress');
	}

	getTimeoutSwitch(): Locator {
		return this.page.getByTestId('workflow-settings-timeout-workflow');
	}

	getTimeoutInput(): Locator {
		return this.page.getByTestId('workflow-settings-timeout-form').locator('input').first();
	}

	getDuplicateMenuItem(): Locator {
		return this.page.getByTestId('workflow-menu-item-duplicate');
	}

	getDeleteMenuItem(): Locator {
		return this.page.getByTestId('workflow-menu-item-delete');
	}

	getArchiveMenuItem(): Locator {
		return this.page.getByTestId('workflow-menu-item-archive');
	}

	getUnarchiveMenuItem(): Locator {
		return this.page.getByTestId('workflow-menu-item-unarchive');
	}

	getPushToGitMenuItem(): Locator {
		return this.page.getByTestId('workflow-menu-item-push');
	}

	getSaveButton(): Locator {
		return this.page.getByRole('button', { name: 'Save' });
	}

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

	async open(): Promise<void> {
		await this.getWorkflowMenu().click();
		await this.getSettingsMenuItem().click();
	}

	async clickSave(): Promise<void> {
		await this.getSaveButton().click();
	}

	async selectErrorWorkflow(workflowName: string): Promise<void> {
		await this.getErrorWorkflowField().click();
		await this.page.getByRole('option', { name: workflowName }).first().click();
	}

	async clickArchiveMenuItem(): Promise<void> {
		await this.getArchiveMenuItem().click();
	}

	async clickUnarchiveMenuItem(): Promise<void> {
		await this.getUnarchiveMenuItem().click();
	}

	async clickDeleteMenuItem(): Promise<void> {
		await this.getDeleteMenuItem().click();
	}

	async confirmDeleteModal(): Promise<void> {
		await this.page.getByRole('button', { name: 'delete' }).click();
	}

	async confirmArchiveModal(): Promise<void> {
		await this.page.locator('.btn--confirm').click();
	}
}
