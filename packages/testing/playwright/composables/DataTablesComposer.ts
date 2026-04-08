import type { n8nPage } from '../pages/n8nPage';

export class DataTableComposer {
	constructor(private readonly n8n: n8nPage) {}

	async createNewDataTable(name: string) {
		const nameInput = this.n8n.dataTable.getNewDataTableNameInput();
		await nameInput.fill(name);
		await this.n8n.dataTable.getFromScratchOption().click();
		await this.n8n.dataTable.getProceedFromSelectButton().click();
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
		fromDataTableTab: boolean = true,
	) {
		await this.n8n.projectComposer.createProject(projectName);
		const { projectId } = await this.n8n.projectComposer.createProject();

		if (fromDataTableTab) {
			await this.n8n.page.goto(`projects/${projectId}/datatables`);
		} else {
			await this.n8n.page.goto(`projects/${projectId}`);
		}

		if (source === 'empty-state') {
			await this.n8n.dataTable.clickEmptyStateButton();
		} else {
			await this.n8n.dataTable.clickAddDataTableAction(fromDataTableTab);
		}
		await this.n8n.dataTableComposer.createNewDataTable(dataTableName);
		await this.n8n.page.goto(`projects/${projectId}/datatables`);
	}
}
