import type { Locator, Page } from '@playwright/test';

import { locatorByIndex } from '../../utils/index-helper';

/**
 * Page object for the inline expression editor surface.
 *
 * Cohesive cluster spanning three render targets:
 *   - in-NDV input root (`parameter-input-*` / `inline-expression-editor-input`)
 *   - teleported preview popover (`inline-expression-editor-output`)
 *   - teleported expression modal (`expression-modal-input` / `expression-modal-output`)
 *
 * The popover and modal are teleported to the page root, so they're resolved
 * through the derived `Page` rather than the NDV container.
 *
 * @example
 * // Inside a hosting page object
 * readonly inlineExpressionEditor = new InlineExpressionEditor(this.container);
 *
 * // Inside a test
 * await n8n.ndv.activateParameterExpressionEditor('value');
 * await n8n.ndv.typeInExpressionEditor('{{ 1 + 1');
 */
export class InlineExpressionEditor {
	private readonly page: Page;

	constructor(private readonly root: Locator) {
		this.page = root.page();
	}

	/**
	 * In-NDV inline editor input.
	 * @param parameterName - Scope to a specific parameter; otherwise picks any in-NDV input
	 */
	getInput(parameterName?: string): Locator {
		if (parameterName) {
			return this.getParameterInput(parameterName).getByTestId('inline-expression-editor-input');
		}
		return this.root.getByTestId('inline-expression-editor-input');
	}

	getContent(): Locator {
		return this.getInput().locator('.cm-content');
	}

	/** CodeMirror rendered lines within the in-NDV editor content. */
	getLines(): Locator {
		return this.getContent().locator('.cm-line');
	}

	/** A single rendered CodeMirror line by zero-based index. */
	getLine(index: number): Locator {
		return this.getLines().nth(index);
	}

	/** Teleported preview popover (same test id as the output). */
	getPreview(): Locator {
		return this.page.getByTestId('inline-expression-editor-output');
	}

	getOutput(): Locator {
		return this.page.getByTestId('inline-expression-editor-output');
	}

	getItemInput(): Locator {
		return this.page.getByTestId('inline-expression-editor-item-input').locator('input');
	}

	getItemPrevButton(): Locator {
		return this.page.getByTestId('inline-expression-editor-item-prev');
	}

	getItemNextButton(): Locator {
		return this.page.getByTestId('inline-expression-editor-item-next');
	}

	// Park the cursor away from run-data rows; hovering one disables the item next/prev buttons.
	async moveMouseAway(): Promise<void> {
		await this.page.mouse.move(0, 0);
	}

	async selectNextItem(): Promise<void> {
		await this.moveMouseAway();
		await this.getItemNextButton().click();
	}

	async selectPrevItem(): Promise<void> {
		await this.moveMouseAway();
		await this.getItemPrevButton().click();
	}

	/** Flip the parameter to expression mode via the inline options toggle. */
	async activate(parameterName: string): Promise<void> {
		const parameterInput = this.getParameterInput(parameterName);
		await parameterInput.click();
		await this.root
			.getByTestId(`${parameterName}-parameter-input-options-container`)
			.getByTestId('radio-button-expression')
			.click();
	}

	async clear(parameterName?: string): Promise<void> {
		const editor = this.getInput(parameterName);
		await editor.click();
		await this.page.keyboard.press('ControlOrMeta+A');
		await this.page.keyboard.press('Delete');
	}

	async type(text: string, parameterName?: string): Promise<void> {
		const editor = this.getInput(parameterName);
		await editor.click();
		await editor.type(text);
	}

	/** Open the teleported expression modal for a parameter. */
	async openModal(parameterName: string): Promise<void> {
		await this.activate(parameterName);
		const parameter = this.getParameterInput(parameterName);
		await parameter.click();
		await parameter.getByTestId('expander').click();
		await this.page.getByTestId('expression-modal-input').waitFor({ state: 'visible' });
	}

	getModalInput(): Locator {
		return this.page.getByTestId('expression-modal-input').getByRole('textbox');
	}

	getModalOutput(): Locator {
		return this.page.getByTestId('expression-modal-output');
	}

	async fillModalInput(text: string): Promise<void> {
		const input = this.getModalInput();
		await input.clear();
		await input.click();
		await input.fill(text);
	}

	/** Drop an intentionally invalid expression in to exercise error rendering. */
	async setInvalid({
		fieldName,
		invalidExpression,
	}: {
		fieldName: string;
		invalidExpression?: string;
	}): Promise<void> {
		await this.activate(fieldName);
		const editor = this.getInput(fieldName);
		await editor.click();
		await this.page.keyboard.type(invalidExpression ?? '{{ =()');
	}

	private getParameterInput(parameterName: string, index?: number): Locator {
		return locatorByIndex(this.root.getByTestId(`parameter-input-${parameterName}`), index);
	}
}
