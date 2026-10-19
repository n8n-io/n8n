import { BasePage } from './BasePage';

export class SettingsMcpPage extends BasePage {
	async goto() {
		await this.page.goto('/settings/mcp');
	}

	getConnectButton() {
		return this.page.getByTestId('mcp-connect-client-button');
	}

	getCopyButton() {
		return this.page
			.getByRole('dialog')
			.getByTestId('connection-parameter-value')
			.first()
			.getByRole('button');
	}

	getCopyButtonContainer() {
		return this.page.getByRole('dialog').getByTestId('connection-parameter-value').first();
	}
}
