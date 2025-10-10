import { BasePage } from './BasePage';
import { AddResource } from './components/AddResource';

export class DataTableView extends BasePage {
	readonly addResource = new AddResource(this.page);

	getDataTableOverviewTab() {
		return this.page.getByTestId('tab-data-tables');
	}

	getDataTableProjectTab() {
		return this.page.getByTestId('tab-project-data-tables');
	}

	getEmptyStateActionBox() {
		return this.page.getByTestId('empty-data-table-action-box');
	}

	getEmptyStateActionBoxButton() {
		return this.getEmptyStateActionBox().getByRole('button');
	}

	getNewDataTableModal() {
		return this.page.getByTestId('addDataTableModal-modal');
	}

	getNewDataTableNameInput() {
		return this.page.getByTestId('data-table-name-input');
	}

	getNewDataTableConfirmButton() {
		return this.page.getByTestId('confirm-add-data-table-button');
	}

	getDataTableCards() {
		return this.page.getByTestId('data-table-card');
	}

	getDataTableCardByName(name: string) {
		return this.getDataTableCards().filter({ hasText: name });
	}

	getDataTableCardActionsButton(dataTableName: string) {
		return this.getDataTableCardByName(dataTableName).getByTestId('data-table-card-actions');
	}

	getDataTableCardAction(actionName: string) {
		return this.page.getByTestId('action-toggle-dropdown').getByTestId(`action-${actionName}`);
	}

	getDeleteDataTableModal() {
		return this.page.locator('.el-message-box').filter({ hasText: 'Delete Data table' });
	}

	getDeleteDataTableConfirmButton() {
		return this.getDeleteDataTableModal().locator('.btn--confirm');
	}

	getDataTablePageSizeSelect() {
		return this.page.getByTestId('resources-list-pagination').locator('.el-pagination__sizes');
	}

	getDataTablePageOption(pageSize: string) {
		return this.page.locator('.el-select-dropdown__item').filter({ hasText: `${pageSize}/page` });
	}

	getPaginationNextButton() {
		return this.page.getByTestId('resources-list-pagination').locator('button.btn-next');
	}

	async clickDataTableOverviewTab() {
		await this.clickByTestId('tab-data-tables');
	}

	async clickDataTableProjectTab() {
		await this.clickByTestId('tab-project-data-tables');
	}

	async clickEmptyStateButton() {
		await this.getEmptyStateActionBoxButton().click();
	}

	async clickAddDataTableAction() {
		await this.addResource.dataTable();
	}

	async clickDataTableCardActionsButton(dataTableName: string) {
		await this.getDataTableCardActionsButton(dataTableName).click();
	}

	async clickDataTableCardAction(actionName: string) {
		await this.getDataTableCardAction(actionName).click();
	}

	async clickDeleteDataTableConfirmButton() {
		await this.getDeleteDataTableConfirmButton().click();
	}

	async selectDataTablePageSize(pageSize: string) {
		await this.getDataTablePageSizeSelect().click();
		await this.getDataTablePageOption(pageSize).click();
	}

	async clickPaginationNextButton() {
		await this.getPaginationNextButton().click();
	}
}
