import type { Locator, Page } from '@playwright/test';

/**
 * Page object for the resource-locator (RLC) surface.
 *
 * The RLC has two render targets:
 *   - in-NDV root (`resource-locator-${paramName}`): input container, mode
 *     selector, error/credential prompt, search field
 *   - teleported dropdown (`rlc-item` / `rlc-item-add-resource` / `mode-id`):
 *     resolved through the derived `Page` rather than the NDV container
 *
 * Distinct from the project-header `AddResource` component — name collision
 * only.
 *
 * @example
 * // Inside a hosting page object
 * readonly resourceLocator = new ResourceLocator(this.container);
 *
 * // Inside a test
 * await n8n.ndv.resourceLocator.open('workflowId');
 * await n8n.ndv.resourceLocator.setValue('documentId', '123');
 */
export class ResourceLocator {
	private readonly page: Page;

	constructor(private readonly root: Locator) {
		this.page = root.page();
	}

	/** The RLC wrapper for a given parameter (in-NDV) */
	get(paramName: string): Locator {
		return this.root.getByTestId(`resource-locator-${paramName}`);
	}

	getInput(paramName: string): Locator {
		return this.get(paramName).getByTestId('rlc-input-container');
	}

	getInputField(paramName: string): Locator {
		return this.getInput(paramName).locator('input');
	}

	getLink(paramName: string): Locator {
		return this.getInput(paramName).locator('a');
	}

	getModeSelector(paramName: string): Locator {
		return this.get(paramName).getByTestId('rlc-mode-selector');
	}

	getModeSelectorInput(paramName: string): Locator {
		return this.getModeSelector(paramName).locator('input');
	}

	getErrorMessage(paramName: string): Locator {
		return this.get(paramName).getByTestId('rlc-error-container');
	}

	getAddCredentialsLink(paramName: string): Locator {
		return this.getErrorMessage(paramName).locator('a');
	}

	getSearch(paramName: string): Locator {
		return this.get(paramName).getByTestId('rlc-search');
	}

	/** Teleported dropdown rows */
	getItems(): Locator {
		return this.page.getByTestId('rlc-item');
	}

	/** Teleported "add resource" row inside the dropdown */
	getAddResourceItem(): Locator {
		return this.page.getByTestId('rlc-item-add-resource');
	}

	/** "Create a ..." entry inside the add-resource row */
	getAddResourceCreateOption(): Locator {
		return this.getAddResourceItem().getByText(/Create a/);
	}

	async open(paramName: string): Promise<void> {
		await this.get(paramName).waitFor({ state: 'visible' });
		await this.getInput(paramName).click();
	}

	/**
	 * Switch the RLC to a specific mode (by index) and fill its input.
	 * @param paramName - The RLC parameter name
	 * @param value - The value to type into the input
	 * @param index - Index of the mode entry to pick (0 = first)
	 */
	async setValue(paramName: string, value: string, index: number = 0): Promise<void> {
		await this.getModeSelector(paramName).click();
		await this.page.getByTestId('mode-id').nth(index).click();
		await this.getInput(paramName).locator('input').fill(value);
	}

	/**
	 * Open the RLC dropdown and click an entry by visible text — typically the
	 * "Create ..." add-resource row. Optionally filters the list first.
	 */
	async selectWorkflowResource(createItemText: string, searchText: string = ''): Promise<void> {
		await this.root.getByTestId('rlc-input').click();
		if (searchText) {
			await this.root.getByTestId('rlc-search').fill(searchText);
		}
		await this.page.getByText(createItemText).click();
	}
}
