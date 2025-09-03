import type { n8nPage } from '../pages/n8nPage';

export class DataTableComposer {
	constructor(private readonly n8n: n8nPage) {}

	async createNewDataTable(name: string) {
		const nameInput = this.n8n.dataTable.getNewDataTableNameInput();
		await nameInput.fill(name);
		await this.n8n.dataTable.getNewDataTableConfirmButton().click();
	}
}
