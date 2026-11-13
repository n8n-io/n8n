import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';

/** The side panel at the right edge of the editor, with one tab per view. */
export class UiExtensionsSidePanel {
	constructor(private page: Page) {}

	getContainer(): Locator {
		return this.page.getByTestId('ui-extensions-side-panel');
	}

	getToggle(): Locator {
		return this.page.getByTestId('ui-extensions-side-panel-toggle');
	}

	getContent(): Locator {
		return this.page.getByTestId('ui-extensions-side-panel-content');
	}

	getTab(title: string): Locator {
		return this.getContent()
			.getByTestId('ui-extensions-side-panel-tabs')
			.getByText(title, { exact: true });
	}

	getViewFrameElement(): Locator {
		return this.getContent().getByTestId('ui-extensions-view-frame');
	}

	/** The document of the active view. */
	getViewFrame(): FrameLocator {
		return this.getViewFrameElement().contentFrame();
	}

	/** An element of the active view, by its test id. */
	getViewElement(testId: string): Locator {
		return this.getViewFrame().getByTestId(testId);
	}

	getViewText(text: string): Locator {
		return this.getViewFrame().getByText(text);
	}

	async open(): Promise<void> {
		await expect(this.getToggle()).toBeVisible();
		if (!(await this.getContent().isVisible())) await this.getToggle().click();
		await expect(this.getContent()).toBeVisible();
	}

	async close(): Promise<void> {
		if (await this.getContent().isVisible()) await this.getToggle().click();
		await expect(this.getContent()).toBeHidden();
	}

	async selectTab(title: string): Promise<void> {
		await this.getTab(title).click();
	}
}
