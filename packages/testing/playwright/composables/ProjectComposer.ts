import type { n8nPage } from '../pages/n8nPage';

export class ProjectComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Create a project and return the project name and ID. If no project name is provided, a unique name will be generated.
	 * @param projectName - The name of the project to create.
	 * @returns The project name and ID.
	 */
	async createProject(projectName?: string) {
		await this.n8n.page.getByTestId('universal-add').click();
		await Promise.all([
			this.n8n.page.waitForResponse('**/rest/projects/*'),
			this.n8n.page.getByTestId('navigation-menu-item').filter({ hasText: 'Project' }).click(),
		]);
		await this.n8n.notifications.waitForNotificationAndClose('saved successfully');
		await this.n8n.page.waitForLoadState();
		const projectNameUnique = projectName ?? `Project ${Date.now()}`;
		await this.n8n.projectSettings.fillProjectName(projectNameUnique);
		await this.n8n.projectSettings.clickSaveButton();
		const projectId = this.extractProjectIdFromPage('projects', 'settings');
		return { projectName: projectNameUnique, projectId };
	}

	/**
	 * Add a new credential to a project.
	 * @param projectName - The name of the project to add the credential to.
	 * @param credentialType - The type of credential to add by visible name e.g 'Notion API'
	 * @param credentialFieldName - The name of the field to add the credential to. e.g. 'apiKey' which would be data-test-id='parameter-input-apiKey'
	 * @param credentialValue - The value of the credential to add.
	 */
	async addCredentialToProject(
		projectName: string,
		credentialType: string,
		credentialFieldName: string,
		credentialValue: string,
	) {
		await this.n8n.sideBar.openNewCredentialDialogForProject(projectName);
		await this.n8n.credentials.openNewCredentialDialogFromCredentialList(credentialType);
		await this.n8n.credentials.fillCredentialField(credentialFieldName, credentialValue);
		await this.n8n.credentials.saveCredential();
		await this.n8n.notifications.waitForNotificationAndClose('Credential successfully created');
		await this.n8n.credentials.closeCredentialDialog();
	}

	extractIdFromUrl(url: string, beforeWord: string, afterWord: string): string {
		const path = url.includes('://') ? new URL(url).pathname : url;
		const match = path.match(new RegExp(`/${beforeWord}/([^/]+)/${afterWord}`));
		return match?.[1] ?? '';
	}

	extractProjectIdFromPage(beforeWord: string, afterWord: string): string {
		return this.extractIdFromUrl(this.n8n.page.url(), beforeWord, afterWord);
	}
}
