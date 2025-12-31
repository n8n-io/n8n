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

	getSaveButton(): Locator {
		return this.page.getByRole('button', { name: 'Save' });
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
}
