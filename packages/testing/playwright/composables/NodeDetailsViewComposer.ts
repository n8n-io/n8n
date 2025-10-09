import type { Request, Page } from '@playwright/test';

import type { n8nPage } from '../pages/n8nPage';

/**
 * A class for user interactions with Node Details View (NDV) that involve multi-step workflows.
 */
export class NodeDetailsViewComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Selects a workflow from the resource locator list by name
	 * @param paramName - The parameter name for the resource locator
	 * @param workflowName - The name of the workflow to select
	 */
	async selectWorkflowFromList(paramName: string, workflowName: string): Promise<void> {
		await this.n8n.ndv.openResourceLocator(paramName);

		const items = this.n8n.page.getByTestId('rlc-item');
		const targetItem = items.filter({ hasText: workflowName });
		await targetItem.click();
	}

	/**
	 * Filters the resource locator list by search term
	 * @param paramName - The parameter name for the resource locator
	 * @param searchTerm - The term to search for
	 */
	async filterWorkflowList(paramName: string, searchTerm: string): Promise<void> {
		await this.n8n.ndv.openResourceLocator(paramName);
		await this.n8n.ndv.getResourceLocatorSearch(paramName).fill(searchTerm);
	}

	/**
	 * Selects the first workflow item from a filtered list
	 */
	async selectFirstFilteredWorkflow(): Promise<void> {
		const items = this.n8n.page.getByTestId('rlc-item');
		await items.first().click();
	}

	/**
	 * Switches a resource locator to expression mode
	 * @param paramName - The parameter name for the resource locator
	 * @param workflowName - The workflow to select before switching to expression mode
	 */
	async switchToExpressionMode(paramName: string, workflowName?: string): Promise<void> {
		if (workflowName) {
			await this.selectWorkflowFromList(paramName, workflowName);
		}

		// Switch to expression mode
		await this.n8n.page.getByTestId('radio-button-expression').nth(1).click();
	}

	/**
	 * Clicks add resource option to create a new sub-workflow
	 * @param paramName - The parameter name for the resource locator
	 */
	async createNewSubworkflow(paramName: string): Promise<void> {
		await this.n8n.ndv.openResourceLocator(paramName);

		const addResourceItem = this.n8n.page.getByTestId('rlc-item-add-resource').first();
		await addResourceItem.waitFor({ state: 'visible' });

		await addResourceItem.click();
	}

	/**
	 * Creates a new sub-workflow with redirect handling
	 * @param paramName - The parameter name for the resource locator
	 * @returns Promise with request data and new window page
	 */
	async createNewSubworkflowWithRedirect(
		paramName: string,
	): Promise<{ request: Request; page: Page }> {
		const subWorkflowPagePromise = this.n8n.page.waitForEvent('popup');

		const [request] = await Promise.all([
			this.n8n.page.waitForRequest('**/rest/workflows'),
			this.createNewSubworkflow(paramName),
		]);

		const page = await subWorkflowPagePromise;

		return { request, page };
	}
}
