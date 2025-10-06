import type { n8nPage } from '../pages/n8nPage';

export class DataTableComposer {
	constructor(private readonly n8n: n8nPage) {}

	async createNewDataTable(name: string) {
		const nameInput = this.n8n.dataTable.getNewDataTableNameInput();
		await nameInput.fill(name);
		await this.n8n.dataTable.getNewDataTableConfirmButton().click();
	}

	/**
	 * Creates project and data table inside it, navigating to project 'Data Table' tab
	 * @param projectName
	 * @param dataTableName
	 * @param source - from where the creation is initiated (empty state or header dropdown)
	 */
	async createDataTableInNewProject(
		projectName: string,
		dataTableName: string,
		source: 'empty-state' | 'header-dropdown',
	) {
		await this.n8n.projectComposer.createProject(projectName);
		const { projectId } = await this.n8n.projectComposer.createProject();
		await this.n8n.page.goto(`projects/${projectId}/datatables`);

		await this.n8n.dataTable.clickDataTableProjectTab();
		if (source === 'empty-state') {
			await this.n8n.dataTable.clickEmptyStateButton();
		} else {
			await this.n8n.dataTable.clickAddDataTableAction();
		}
		await this.n8n.dataTableComposer.createNewDataTable(dataTableName);
		await this.n8n.page.goto(`projects/${projectId}/datatables`);
	}
}
