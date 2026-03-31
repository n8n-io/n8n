import { BasePage } from './BasePage';

export class DemoPage extends BasePage {
	async goto(theme?: 'dark' | 'light') {
		const query = theme ? `?theme=${theme}` : '';
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

	/**
	 * Dispatch a synthetic push event into the push connection store's handlers.
	 * Requires the page to be authenticated (push connection established).
	 */
	async dispatchPushEvent(event: Record<string, unknown>) {
		await this.page.evaluate((evt) => {
			/* eslint-disable @typescript-eslint/naming-convention */
			const app = document.querySelector('#app') as HTMLElement & {
				__vue_app__?: { config: { globalProperties: { $pinia: { _s: Map<string, unknown> } } } };
			};
			const pinia = app?.__vue_app__?.config.globalProperties.$pinia;
			if (!pinia) throw new Error('Pinia not found');
			const pushStore = pinia._s.get('push') as {
				onMessageReceivedHandlers: Array<(e: unknown) => void>;
			};
			if (!pushStore) throw new Error('Push store not found');
			pushStore.onMessageReceivedHandlers.forEach((h) => h(evt));
			/* eslint-enable @typescript-eslint/naming-convention */
		}, event);
	}

	getBody() {
		return this.page.locator('body');
	}
}
