import { BasePage } from './BasePage';

/**
 * OAuth consent screen shown at /oauth/consent during the MCP OAuth
 * authorization flow. The flow is entered by navigating the browser to the
 * /mcp-oauth/authorize URL, which redirects here.
 */
export class OAuthConsentPage extends BasePage {
	/** Enter the flow by navigating to the /mcp-oauth/authorize URL, which redirects here. */
	async goto(authorizeUrl: string) {
		await this.page.goto(authorizeUrl);
	}

	getConsentContent() {
		return this.page.getByTestId('consent-content');
	}

	/**
	 * Tick the "I recognize and trust this URL" checkbox shown alongside the
	 * redirect URI warning. Allow is gated on this until the user acknowledges
	 * the destination they will be sent back to.
	 */
	async acknowledgeRedirectUri() {
		await this.page.getByLabel('I recognize and trust this URL').click();
	}

	async allow() {
		await this.acknowledgeRedirectUri();
		await this.clickByTestId('consent-allow-button');
	}
}
