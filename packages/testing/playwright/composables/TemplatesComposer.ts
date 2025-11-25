import { expect } from '@playwright/test';

import type { n8nPage } from '../pages/n8nPage';

/**
 * A class for user interactions with templates that go across multiple pages.
 */
export class TemplatesComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Navigates to templates page, waits for loading to complete,
	 * selects the first available template, and imports it to a new workflow
	 * @returns Promise that resolves when the template has been imported
	 */
	async importFirstTemplate(): Promise<void> {
		await this.n8n.navigate.toTemplates();
		await expect(this.n8n.templates.getSkeletonLoader()).toBeHidden();
		await expect(this.n8n.templates.getFirstTemplateCard()).toBeVisible();
		await expect(this.n8n.templates.getTemplatesLoadingContainer()).toBeHidden();

		await this.n8n.templates.clickFirstTemplateCard();
		await expect(this.n8n.templates.getUseTemplateButton()).toBeVisible();

		await this.n8n.templates.clickUseTemplateButton();
		await expect(this.n8n.page).toHaveURL(/\/workflow\/new/);
	}
}
