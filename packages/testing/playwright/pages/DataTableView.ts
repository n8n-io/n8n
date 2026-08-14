import { BasePage } from './BasePage';
import { ActionToggle } from './components/ActionToggle';
import { AddResource } from './components/AddResource';
import { MessageBox } from './components/messageBoxLocators';

export class DataTableView extends BasePage {
	async goto(projectId?: string) {
		const url = projectId ? `/projects/${projectId}/datatables` : '/home/datatables';
		await this.page.goto(url);
	}

	readonly addResource = new AddResource(this.page);
	readonly actionToggle = new ActionToggle(this.page);

	getEmptyStateActionBox() {
		return this.getResourcesListEmptyState();
	}

	getEmptyStateActionBoxButton() {
		return this.getEmptyStateActionBox().getByRole('button');
	}

	getNewDataTableModal() {
		return this.page.getByTestId('addDataTableModal-modal');
	}

	getNewDataTableNameInput() {
		return this.page.getByTestId('data-table-name-input-select');
	}

	getFromScratchOption() {
		return this.page.getByTestId('create-from-scratch-option');
	}

	getProceedFromSelectButton() {
		return this.page.getByTestId('proceed-from-select-button');
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
		return this.actionToggle.getAction(actionName);
	}

	getDeleteDataTableModal() {
		return new MessageBox(this.page).root.filter({ hasText: 'Delete Data table' });
	}

	getDeleteDataTableConfirmButton() {
		return new MessageBox(this.getDeleteDataTableModal()).confirmButton;
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

	async clickDataTableProjectTab() {
		await this.clickByTestId('tab-project-data-tables');
	}

	async clickEmptyStateButton() {
		await this.getEmptyStateActionBoxButton().click();
	}

	async clickAddDataTableAction(fromDataTableTab: boolean = true) {
		await this.addResource.dataTable(fromDataTableTab);
	}

	async clickDataTableCardActionsButton(dataTableName: string) {
		await this.getDataTableCardActionsButton(dataTableName).click();
	}

	async clickDeleteDataTableConfirmButton() {
		await this.getDeleteDataTableConfirmButton().click();
	}

	async selectDataTablePageSize(pageSize: string) {
		await this.getDataTablePageSizeSelect().click();
		await this.getDataTablePageOption(pageSize).click();
	}
}
