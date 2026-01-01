import type { Locator } from '@playwright/test';

import { BasePage } from '../BasePage';

/**
 * Convert to Sub-workflow Modal component for converting nodes to sub-workflows.
 * Used within CanvasPage as `n8n.canvas.convertToSubworkflowModal.*`
 *
 * @example
 * // Access via canvas page
 * await n8n.canvas.rightClickNode('My Node');
 * await n8n.canvas.clickContextMenuAction('Convert node to sub-workflow');
 * await n8n.canvas.convertToSubworkflowModal.waitForModal();
 * await n8n.canvas.convertToSubworkflowModal.clickSubmitButton();
 * await n8n.canvas.convertToSubworkflowModal.waitForClose();
 */
export class ConvertToSubworkflowModal extends BasePage {
	constructor(private root: Locator) {
		super(root.page());
	}

	getModal(): Locator {
		return this.root;
	}

	getSubmitButton(): Locator {
		return this.root.getByTestId('submit-button');
	}

	async waitForModal(): Promise<void> {
		await this.root.waitFor({ state: 'visible' });
	}

	async clickSubmitButton(): Promise<void> {
		await this.getSubmitButton().click();
	}

	async waitForClose(): Promise<void> {
		await this.root.waitFor({ state: 'hidden' });
	}
}
