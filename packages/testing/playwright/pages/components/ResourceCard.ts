import type { Locator, Page } from '@playwright/test';

/**
 * ResourceCard component for handling folder, workflow, credential, and data store cards.
 * All cards are contained within a resources-list-wrapper.
 */
export class ResourceCard {
	constructor(private page: Page) {}

	getResourcesListWrapper(): Locator {
		return this.page.getByTestId('resources-list-wrapper');
	}

	getFolderCards(): Locator {
		return this.page.getByTestId('folder-card');
	}

	getWorkflowCards(): Locator {
		return this.page.getByTestId('resources-list-item-workflow');
	}

	getCredentialCards(): Locator {
		return this.page.getByTestId('resources-list-item');
	}

	getDataStoreCards(): Locator {
		return this.page.getByTestId('data-store-card');
	}

	getFolderByName(name: string): Locator {
		return this.page.locator(`[data-test-id="folder-card"][data-resourcename="${name}"]`);
	}

	getWorkflowByName(name: string): Locator {
		return this.getWorkflowCards().filter({ hasText: name });
	}

	getCredentialByName(name: string): Locator {
		return this.getCredentialCards().filter({
			has: this.page.getByTestId('card-content').locator('h2').filter({ hasText: name }),
		});
	}

	getDataStoreByName(name: string): Locator {
		return this.page.getByTestId('data-store-card-name').filter({ hasText: name });
	}

	getCardActionToggle(card: Locator): Locator {
		return card.getByTestId('card-append');
	}

	getCardAction(actionName: string): Locator {
		return this.page.getByTestId(`action-${actionName}`);
	}

	async openCardActions(card: Locator): Promise<void> {
		await this.getCardActionToggle(card).click();
	}

	async clickCardAction(card: Locator, actionName: string): Promise<void> {
		await this.openCardActions(card);
		await this.getCardAction(actionName).click();
	}

	async openFolder(folderName: string): Promise<void> {
		const folderCard = this.getFolderByName(folderName);
		await this.clickCardAction(folderCard, 'open');
	}
}
