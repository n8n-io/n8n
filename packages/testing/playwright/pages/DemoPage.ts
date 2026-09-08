import { BasePage } from './BasePage';

export class DemoPage extends BasePage {
	async goto(options?: { theme?: 'dark' | 'light'; canExecute?: boolean }) {
		const params = new URLSearchParams();
		if (options?.theme) params.set('theme', options.theme);
		if (options?.canExecute) params.set('canExecute', 'true');
		const query = params.toString() ? `?${params.toString()}` : '';
		await this.page.goto('/workflows/demo' + query);
		await this.page.getByTestId('canvas-background').waitFor({ state: 'visible' });
	}

	/**
	 * Import a workflow into the demo page
	 * @param workflow - The workflow to import
	 */
	async importWorkflow(workflow: object) {
		const OPEN_WORKFLOW = { command: 'openWorkflow', workflow };
		await this.page.evaluate((message) => {
			console.log('Posting message:', JSON.stringify(message));
			window.postMessage(JSON.stringify(message), '*');
		}, OPEN_WORKFLOW);
	}

	async gotoDiff(options?: { theme?: 'dark' | 'light' }) {
		const params = new URLSearchParams();
		if (options?.theme) params.set('theme', options.theme);
		const query = params.toString() ? `?${params.toString()}` : '';
		await this.page.goto('/workflows/demo/diff' + query);
	}

	/**
	 * Open a workflow diff via postMessage on the demo diff page
	 * @param diff - The old/new workflows and tidyUp option to diff
	 */
	async openDiff(diff: { oldWorkflow?: object; newWorkflow?: object; tidyUp?: boolean }) {
		const OPEN_DIFF = { command: 'openDiff', ...diff };
		await this.page.evaluate((message) => {
			window.postMessage(JSON.stringify(message), '*');
		}, OPEN_DIFF);
	}

	/**
	 * Post a raw, possibly malformed, message to the demo diff page
	 * @param message - The raw message string to post
	 */
	async postRawMessage(message: string) {
		await this.page.evaluate((raw) => {
			window.postMessage(raw, '*');
		}, message);
	}

	getWaitingMessage() {
		return this.page.getByText('Waiting for workflow data...');
	}

	getDiffHeading(name?: string | RegExp) {
		return this.page.getByRole('heading', { name: name ?? /Test Workflow/ });
	}

	getChangesButton() {
		return this.page.getByRole('button', { name: /Changes/ });
	}

	getBody() {
		return this.page.locator('body');
	}
}
