import { BasePage } from './BasePage';

declare global {
	interface Window {
		n8nDemoReady?: boolean;
	}
}

export class DemoPage extends BasePage {
	async visitDemoPage(theme?: 'dark' | 'light') {
		const query = theme ? `?theme=${theme}` : '';

		// Inject script to capture n8nReady message before page scripts run
		await this.page.addInitScript(() => {
			window.n8nDemoReady = false;
			window.addEventListener('message', (event) => {
				try {
					if (typeof event.data === 'string' && event.data.includes('"command"')) {
						const json = JSON.parse(event.data);
						if (json.command === 'n8nReady') {
							window.n8nDemoReady = true;
						}
					}
				} catch {
					// Ignore parse errors
				}
			});
		});

		await this.page.goto('/workflows/demo' + query);
		await this.getBody().waitFor({ state: 'visible' });
		await this.page.evaluate(() => {
			// @ts-expect-error - this is a custom property added by the demo page
			window.preventNodeViewBeforeUnload = true;
		});

		// Wait for demo page to signal it's ready to receive messages
		await this.page.waitForFunction(() => window.n8nDemoReady === true, { timeout: 30000 });
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
