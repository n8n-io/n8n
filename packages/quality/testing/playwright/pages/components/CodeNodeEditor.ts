import type { Locator, Page } from '@playwright/test';

/**
 * Page object for the Code-node editor surface.
 *
 * Cohesive cluster spanning three render targets:
 *   - in-NDV roots: the `code-editor-fullscreen-button` and the in-NDV
 *     CodeMirror editor for the `jsCode` parameter
 *   - teleported overlays resolved through the derived `Page`: the CodeMirror
 *     lint tooltip (`.cm-tooltip-lint`)
 *   - teleported fullscreen code editor (`code-editor-fullscreen`). Its hosting
 *     `.el-dialog` shell is owned by `BaseModal` / `dialogLocators`; this
 *     component scopes only to its own teleport root.
 *
 * @example
 * // Inside a hosting page object
 * readonly codeNodeEditor = new CodeNodeEditor(this.container);
 *
 * // Inside a test
 * await n8n.ndv.getCodeEditor().fill('return items;');
 */
export class CodeNodeEditor {
	private readonly page: Page;

	constructor(private readonly root: Locator) {
		this.page = root.page();
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
