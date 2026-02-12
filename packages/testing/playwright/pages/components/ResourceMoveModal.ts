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
		const options = this.page.getByRole('option');
		// Try to find by exact text (project name or email)
		const byExact = options.filter({ hasText: projectNameOrEmail });
		if ((await byExact.count()) > 0) {
			await byExact.click();
		} else {
			// For personal projects, the email is not shown, so try matching by name part of email
			const namePart = projectNameOrEmail.split('@')[0].replace(/[.-]/g, ' ');
			await options
				.filter({ hasText: new RegExp(namePart, 'i') })
				.first()
				.click();
		}
	}

	async clickMoveCredentialButton(): Promise<void> {
		await this.getMoveCredentialButton().click();
	}

	async clickConfirmMoveButton(): Promise<void> {
		await this.getMoveConfirmButton().click();
	}
}
