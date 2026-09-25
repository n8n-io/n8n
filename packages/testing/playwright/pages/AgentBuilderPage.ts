import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

export class AgentBuilderPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	async goto(projectId: string, agentId: string): Promise<void> {
		await this.page.goto(`/projects/${projectId}/agents/${agentId}`);
	}

	getHeader(): Locator {
		// The agents feature uses `data-testid`, not the `data-test-id` attribute
		// configured for `getByTestId`, so target the attribute directly.
		return this.page.locator('[data-testid="agent-builder-header"]');
	}

	getCollaborationBanner(): Locator {
		return this.page.getByTestId('agent-collaboration-banner');
	}

	getCollaborationTakeOverButton(): Locator {
		return this.page.getByTestId('agent-collaboration-take-over');
	}

	/** Triggers a config edit by changing the agent name, which acquires the
	 * write lock under the lazy-acquisition pattern. */
	async editAgentName(name: string): Promise<void> {
		const edit = this.page.locator('[data-testid="agent-name-inline-edit"]');
		await edit.click();
		await edit.locator('input, textarea').fill(name);
		// Blur to trigger the update event
		await edit.locator('input, textarea').press('Enter');
	}
}
