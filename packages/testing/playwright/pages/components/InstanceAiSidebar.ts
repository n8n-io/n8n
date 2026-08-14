import { expect, type Locator } from '@playwright/test';

export class InstanceAiSidebar {
	constructor(private root: Locator) {}

	getNewThreadButton(): Locator {
		return this.root.getByTestId('instance-ai-new-thread-button');
	}

	getThreadItems(): Locator {
		return this.root.getByTestId('instance-ai-thread-item');
	}

	getThreadByTitle(title: string): Locator {
		return this.getThreadItems().filter({ hasText: title });
	}

	private getThreadLinkByTitle(title: string): Locator {
		return this.getThreadByTitle(title).getByRole('link', { name: title });
	}

	getThreadByHref(path: string): Locator {
		return this.root.locator(`a[href="${path}"]`);
	}

	getRenameInput(): Locator {
		return this.root.locator('input');
	}

	async renameThreadByTitle(title: string, newTitle: string): Promise<void> {
		const threadItem = this.getThreadByTitle(title);
		await expect(threadItem).toBeVisible({ timeout: 5_000 });
		await this.getThreadLinkByTitle(title).dispatchEvent('dblclick');

		const input = this.getRenameInput();
		await expect(input).toBeVisible({ timeout: 5_000 });
		await input.fill(newTitle);
		await expect(input).toHaveValue(newTitle);
		await this.root.page().keyboard.press('Enter');
	}

	getThreadActionsTrigger(threadItem: Locator): Locator {
		return threadItem.locator('button').last();
	}

	getDeleteMenuItem(): Locator {
		return this.root.page().getByRole('menuitem').filter({ hasText: 'Delete' });
	}
}
