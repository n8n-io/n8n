import type { Locator, Page } from '@playwright/test';

/**
 * Page object for the Assignment Collection sub-surface.
 *
 * Cohesive cluster spanning two render targets:
 *   - in-NDV root (`assignment-collection-${paramName}`): drop area, assignment
 *     rows (`assignment`), per-row `assignment-name` / `assignment-value` /
 *     `assignment-type-select`
 *   - teleported type dropdown (`assignment-type-select-dropdown`), resolved
 *     through the derived `Page` rather than the NDV container — mirrors the
 *     pattern in `ResourceLocator`.
 *
 * Owns every selector for the cluster so consumers (`NodeDetailsViewPage`,
 * `EditFieldsNode`) become thin orchestrators rather than re-deriving the
 * root locator.
 *
 * @example
 * // Inside a hosting page object
 * readonly assignments = new AssignmentCollection(this.container);
 *
 * // Inside a test
 * await n8n.ndv.getAssignmentCollectionAdd('assignments').click();
 * await expect(n8n.ndv.getAssignments('assignments')).toHaveCount(3);
 */
export class AssignmentCollection {
	private readonly page: Page;

	constructor(private readonly root: Locator) {
		this.page = root.page();
	}

	/** In-NDV root for a given collection parameter */
	getContainer(paramName: string): Locator {
		return this.root.getByTestId(`assignment-collection-${paramName}`);
	}

	/** Drop area inside a specific collection — doubles as the "add row" target */
	getAdd(paramName: string): Locator {
		return this.getContainer(paramName).getByTestId('assignment-collection-drop-area');
	}

	/**
	 * Unscoped drop area (any collection inside the host root). Used when the
	 * caller only needs to poke *a* collection — e.g. to dirty the node for a
	 * stale-state check.
	 */
	getDropArea(): Locator {
		return this.root.getByTestId('assignment-collection-drop-area');
	}

	async clickDropArea(): Promise<void> {
		await this.getDropArea().click();
	}

	getAssignments(paramName: string): Locator {
		return this.getContainer(paramName).getByTestId('assignment');
	}

	getAssignment(paramName: string, index = 0): Locator {
		return this.getAssignments(paramName).nth(index);
	}

	getName(paramName: string, index = 0): Locator {
		return this.getAssignment(paramName, index).getByTestId('assignment-name');
	}

	getNameTextbox(paramName: string, index = 0): Locator {
		return this.getName(paramName, index).getByRole('textbox');
	}

	getValue(paramName: string): Locator {
		return this.getContainer(paramName).getByTestId('assignment-value');
	}

	getValueAt(paramName: string, index = 0): Locator {
		return this.getAssignment(paramName, index).getByTestId('assignment-value');
	}

	getExpressionToggle(paramName: string): Locator {
		return this.getValue(paramName).getByText('Expression');
	}

	async clickExpressionToggle(paramName: string): Promise<void> {
		await this.getExpressionToggle(paramName).click();
	}

	/**
	 * Ensure an assignment row exists at the given index, clicking the drop
	 * area to add new rows as needed.
	 */
	async ensureRow(paramName: string, index: number): Promise<void> {
		const assignments = this.getAssignments(paramName);
		const dropArea = this.getAdd(paramName);
		if (index > 0) {
			await dropArea.click();
			await assignments.nth(index).waitFor({ state: 'visible' });
			return;
		}

		const existing = await assignments.count();
		if (existing === 0) {
			await dropArea.click();
			await assignments.first().waitFor({ state: 'visible' });
		}
	}

	/**
	 * Open the per-row type picker and select an entry from the teleported
	 * `assignment-type-select-dropdown`. The dropdown is resolved through the
	 * derived `Page`, mirroring `ResourceLocator.getItems()`.
	 */
	async selectFieldType(paramName: string, index: number, type: string): Promise<void> {
		const typeSelect = this.getAssignment(paramName, index).getByTestId('assignment-type-select');
		await typeSelect.waitFor({ state: 'visible' });
		await typeSelect.getByRole('button').click();

		const option = this.page
			.getByTestId('assignment-type-select-dropdown')
			.filter({ visible: true })
			.getByTestId(`action-${type}`);
		await option.waitFor({ state: 'visible' });
		await option.click();
	}
}
