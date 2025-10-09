import type { Locator, Page } from '@playwright/test';

/**
 * ResourceCards component for handling folder, workflow, credential, and data store cards.
 * All cards are contained within a resources-list-wrapper.
 */
export class ResourceCards {
	constructor(private page: Page) {}

	getResourcesListWrapper(): Locator {
		return this.page.getByTestId('resources-list-wrapper');
	}

	getFolders(): Locator {
		return this.page.getByTestId('folder-card');
	}

	getWorkflows(): Locator {
		return this.page.getByTestId('resources-list-item-workflow');
	}

	getCredentials(): Locator {
		return this.page.getByTestId('resources-list-item');
	}

	getFolder(name: string): Locator {
		return this.page.locator(`[data-test-id="folder-card"][data-resourcename="${name}"]`);
	}

	getWorkflow(name: string): Locator {
		return this.getWorkflows().filter({ hasText: name });
	}

	getCredential(name: string): Locator {
		return this.getCredentials().filter({
			has: this.page.getByTestId('card-content').locator('h2').filter({ hasText: name }),
		});
	}

	getCardActionToggle(card: Locator): Locator {
		return card
			.getByTestId('card-append')
			.locator('[class*="action-toggle"]')
			.filter({ visible: true });
	}

	getCardAction(actionName: string): Locator {
		return this.page.getByTestId(`action-${actionName}`).filter({ visible: true });
	}

	async openCardActions(card: Locator): Promise<void> {
		await this.getCardActionToggle(card).click();
	}

	async clickCardAction(card: Locator, actionName: string): Promise<void> {
		await this.openCardActions(card);
		await this.getCardAction(actionName).click();
	}

	async openFolder(folderName: string): Promise<void> {
		const folderCard = this.getFolder(folderName);
		await this.clickCardAction(folderCard, 'open');
	}

	async deleteFolder(folderName: string): Promise<void> {
		const folderCard = this.getFolder(folderName);
		await this.clickCardAction(folderCard, 'delete');
	}
}
