import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/** The Workflow Rules settings page, plus the builder pieces it adds to the editor. */
export class WorkflowRulesPage extends BasePage {
	async goto() {
		await Promise.all([
			this.waitForRestResponse('/rest/workflow-rules/instance', 'GET'),
			this.page.goto('/settings/workflow-rules'),
		]);
	}

	getRuleRow(ruleId: string): Locator {
		return this.page.getByTestId(`workflow-rule-row-${ruleId}`);
	}

	getSeverityOption(ruleId: string, label: 'Off' | 'Warn' | 'Block'): Locator {
		return this.getRuleRow(ruleId).getByRole('radio', { name: label });
	}

	getSaveBar(): Locator {
		return this.page.getByTestId('workflow-rules-save-bar');
	}

	getImpactDialog(): Locator {
		return this.page.getByTestId('workflow-rules-impact');
	}

	getImpactConfirmButton(): Locator {
		return this.page.getByTestId('workflow-rules-impact-confirm');
	}

	async save() {
		await this.getSaveBar().getByRole('button', { name: 'Save rules' }).click();
	}

	getStatusButton(): Locator {
		return this.page.getByTestId('workflow-rules-status');
	}

	getPanel(): Locator {
		return this.page.getByTestId('workflow-rules-panel');
	}

	getPanelFindings(): Locator {
		return this.getPanel().getByTestId('workflow-rules-finding');
	}

	getNodeBadges(): Locator {
		return this.page.getByTestId('workflow-rule-node-badge');
	}
}
