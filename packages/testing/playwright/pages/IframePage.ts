import { BasePage } from './BasePage';

export class IframePage extends BasePage {
	// Element getters (no async, return Locator)
	getIframe() {
		return this.page.locator('iframe');
	}

	getIframeBySrc(src: string) {
		return this.page.locator(`iframe[src="${src}"]`);
	}

	// Simple actions (async, return void)
	async waitForIframeRequest(url: string) {
		await this.page.waitForResponse(url);
	}

	// API interception helper
	async interceptIframeRequest(url: string) {
		await this.page.route(url, (route) => {
			void route.fulfill({
				status: 200,
				body: '<html><body>Test iframe content</body></html>',
			});
		});
	}
}
