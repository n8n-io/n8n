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

	getBody() {
		return this.page.locator('body');
	}
}
