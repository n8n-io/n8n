import type { Page } from '@playwright/test';

export class SourceControlPullModal {
	constructor(private readonly page: Page) {}

	getModal() {
		return this.page.getByTestId('sourceControlPull-modal');
	}

	async open(): Promise<void> {
		await this.page.getByTestId('main-sidebar-source-control-pull').click();
	}
}
