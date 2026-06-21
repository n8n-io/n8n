import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

type OpenDiffPayload = {
	oldWorkflow?: object;
	newWorkflow?: object;
	tidyUp?: boolean;
};

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
	 * Navigate to the demo diff view route.
	 * @param options - Optional theme override applied via query param
	 */
	async gotoDiff(options?: { theme?: 'dark' | 'light' }) {
		const params = new URLSearchParams();
		if (options?.theme) params.set('theme', options.theme);
		const query = params.toString() ? `?${params.toString()}` : '';
		await this.page.goto('/workflows/demo/diff' + query);
	}

	getWaitingState(): Locator {
		return this.page.getByText('Waiting for workflow data...');
	}

	getDiffHeading(name: string | RegExp): Locator {
		return this.page.getByRole('heading', { name });
	}

	getChangesButton(): Locator {
		return this.page.getByRole('button', { name: /Changes/ });
	}

	/**
	 * Post an `openDiff` command to the diff view via window.postMessage.
	 * @param payload - The workflows (and options) to render in the diff view
	 */
	async openDiff(payload: OpenDiffPayload) {
		await this.postRawMessage({ command: 'openDiff', ...payload });
	}

	/**
	 * Post a raw message to the page via window.postMessage. Accepts either a
	 * string (e.g. malformed JSON) or an object that gets JSON-stringified.
	 * @param raw - The message payload to post
	 */
	async postRawMessage(raw: string | object) {
		await this.page.evaluate((message) => {
			const data = typeof message === 'string' ? message : JSON.stringify(message);
			window.postMessage(data, '*');
		}, raw);
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

	getBody() {
		return this.page.locator('body');
	}
}
