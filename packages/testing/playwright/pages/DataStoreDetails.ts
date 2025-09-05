import { BasePage } from './BasePage';

export class DataStoreDetails extends BasePage {
	getPageWrapper() {
		return this.page.getByTestId('data-table-details-view');
	}

	getDataTableProjectBreadcrumb() {
		return this.page.getByTestId('home-project');
	}

	getDataTableBreadcrumb() {
		return this.page.getByTestId('datastore-header-name-input');
	}
}
