import type { Locator, Page } from '@playwright/test';

import { BasePage } from '../BasePage';

/**
 * Sticky note component for canvas interactions.
 * Used within CanvasPage as `n8n.canvas.sticky.*`
 *
 * @example
 * // Access via canvas page
 * await n8n.canvas.sticky.addSticky();
 * await expect(n8n.canvas.sticky.getStickies()).toHaveCount(1);
 */
export class StickyComponent extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	getAddButton(): Locator {
		return this.page.getByTestId('add-sticky-button');
	}

	getStickies(): Locator {
		return this.page.getByTestId('sticky');
	}

	getStickyByIndex(index: number): Locator {
		return this.getStickies().nth(index);
	}

	async addSticky(): Promise<void> {
		await this.getAddButton().click();
	}

	/**
	 * Add a sticky from the context menu, targets top left corner of canvas, so could fail if it's covered
	 * @param canvasPane - The canvas pane locator
	 */
	async addFromContextMenu(canvasPane: Locator): Promise<void> {
		await canvasPane.click({
			button: 'right',
			position: { x: 10, y: 10 },
		});
		await this.page.getByText('Add sticky note').click();
	}

	getDefaultStickyGuideLink(): Locator {
		return this.getStickies().first().getByRole('link', { name: 'Guide' });
	}
}
