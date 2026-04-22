import type { Locator } from '@playwright/test';

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

	getRenameInput(): Locator {
		return this.root.locator('input');
	}

	getThreadActionsTrigger(threadItem: Locator): Locator {
		return threadItem.locator('button').last();
	}

	getDeleteMenuItem(): Locator {
		return this.root.page().getByRole('menuitem').filter({ hasText: 'Delete' });
	}
}
