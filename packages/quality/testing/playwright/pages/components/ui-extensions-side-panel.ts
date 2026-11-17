import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';

import { MessageBox } from './messageBoxLocators';

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

	/** The panel, by its accessible name. It has no visible title. */
	getRegion(): Locator {
		return this.page.getByRole('region', { name: 'Side panel' });
	}

	/** A visible "Side panel" text in the panel. The panel should have none. */
	getVisibleTitle(): Locator {
		return this.getContent().getByText('Side panel', { exact: true });
	}

	/** The main header of the workflow page, which the tab row lines up with. */
	getMainHeader(): Locator {
		return this.page.locator('#header');
	}

	getTabRow(): Locator {
		return this.page.getByTestId('ui-extensions-side-panel-tab-row');
	}

	/** The remove button of a user view tab. Built-in tabs have none. */
	getTabCloseButton(title: string): Locator {
		return this.getTabRow().getByRole('button', { name: `Remove ${title}` });
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

/** The group of pages in the main sidebar, and an open page in the main area. */
export class UiExtensionsPages {
	readonly messageBox: MessageBox;

	constructor(private page: Page) {
		this.messageBox = new MessageBox(page);
	}

	getGroup(): Locator {
		return this.page.getByTestId('ui-extensions-pages-nav');
	}

	/** By its accessible name, so it works with a collapsed sidebar, which shows no label. */
	getMenuItem(title: string): Locator {
		return this.getGroup().getByRole('menuitem', { name: title, exact: true });
	}

	/**
	 * The remove button shows on hover, so the item is hovered first. A collapsed
	 * sidebar shows no remove button.
	 */
	async getRemoveButton(title: string): Promise<Locator> {
		await this.getMenuItem(title).hover();
		return this.getGroup().getByRole('button', { name: `Remove ${title}` });
	}

	/** The sidebar item that the page group sits under: Inbox when it shows, else Home. */
	async getAnchorItem(): Promise<Locator> {
		const inbox = this.page.getByTestId('project-inbox-menu-item');
		return (await inbox.isVisible()) ? inbox : this.page.getByTestId('project-home-menu-item');
	}

	/** A service card of the Automation dashboard page, by a name that it shows. */
	getOverviewCard(text: string): Locator {
		return this.getElement('automation-dashboard-card').filter({ hasText: text });
	}

	/** A part of a service card, such as its usage line or its health badge. */
	getOverviewCardPart(card: Locator, testId: string): Locator {
		return card.getByTestId(testId);
	}

	/** The button that opens one workflow from a service card. */
	getOverviewCardWorkflow(card: Locator, workflowName: string): Locator {
		return card.getByTestId('automation-dashboard-workflow').filter({ hasText: workflowName });
	}

	/** A row of "Needs attention" on the Automation dashboard, by its workflow name. */
	getAttentionItem(workflowName: string): Locator {
		return this.getElement('automation-dashboard-attention-item').filter({ hasText: workflowName });
	}

	/** A document in the list of the Notion docs page, by its title. */
	getNotionDocument(title: string): Locator {
		return this.getElement('notion-docs-document').filter({ hasText: title });
	}

	getOverviewFailure(workflowName: string): Locator {
		return this.getElement('automation-dashboard-failure').filter({ hasText: workflowName });
	}

	getPageContainer(): Locator {
		return this.page.getByTestId('ui-extensions-page');
	}

	getFrameElement(): Locator {
		return this.getPageContainer().getByTestId('ui-extensions-view-frame');
	}

	getFrame(): FrameLocator {
		return this.getFrameElement().contentFrame();
	}

	getElement(testId: string): Locator {
		return this.getFrame().getByTestId(testId);
	}

	async open(title: string): Promise<void> {
		await this.getMenuItem(title).click();
		await expect(this.getFrameElement()).toBeVisible();
	}
}
