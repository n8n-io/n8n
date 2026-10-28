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

	async setExperiment(cohort: string, width: string, toggle: string): Promise<void> {
		await this.page.evaluate(
			({ cohort, width, toggle }) => {
				const flags = (
					window as Window & { featureFlags?: { override: (key: string, value: string) => void } }
				).featureFlags;
				if (!flags) throw new Error('Feature flag overrides are not available');
				flags.override('133_agent_builder_experiment_cohort', cohort);
				flags.override('134_agent_builder_chat_width', width);
				flags.override('135_agent_builder_test_toggle', toggle);
			},
			{ cohort, width, toggle },
		);
	}

	async openAssistantIfClosed(): Promise<void> {
		const button = this.page.locator('[data-testid="agent-builder-instance-ai-btn"]');
		if (await button.isVisible()) await button.click();
	}

	getHeaderTestButton(): Locator {
		return this.page.locator('[data-testid="agent-header-preview-btn"]');
	}

	getTriggersTestButton(): Locator {
		return this.page.locator('[data-testid="agent-triggers-preview-chat-button"]');
	}

	async hoverTestButtonWarning(button: Locator): Promise<void> {
		await button.locator('..').hover();
	}

	getPreviewWorkingWarning(): Locator {
		return this.page
			.getByTestId('tooltip-content')
			.filter({ hasText: 'Wait for the Assistant to finish working' });
	}

	getBuilderContainer(): Locator {
		return this.page.locator('[data-testid="agent-builder-container"]');
	}

	getPreviewDock(): Locator {
		return this.page.locator('[data-testid="agent-preview-dock"]');
	}

	getAssistantChat(): Locator {
		return this.page.locator('[data-testid="agent-ai-chat-panel"]');
	}

	getOpenFullAssistantButton(): Locator {
		return this.getAssistantChat().getByTestId('instance-ai-embed-open-full');
	}

	getConfiguration(): Locator {
		return this.page.locator('[data-testid="agent-builder-editor-column"]');
	}

	async getConfigurationWidthRatio(): Promise<number> {
		const layout = await this.getLayout().boundingBox();
		const configuration = await this.getConfiguration().boundingBox();
		if (!layout || !configuration) throw new Error('The builder panels are not visible');
		return configuration.width / layout.width;
	}

	getModeButton(mode: 'build' | 'test'): Locator {
		return this.page.locator(`[data-testid="agent-builder-mode-${mode}"]:visible`);
	}

	getPreviewLink(name: string): Locator {
		return this.page.getByRole('link', { name, exact: true });
	}

	async hoverTestMode(): Promise<void> {
		await this.getModeButton('test').locator('..').hover();
	}

	getTestModeWarning(): Locator {
		return this.page.locator('.n8n-tooltip:visible').filter({ hasText: "Can't test agent yet" });
	}

	getComposer(mode: 'build' | 'test'): Locator {
		return (mode === 'build' ? this.getAssistantChat() : this.getPreviewDock()).locator('textarea');
	}

	getComposerFrame(mode: 'build' | 'test'): Locator {
		return (mode === 'build' ? this.getAssistantChat() : this.getPreviewDock()).getByTestId(
			'chat-input-composer',
		);
	}

	getBuildAgentAttachment(): Locator {
		return this.getAssistantChat().getByTestId('instance-ai-handoff-context-chip');
	}

	getTestAttachIcon(): Locator {
		return this.getPreviewDock().getByTestId('chat-input-attach-button').locator('[data-icon]');
	}

	async attachTestFile(filePath: string): Promise<void> {
		const chooser = this.page.waitForEvent('filechooser');
		await this.getPreviewDock().getByTestId('chat-input-attach-button').click();
		await (await chooser).setFiles(filePath);
	}

	getTestAttachment(name: string): Locator {
		return this.getComposerFrame('test').getByText(name, { exact: true });
	}

	async removeTestAttachment(): Promise<void> {
		await this.getPreviewDock().getByTestId('chat-file-remove').click();
	}

	async isComposerScrollable(mode: 'build' | 'test'): Promise<boolean> {
		return await this.getComposer(mode).evaluate(
			(element) => element.scrollHeight > element.clientHeight,
		);
	}

	async getComposerTextInset(mode: 'build' | 'test') {
		const frame = await this.getComposerFrame(mode).boundingBox();
		if (!frame) throw new Error('The composer is not visible');
		return await this.getComposer(mode).evaluate((textarea, bounds) => {
			const rect = textarea.getBoundingClientRect();
			const style = getComputedStyle(textarea);
			return {
				top: rect.top + Number.parseFloat(style.paddingTop) - bounds.y,
				left: rect.left + Number.parseFloat(style.paddingLeft) - bounds.x,
			};
		}, frame);
	}

	async dismissBuildAgentAttachment(): Promise<void> {
		await this.getAssistantChat().getByTestId('instance-ai-handoff-context-chip-dismiss').click();
	}

	getOpenChatButton(): Locator {
		return this.page.locator('[data-testid="agent-builder-show-chat"]');
	}

	getCloseChatButton(mode: 'build' | 'test'): Locator {
		return mode === 'build'
			? this.getAssistantChat().getByTestId('instance-ai-embed-close')
			: this.getPreviewDock().locator('[data-testid="agent-preview-close-btn"]');
	}

	getLayout(): Locator {
		return this.page.locator('[data-testid="agent-builder-layout"]');
	}

	getModeSelector(): Locator {
		return this.page.locator('[data-testid="agent-builder-chat-mode"]:visible');
	}

	getDisclaimer(mode: 'build' | 'test'): Locator {
		return (mode === 'build' ? this.getAssistantChat() : this.getPreviewDock()).locator(
			'[data-testid="agent-builder-chat-disclaimer"]',
		);
	}

	getComposerActions(mode: 'build' | 'test'): Locator {
		return (mode === 'build' ? this.getAssistantChat() : this.getPreviewDock()).locator(
			'[data-test-id="instance-ai-send-button"], [data-test-id="chat-input-voice-button"]',
		);
	}

	async getComposerLayout(mode: 'build' | 'test') {
		const composer = await this.getComposer(mode).boundingBox();
		if (!composer) throw new Error('The composer is not visible');
		const controls = [this.getModeSelector(), ...(await this.getComposerActions(mode).all())];
		const controlBounds = await Promise.all(
			controls.map(async (control) => {
				const bounds = await control.boundingBox();
				if (!bounds) throw new Error('The composer control is not visible');
				return bounds;
			}),
		);
		return { composer, controls: controlBounds };
	}

	getChatResizeHandle(): Locator {
		return this.page.locator('[data-testid="agent-ai-dock"] [data-dir="right"]');
	}

	async resizeConfiguration(width: number): Promise<void> {
		const handle = await this.getChatResizeHandle().boundingBox();
		const configuration = await this.getConfiguration().boundingBox();
		if (!handle || !configuration) throw new Error('The builder panels are not visible');

		const x = handle.x + handle.width / 2;
		const y = handle.y + handle.height / 2;
		await this.page.mouse.move(x, y);
		await this.page.mouse.down();
		await this.page.mouse.move(x + configuration.width - width, y, { steps: 10 });
		await this.page.mouse.up();
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
