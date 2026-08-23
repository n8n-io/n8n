import type { Locator, Page } from '@playwright/test';

export class SourceControlPullModal {
	constructor(private readonly page: Page) {}

	get container() {
		return this.page.getByTestId('sourceControlPull-modal');
	}

	getPullAndOverrideButton(): Locator {
		return this.container.getByTestId('force-pull');
	}

	getWorkflowsTab(): Locator {
		return this.container.getByTestId('source-control-pull-modal-tab-workflow');
	}

	async selectWorkflowsTab(): Promise<void> {
		await this.getWorkflowsTab().click();
	}

	getFileInModal(fileName: string): Locator {
		return this.container.getByTestId('pull-modal-item').filter({ hasText: fileName }).first();
	}

	getStatusBadge(fileName: string, status: 'New' | 'Modified' | 'Deleted' | 'Conflict'): Locator {
		return this.getFileInModal(fileName).getByText(status, { exact: true });
	}
}
