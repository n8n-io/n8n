import { BasePage } from './BasePage';

export class IframePage extends BasePage {
	getIframe() {
		return this.page.locator('iframe');
	}

	getIframeBySrc(src: string) {
		return this.page.locator(`iframe[src="${src}"]`);
	}

	async waitForIframeRequest(url: string) {
		await this.page.waitForResponse(url);
	}
}
