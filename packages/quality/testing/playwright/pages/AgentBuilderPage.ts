import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

export class AgentBuilderPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	async goto(
		projectId: string,
		agentId: string,
		options?: { openPreview?: boolean },
	): Promise<void> {
		const query = options?.openPreview ? '?openPreview=true' : '';
		await this.page.goto(`/projects/${projectId}/agents/${agentId}${query}`);
	}

	getBuilderContainer(): Locator {
		return this.page.locator('[data-testid="agent-builder-container"]');
	}

	getPreviewDock(): Locator {
		return this.page.locator('[data-testid="agent-preview-dock"]');
	}

	getPreviewMoreButton(): Locator {
		return this.getPreviewDock().locator('[data-testid="agent-preview-more-btn"]');
	}

	getFullWidthMenuItem(): Locator {
		return this.page.getByRole('menuitemcheckbox', { name: 'Full width' });
	}

	async getPreviewWidthDifference(): Promise<number> {
		const builderBounds = await this.getBuilderContainer().boundingBox();
		const dockBounds = await this.getPreviewDock().boundingBox();
		if (!builderBounds || !dockBounds) throw new Error('The preview layout is not visible');
		return Math.abs(builderBounds.width - dockBounds.width);
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
