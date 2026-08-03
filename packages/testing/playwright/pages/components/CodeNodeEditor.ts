import type { Locator, Page } from '@playwright/test';

/**
 * Page object for the Code-node editor surface.
 *
 * Cohesive cluster spanning three render targets:
 *   - in-NDV roots: the Code / Ask-AI tabs (`code-node-tab-code`,
 *     `code-node-tab-ai`), the Ask-AI CTA + prompt, the
 *     `code-editor-fullscreen-button` and the in-NDV CodeMirror editor for the
 *     `jsCode` parameter
 *   - teleported overlays resolved through the derived `Page`: Ask-AI CTA
 *     tooltips (`ask-ai-cta-tooltip-*`) and the CodeMirror lint tooltip
 *     (`.cm-tooltip-lint`)
 *   - teleported fullscreen code editor (`code-editor-fullscreen`). Its hosting
 *     `.el-dialog` shell is owned by `BaseModal` / `dialogLocators`; this
 *     component scopes only to its own teleport root.
 *
 * @example
 * // Inside a hosting page object
 * readonly codeNodeEditor = new CodeNodeEditor(this.container);
 *
 * // Inside a test
 * await n8n.ndv.clickAskAiTab();
 * await n8n.ndv.getAskAiPromptInput().fill('Some prompt');
 */
export class CodeNodeEditor {
	private readonly page: Page;

	constructor(private readonly root: Locator) {
		this.page = root.page();
	}

	// --- Code tab ---

	getCodeTabPanel(): Locator {
		return this.root.getByTestId('code-node-tab-code');
	}

	getCodeTab(): Locator {
		return this.root.locator('#tab-code');
	}

	/** In-NDV CodeMirror editor for the `jsCode` parameter. */
	getCodeEditor(): Locator {
		return this.getJsCodeParameter().locator('.cm-content');
	}

	getLintErrors(): Locator {
		return this.getJsCodeParameter().locator('.cm-lintRange-error');
	}

	/** CodeMirror lint tooltip (teleported to the page root). */
	getLintTooltip(): Locator {
		return this.page.locator('.cm-tooltip-lint');
	}

	// --- Ask-AI tab ---

	async clickAskAiTab(): Promise<void> {
		await this.root.locator('#tab-ask-ai').click();
	}

	getAskAiTabPanel(): Locator {
		return this.root.getByTestId('code-node-tab-ai');
	}

	getAskAiCtaButton(): Locator {
		return this.root.getByTestId('ask-ai-cta');
	}

	getAskAiPromptInput(): Locator {
		return this.root.getByTestId('ask-ai-prompt-input');
	}

	getAskAiPromptCounter(): Locator {
		return this.root.getByTestId('ask-ai-prompt-counter');
	}

	/** Teleported Ask-AI CTA tooltips. */
	getAskAiCtaTooltipNoInputData(): Locator {
		return this.page.getByTestId('ask-ai-cta-tooltip-no-input-data');
	}

	getAskAiCtaTooltipNoPrompt(): Locator {
		return this.page.getByTestId('ask-ai-cta-tooltip-no-prompt');
	}

	getAskAiCtaTooltipPromptTooShort(): Locator {
		return this.page.getByTestId('ask-ai-cta-tooltip-prompt-too-short');
	}

	// --- Ask-AI status / error text ---

	/** In-panel placeholder rendered inside the Ask-AI tab panel by `AskAI.vue`. */
	getHeyAiText(): Locator {
		return this.getAskAiTabPanel().getByText('Hey AI, generate JavaScript');
	}

	/** Toast — rendered by the global notification system and teleported to `document.body`. */
	getCodeGenerationCompletedText(): Locator {
		return this.page.getByText('Code generation completed');
	}

	/** Toast — rendered by the global notification system and teleported to `document.body`. */
	getErrorMessageText(message: string): Locator {
		return this.page.getByText(message);
	}

	// --- Fullscreen ---

	async openFullscreen(): Promise<void> {
		await this.root.getByTestId('code-editor-fullscreen-button').click();
	}

	/**
	 * Teleported fullscreen code editor (inside an `.el-dialog`). The dialog
	 * shell itself is owned by `BaseModal` / `dialogLocators` — see
	 * `NodeDetailsViewPage.getCodeEditorDialog`.
	 */
	getFullscreenEditor(): Locator {
		return this.page.getByTestId('code-editor-fullscreen').locator('.cm-content');
	}

	private getJsCodeParameter(): Locator {
		return this.root.getByTestId('parameter-input-jsCode');
	}
}
