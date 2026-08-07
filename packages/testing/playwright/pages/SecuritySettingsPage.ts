import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

type RedactionScope = 'production' | 'all';

const SCOPE_OPTION_LABEL: Record<RedactionScope, string> = {
	production: 'Production executions (Recommended)',
	all: 'Manual and production executions',
};

export class SecuritySettingsPage extends BasePage {
	async goto() {
		// Wait for the settings to load so all components are available. Attach the
		// listener before navigating, or the response can land before we wait for it.
		await Promise.all([
			this.waitForRestResponse('/rest/settings/security', 'GET'),
			this.page.goto('/settings/security'),
		]);
	}

	getEnforcementToggle(): Locator {
		return this.page.getByTestId('enable-redaction-enforcement');
	}

	getEnforcementScopeSelect(): Locator {
		return this.page.getByTestId('redaction-enforcement-scope-select');
	}

	getEnforcementSummary(): Locator {
		return this.page.getByTestId('redaction-enforcement-summary');
	}

	private getConfirmDialog(): Locator {
		return this.page.getByRole('dialog');
	}

	async enableEnforcement(): Promise<void> {
		await this.getEnforcementToggle().click();
		await this.getConfirmDialog().getByRole('button', { name: 'Enable' }).click();
	}

	async selectScope(scope: RedactionScope): Promise<void> {
		await this.getEnforcementScopeSelect().click();
		await this.getVisiblePopoverOption(SCOPE_OPTION_LABEL[scope]).click();
	}
}
