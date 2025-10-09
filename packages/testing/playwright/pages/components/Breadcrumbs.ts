import type { Page } from '@playwright/test';

export class Breadcrumbs {
	constructor(private readonly page: Page) {}

	getBreadcrumbs() {
		return this.page.getByTestId('breadcrumbs-item');
	}

	getBreadcrumb(resourceName: string) {
		return this.getBreadcrumbs().filter({ hasText: resourceName });
	}
	getCurrentBreadcrumb() {
		return this.page.getByTestId('breadcrumbs-item-current');
	}

	getHiddenBreadcrumbs() {
		return this.page.getByTestId('hidden-items-menu');
	}

	getHomeProjectBreadcrumb() {
		return this.page.getByTestId('home-project');
	}

	getHiddenBreadcrumb(resourceName: string) {
		return this.getHiddenBreadcrumbs().filter({ hasText: resourceName });
	}

	getActionToggleDropdown(resourceName: string) {
		return this.page.getByTestId('action-toggle-dropdown').getByTestId(`action-${resourceName}`);
	}
}
