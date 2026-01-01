import type { Page } from '@playwright/test';

export class ClipboardHelper {
	constructor(private readonly page: Page) {}

	/**
	 * Grant clipboard permissions
	 * @param mode - Permission mode: 'read', 'write', or 'readwrite' (default)
	 */
	async grant(mode: 'read' | 'write' | 'readwrite' = 'readwrite'): Promise<void> {
		let permissions = ['clipboard-read', 'clipboard-write'];

		if (mode === 'read') {
			permissions = ['clipboard-read'];
		} else if (mode === 'write') {
			permissions = ['clipboard-write'];
		}

		await this.page.context().grantPermissions(permissions);
	}

	/**
	 * Write text to clipboard using page.evaluate.
	 * @param text - The text to write to clipboard
	 */
	async writeText(text: string): Promise<void> {
		await this.page.evaluate(async (data) => {
			await navigator.clipboard.writeText(data);
		}, text);
	}

	/**
	 * Write text to clipboard and simulate paste keyboard action.
	 * @param text - The text to write to clipboard and paste
	 */
	async paste(text: string): Promise<void> {
		await this.grant();
		await this.writeText(text);
		await this.page.keyboard.press('ControlOrMeta+V');
	}

	/**
	 * Read text from clipboard using page.evaluate.
	 * @returns The text from clipboard
	 */
	async readText(): Promise<string> {
		return await this.page.evaluate(() => navigator.clipboard.readText());
	}
}
