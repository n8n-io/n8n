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
}
