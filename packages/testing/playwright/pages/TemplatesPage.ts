import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class TemplatesPage extends BasePage {
	getTemplateCards(): Locator {
		return this.page.getByTestId('template-card');
	}

	getFirstTemplateCard(): Locator {
		return this.getTemplateCards().first();
	}

	getUseTemplateButton(): Locator {
		return this.page.getByTestId('use-template-button');
	}

	getTemplatesLoadingContainer(): Locator {
		return this.page.getByTestId('templates-loading-container');
	}

	getDescription(): Locator {
		return this.page.getByTestId('template-description');
	}

	getSearchInput(): Locator {
		return this.page.getByTestId('template-search-input');
	}

	getAllCategoriesFilter(): Locator {
		return this.page.getByTestId('template-filter-all-categories');
	}

	getCategoryFilters(): Locator {
		return this.page.locator('[data-test-id^=template-filter]');
	}

	async clickFirstTemplateCard(): Promise<void> {
		await this.getFirstTemplateCard().click();
	}

	getCategoryFilter(category: string): Locator {
		return this.page.getByTestId(`template-filter-${category}`);
	}

	getTemplateCountLabel(): Locator {
		return this.page.getByTestId('template-count-label');
	}

	getCollectionCountLabel(): Locator {
		return this.page.getByTestId('collection-count-label');
	}

	getSkeletonLoader(): Locator {
		return this.page.locator('.el-skeleton.n8n-loading');
	}

	async clickUseTemplateButton(): Promise<void> {
		await this.getUseTemplateButton().click();
	}

	async clickCategoryFilter(category: string): Promise<void> {
		await this.getCategoryFilter(category).click();
	}

	/**
	 * Click the "Use workflow" button on a specific template card by workflow title
	 * @param workflowTitle - The title of the workflow to find on the template card
	 */
	async clickUseWorkflowButton(workflowTitle: string): Promise<void> {
		const templateCard = this.page.getByTestId('template-card').filter({ hasText: workflowTitle });
		await templateCard.hover();
		await templateCard.getByTestId('use-workflow-button').click();
	}
}
