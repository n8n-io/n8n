import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { WorkflowMenu } from './components/WorkflowMenu';

export class WorkflowSettingsModal extends BasePage {
	private readonly workflowMenu: WorkflowMenu;

	constructor(page: Page) {
		super(page);
		this.workflowMenu = new WorkflowMenu(page);
	}

	get container() {
		return this.page.getByTestId('workflow-settings-dialog');
	}

	getModal(): Locator {
		return this.container;
	}

	getErrorWorkflowField(): Locator {
		return this.container.getByTestId('workflow-settings-error-workflow');
	}

	getTimezoneField(): Locator {
		return this.container.getByTestId('workflow-settings-timezone');
	}

	getSaveFailedExecutionsField(): Locator {
		return this.container.getByTestId('workflow-settings-save-failed-executions');
	}

	getSaveSuccessExecutionsField(): Locator {
		return this.container.getByTestId('workflow-settings-save-success-executions');
	}

	getSaveManualExecutionsField(): Locator {
		return this.container.getByTestId('workflow-settings-save-manual-executions');
	}

	getSaveExecutionProgressField(): Locator {
		return this.container.getByTestId('workflow-settings-save-execution-progress');
	}

	getTimeoutSwitch(): Locator {
		return this.container.getByTestId('workflow-settings-timeout-workflow');
	}

	getTimeoutInput(): Locator {
		return this.container.getByTestId('workflow-settings-timeout-form').locator('input').first();
	}

	getRedactProductionSelect(): Locator {
		return this.container.getByTestId('workflow-settings-redact-production-select');
	}

	getRedactManualSelect(): Locator {
		return this.container.getByTestId('workflow-settings-redact-manual-select');
	}

	getRedactProductionInput(): Locator {
		return this.getRedactProductionSelect().locator('input');
	}

	getRedactManualInput(): Locator {
		return this.getRedactManualSelect().locator('input');
	}

	async hoverRedactProductionSelect(): Promise<void> {
		await this.getRedactProductionSelect().hover();
	}

	async hoverRedactManualSelect(): Promise<void> {
		await this.getRedactManualSelect().hover();
	}

	async selectManualRedactMode(mode: string): Promise<void> {
		await this.getRedactManualSelect().click();
		await this.getVisiblePopoverOption(mode, { exact: true }).click();
	}

	getTooltip(): Locator {
		return this.page.getByTestId('tooltip-content').filter({ visible: true });
	}

	getSaveButton(): Locator {
		return this.page.getByTestId('workflow-settings-save-button').getByRole('button');
	}

	async open(): Promise<void> {
		await this.workflowMenu.openSettings();
		await this.waitUntilLoaded();
	}

	private async waitUntilLoaded(): Promise<void> {
		// `v-loading` directive's class
		await this.container.locator('.el-loading-mask').waitFor({ state: 'detached' });
	}

	async clickSave(): Promise<void> {
		await this.getSaveButton().click();
	}

	async selectErrorWorkflow(workflowName: string): Promise<void> {
		await this.getErrorWorkflowField().click();
		await this.getVisiblePopoverOption(workflowName).first().click();
	}
}
