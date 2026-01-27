import type { Locator } from '@playwright/test';

export class ChatHubToolsModal {
	constructor(private root: Locator) {}

	getRoot(): Locator {
		return this.root;
	}

	getProviderSection(providerName: string): Locator {
		return this.root.locator('[class*="provider"]').filter({ hasText: providerName });
	}

	getCredentialSelect(providerName: string): Locator {
		return this.getProviderSection(providerName).getByRole('combobox');
	}

	getToolSwitch(providerName: string, toolName: string): Locator {
		return this.getProviderSection(providerName).getByLabel(`Toggle ${toolName}`);
	}

	getConfirmButton(): Locator {
		return this.root.getByRole('button', { name: 'Confirm' });
	}
}
