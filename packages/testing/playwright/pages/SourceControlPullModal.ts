import type { Locator, Page } from '@playwright/test';

export class SourceControlPullModal {
	constructor(private readonly page: Page) {}

	getModal() {
		return this.page.getByTestId('sourceControlPull-modal');
	}

	getPullAndOverrideButton(): Locator {
		return this.page.getByTestId('force-pull');
	}

	async pull(): Promise<void> {
		await this.getPullAndOverrideButton().click();
	}

	getWorkflowsTab(): Locator {
		return this.page.getByTestId('source-control-pull-modal-tab-workflow');
	}

	getCredentialsTab(): Locator {
		return this.page.getByTestId('source-control-pull-modal-tab-credential');
	}

	async selectWorkflowsTab(): Promise<void> {
		await this.getWorkflowsTab().click();
	}

	async selectCredentialsTab(): Promise<void> {
		await this.getCredentialsTab().click();
	}

	getFileInModal(fileName: string): Locator {
		return this.page.getByTestId('pull-modal-item').filter({ hasText: fileName }).first();
	}

	getStatusBadge(fileName: string, status: 'New' | 'Modified' | 'Deleted' | 'Conflict'): Locator {
		return this.getFileInModal(fileName).getByText(status, { exact: true });
	}

	getNotice(): Locator {
		return this.page.locator('[class*="notice"]');
	}
}
