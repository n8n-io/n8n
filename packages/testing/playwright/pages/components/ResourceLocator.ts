import type { Locator, Page } from '@playwright/test';

/**
 * Page object for the Resource Locator (RLC) surface.
 *
 * Cohesive cluster spanning two render targets:
 *   - in-NDV root (`resource-locator-${paramName}`): input container, mode
 *     selector, error container and search box
 *   - teleported dropdown (`rlc-item`, `rlc-item-add-resource`, `mode-id`),
 *     resolved through the derived `Page` rather than the NDV container
 *
 * Distinct from the project-header `AddResource` component — name collision
 * only; the two share no test ids.
 *
 * @example
 * // Inside a hosting page object
 * readonly resourceLocator = new ResourceLocator(this.container);
 *
 * // Inside a test
 * await n8n.ndv.openResourceLocator('documentId');
 * await expect(n8n.ndv.getResourceLocatorItems().first()).toBeVisible();
 */
export class ResourceLocator {
	private readonly page: Page;

	constructor(private readonly root: Locator) {
		this.page = root.page();
	}

	/** In-NDV root for a given RLC parameter */
	getContainer(paramName: string): Locator {
		return this.root.getByTestId(`resource-locator-${paramName}`);
	}

	getInput(paramName: string): Locator {
		return this.getContainer(paramName).getByTestId('rlc-input-container');
	}

	getInputField(paramName: string): Locator {
		return this.getInput(paramName).locator('input');
	}

	getLink(paramName: string): Locator {
		return this.getInput(paramName).locator('a');
	}

	getModeSelector(paramName: string): Locator {
		return this.getContainer(paramName).getByTestId('rlc-mode-selector');
	}

	getModeSelectorInput(paramName: string): Locator {
		return this.getModeSelector(paramName).locator('input');
	}

	getErrorMessage(paramName: string): Locator {
		return this.getContainer(paramName).getByTestId('rlc-error-container');
	}

	getAddCredentials(paramName: string): Locator {
		return this.getErrorMessage(paramName).locator('a');
	}

	getSearch(paramName: string): Locator {
		return this.getContainer(paramName).getByTestId('rlc-search');
	}

	/** Teleported dropdown items (resolved through the page root). */
	getItems(): Locator {
		return this.page.getByTestId('rlc-item');
	}

	/** Teleported "add resource" entry inside the open dropdown. */
	getAddResourceItem(): Locator {
		return this.page.getByTestId('rlc-item-add-resource');
	}

	getAddResourceCreateOption(): Locator {
		return this.getAddResourceItem().getByText(/Create a/);
	}

	async open(paramName: string): Promise<void> {
		await this.getContainer(paramName).waitFor({ state: 'visible' });
		await this.getInput(paramName).click();
	}

	/**
	 * Open the dropdown via the shared `rlc-input` test id, optionally enter a
	 * search term, then click an item by visible text. Used by sub-workflow
	 * creation flows where the target item is identified by text rather than
	 * a stable test id.
	 */
	async selectResource(createItemText: string, searchText: string = ''): Promise<void> {
		await this.page.getByTestId('rlc-input').click();

		if (searchText) {
			await this.page.getByTestId('rlc-search').fill(searchText);
		}

		await this.page.getByText(createItemText).click();
	}

	/**
	 * Switch the RLC to the mode at the given index and write a value into the
	 * input. Defaults to the first mode (typically "From list" / by id).
	 */
	async setValue(paramName: string, value: string, index = 0): Promise<void> {
		await this.getModeSelector(paramName).click();
		await this.page.getByTestId('mode-id').nth(index).click();
		await this.getInput(paramName).locator('input').fill(value);
	}
}
