import type { Locator, Page } from '@playwright/test';

/**
 * Page object for interacting with move resource modals (MoveToFolderModal for workflows, ProjectMoveResourceModal for credentials).
 */
export class ResourceMoveModal {
	constructor(private page: Page) {}

	getProjectSelect(): Locator {
		return this.page.getByTestId('project-sharing-select');
	}

	getProjectSelectCredential(): Locator {
		return this.page.getByTestId('project-move-resource-modal-select');
	}

	getMoveConfirmButton(): Locator {
		return this.page.getByTestId('confirm-move-folder-button');
	}

	getMoveCredentialButton(): Locator {
		return this.page.getByRole('button', { name: 'Move credential' });
	}

	getFolderSelect(): Locator {
		return this.page.getByTestId('move-to-folder-dropdown');
	}

	async selectProjectOption(projectNameOrEmail: string): Promise<void> {
		await this.page.getByRole('option').filter({ hasText: projectNameOrEmail }).click();
	}

	async clickMoveCredentialButton(): Promise<void> {
		await this.getMoveCredentialButton().click();
	}

	async clickConfirmMoveButton(): Promise<void> {
		await this.getMoveConfirmButton().click();
	}
}
