import { BasePage } from './BasePage';

export class DemoPage extends BasePage {
	async visitDemoPage(theme?: 'dark' | 'light') {
		const query = theme ? `?theme=${theme}` : '';
		await this.page.goto('/workflows/demo' + query);
		await this.getBody().waitFor({ state: 'visible' });
		// eslint-disable-next-line playwright/no-networkidle
		await this.page.waitForLoadState('networkidle');
		await this.page.evaluate(() => {
			// @ts-expect-error - this is a custom property added by the demo page
			window.preventNodeViewBeforeUnload = true;
		});
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
