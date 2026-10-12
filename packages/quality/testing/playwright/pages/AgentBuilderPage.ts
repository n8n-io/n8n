import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

export class AgentBuilderPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	async goto(
		projectId: string,
		agentId: string,
		options?: { openPreview?: boolean; assistantThread?: string },
	): Promise<void> {
		const query = new URLSearchParams();
		if (options?.openPreview) query.set('openPreview', 'true');
		if (options?.assistantThread) query.set('assistantThread', options.assistantThread);
		const suffix = query.size > 0 ? `?${query}` : '';
		await this.page.goto(`/projects/${projectId}/agents/${agentId}${suffix}`);
	}

	getEditorColumn(): Locator {
		return this.page.locator('[data-testid="agent-builder-editor-column"]');
	}

	getEditingOverlay(): Locator {
		return this.getEditorColumn().locator('[data-testid="agent-editing-overlay"]');
	}

	getTakeOverButton(): Locator {
		return this.getEditingOverlay().getByRole('button', { name: 'Take over' });
	}

	getEditingStatus(): Locator {
		return this.getEditingOverlay().getByRole('status');
	}

	getInstructionsEditor(): Locator {
		return this.page.locator('[data-testid="agent-instructions-document"] .tiptap');
	}

	getMainTab(name: string): Locator {
		return this.getEditorColumn().getByRole('tab', { name, includeHidden: true });
	}

	getPreviewButton(): Locator {
		return this.page.locator('[data-testid="agent-triggers-preview-chat-button"]');
	}

	async openAssistant(): Promise<void> {
		await this.page.locator('[data-testid="agent-builder-instance-ai-btn"]').click();
	}

	async openDescription(): Promise<void> {
		await this.getHeader().getByRole('button', { name: 'More actions', exact: true }).click();
		await this.page.getByRole('menuitem', { name: 'Edit description', exact: true }).click();
	}

	getDescriptionDialog(): Locator {
		return this.page.getByRole('dialog').filter({
			has: this.page.locator('[data-testid="agent-description-input"]'),
		});
	}

	getDescriptionInput(): Locator {
		return this.getDescriptionDialog().getByRole('textbox', { includeHidden: true });
	}

	getDescriptionSaveButton(): Locator {
		return this.getDescriptionDialog().getByRole('button', {
			name: 'Save',
			exact: true,
			includeHidden: true,
		});
	}

	getDescriptionCloseButton(): Locator {
		return this.getDescriptionDialog().getByRole('button', { name: 'Close', exact: true });
	}

	getDescriptionCancelButton(): Locator {
		return this.getDescriptionDialog().getByRole('button', { name: 'Cancel', exact: true });
	}

	getDescriptionTakeOverButton(): Locator {
		return this.getDescriptionDialog().getByRole('button', { name: 'Take over' });
	}

	async tryToSelectInstructions(): Promise<string> {
		const bounds = await this.getInstructionsEditor().boundingBox();
		if (!bounds) throw new Error('The instructions are not visible');
		await this.page.mouse.move(bounds.x + 10, bounds.y + 10);
		await this.page.mouse.down();
		await this.page.mouse.move(bounds.x + bounds.width - 10, bounds.y + 30, { steps: 5 });
		await this.page.mouse.up();
		return await this.page.evaluate(() => window.getSelection()?.toString() ?? '');
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
