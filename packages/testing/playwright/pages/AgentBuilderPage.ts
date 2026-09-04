import { expect, type Locator, type Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { getVisibleTooltip } from './components/tooltipLocators';

export class AgentBuilderPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	async goto(projectId: string, agentId: string): Promise<void> {
		await this.page.goto(`/projects/${projectId}/agents/${agentId}`);
		await expect(this.getHeader()).toBeVisible();
	}

	getHeader(): Locator {
		// This header uses `data-testid`, not the configured `data-test-id`
		// attribute, so it isn't reachable via getByTestId().
		return this.page.locator('[data-testid="agent-builder-header"]');
	}

	getPreviewButton(): Locator {
		return this.page.locator('[data-testid="agent-header-preview-btn"]');
	}

	getPublishButton(): Locator {
		return this.page.locator('[data-testid="publish-agent-button"]');
	}

	getVisibleTooltip(): Locator {
		return getVisibleTooltip(this.page);
	}
}
