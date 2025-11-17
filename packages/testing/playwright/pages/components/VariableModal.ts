import type { Locator } from '@playwright/test';

/**
 * Variable modal component for canvas and variables interactions.
 * Used within VariablesPage as `n8n.variables.modal.*`
 *
 * @example
 * // Access via canvas page or variables page
 * await n8n.variables.modal.addVariable();
 * await expect(n8n.variables.modal.getModal()).toBeVisible();
 */
export class VariableModal {
	constructor(private root: Locator) {}

	getModal(): Locator {
		return this.root;
	}

	getKeyInput(): Locator {
		return this.root.getByTestId('variable-modal-key-input').getByRole('textbox');
	}

	getValueInput(): Locator {
		return this.root.getByTestId('variable-modal-value-input').getByRole('textbox');
	}

	async waitForModal(): Promise<void> {
		await this.root.waitFor({ state: 'visible' });
	}

	getSaveButton(): Locator {
		return this.root.getByTestId('variable-modal-save-button');
	}

	async save(): Promise<void> {
		const saveBtn = this.getSaveButton();
		await saveBtn.click();
	}

	async close(): Promise<void> {
		const closeBtn = this.root.locator('.el-dialog__close').first();
		if (await closeBtn.isVisible()) {
			await closeBtn.click();
		}
	}

	/**
	 * Add a variable to the modal
	 * @param key - The variable key
	 * @param value - The variable value
	 * @param options - The options to pass to the modal
	 * @param options.closeDialog - Whether to close the modal after saving
	 */
	async addVariable(
		key: string,
		value: string,
		{ shouldSave }: { shouldSave: boolean } = { shouldSave: true },
	): Promise<void> {
		await this.getKeyInput().fill(key);
		await this.getValueInput().fill(value);
		if (shouldSave) {
			console.log('Saving variable from modal');
			await this.save();
		}
	}
}
