import { BasePage } from './BasePage';

export class DataStoreView extends BasePage {
	getDataTableOverviewTab() {
		return this.page.getByTestId('tab-data-stores');
	}

	getDataTableProjectTab() {
		return this.page.getByTestId('tab-project-data-stores');
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

	getAddResourceDropdown() {
		return this.page.getByTestId('add-resource');
	}

	getAddDataTableAction() {
		return this.page.getByTestId('action-dataStore');
	}

	getDataTableCards() {
		return this.page.getByTestId('data-store-card');
	}

	getDataTableCardByName(name: string) {
		return this.getDataTableCards().filter({ hasText: name });
	}

	async clickDataTableOverviewTab() {
		await this.clickByTestId('tab-data-stores');
	}

	async clickDataTableProjectTab() {
		await this.clickByTestId('tab-project-data-stores');
	}

	async clickEmptyStateButton() {
		await this.getEmptyStateActionBoxButton().click();
	}

	async clickAddResourceDropdown() {
		await this.getAddResourceDropdown().click();
	}

	async clickAddDataTableAction() {
		await this.getAddDataTableAction().click();
	}
}
