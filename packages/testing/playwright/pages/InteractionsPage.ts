import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

export class InteractionsPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	async precisionDragToTarget(
		sourceLocator: Locator,
		targetLocator: Locator,
		position: 'top' | 'center' | 'bottom' = 'bottom',
	): Promise<void> {
		await expect(sourceLocator).toBeVisible();
		await expect(targetLocator).toBeVisible();

		const targetBox = await targetLocator.boundingBox();
		if (!targetBox) {
			throw new Error('Could not get bounding box for target element');
		}

		let dropPosition: { x: number; y: number };
		switch (position) {
			case 'top':
				dropPosition = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + 2 };
				break;
			case 'center':
				dropPosition = {
					x: targetBox.x + targetBox.width / 2,
					y: targetBox.y + targetBox.height / 2,
				};
				break;
			case 'bottom':
				dropPosition = {
					x: targetBox.x + targetBox.width / 2,
					y: targetBox.y + targetBox.height - 2,
				};
				break;
		}

		await sourceLocator.hover();
		await this.page.mouse.down();
		await this.page.mouse.move(dropPosition.x, dropPosition.y);
		await this.page.mouse.up();
	}
}
