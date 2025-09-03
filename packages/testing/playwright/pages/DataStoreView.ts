import { BasePage } from './BasePage';

export class DataStoreView extends BasePage {
	getDataTableTab() {
		return this.page.getByTestId('tab-data-stores');
	}

	getEmptyStateActionBox() {
		return this.page.getByTestId('empty-data-table-action-box');
	}

	getEmptyStateActionBoxButton() {
		return this.getEmptyStateActionBox().getByRole('button');
	}

	getNewDataTableModal() {
		return this.page.getByTestId('addDataStoreModal-modal');
	}

	getNewDataTableNameInput() {
		return this.page.getByTestId('data-store-name-input');
	}

	getNewDataTableConfirmButton() {
		return this.page.getByTestId('confirm-add-data-store-button');
	}

	getDataTableDetailsWrapper() {
		return this.page.getByTestId('data-table-details-view');
	}

	getDataTableProjectBreadcrumb() {
		return this.page.getByTestId('home-project');
	}

	getDataTableBreadcrumb() {
		return this.page.getByTestId('datastore-header-name-input');
	}

	async clickAddResourceDropdown() {
		await this.clickByTestId('add-resource');
	}

	async clickDataTableTab() {
		await this.clickByTestId('tab-data-stores');
	}

	async clickEmptyStateButton() {
		await this.getEmptyStateActionBoxButton().click();
	}
}
