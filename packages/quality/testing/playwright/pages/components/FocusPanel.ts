import type { Locator } from '@playwright/test';

export class FocusPanel {
	constructor(private root: Locator) {}

	/**
	 * Accessors
	 */

	getHeaderNodeName(): Locator {
		return this.root.locator('header').getByTestId('inline-edit-preview');
	}

	getParameterInputField(path: string): Locator {
		return this.root.locator(
			`[data-test-id="parameter-input-field"][title="Parameter: \\"${path}\\""]`,
		);
	}

	getMapper(): Locator {
		// find from the entire page because the mapper is rendered as portal
		return this.root.page().getByRole('dialog').getByTestId('ndv-input-panel');
	}
}
