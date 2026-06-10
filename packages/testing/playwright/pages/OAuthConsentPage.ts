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

	async allow() {
		await this.clickByTestId('consent-allow-button');
	}
}
