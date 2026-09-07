import type { Locator } from '@playwright/test';

import { FloatingUiHelper } from './FloatingUiHelper';

/**
 * Page object for interacting with move resource modals (MoveToFolderModal for workflows, ProjectMoveResourceModal for credentials).
 */
export class ResourceMoveModal extends FloatingUiHelper {
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

	getFolderOption(folderName: string): Locator {
		// move-to-folder options teleport out of the modal root (el-select popper), so resolve page-scoped
		return this.page.getByTestId('move-to-folder-option').filter({ hasText: folderName });
	}

	async openProjectSelect(): Promise<void> {
		await this.getProjectSelectCredential().locator('input').click();
	}

	/**
	 * Opens the workflow move modal project select and types a search query into it.
	 * Mirrors how a user filters the destination list.
	 */
	async searchProjects(query: string): Promise<void> {
		const input = this.getProjectSelect().locator('input');
		await input.click();
		await this.page.keyboard.press('ControlOrMeta+a');
		await this.page.keyboard.press('Backspace');
		await this.page.keyboard.type(query, { delay: 50 });
	}

	getProjectOptions(): Locator {
		return this.getVisiblePopoverOption();
	}

	/** First option offered for a project name or user email, as the move flow resolves it. */
	getProjectOption(projectNameOrEmail: string): Locator {
		return this.getProjectOptions().filter({ hasText: projectNameOrEmail }).first();
	}

	async selectProjectOption(projectNameOrEmail: string): Promise<void> {
		const options = this.getVisiblePopoverOption();
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
