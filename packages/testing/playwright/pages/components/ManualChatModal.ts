import type { Locator } from '@playwright/test';

/**
 * Component for the manual chat modal (the embedded `canvas-chat` panel).
 *
 * @example
 * // Include in a page
 * class ExamplePage {
 *   readonly manualChat = new ManualChatModal(this.page.getByTestId('canvas-chat'));
 * }
 *
 * // Usage in a test
 * await n8n.canvas.manualChat.sendMessage('Hello');
 */
export class ManualChatModal {
	constructor(private root: Locator) {}

	/**
	 * The modal root (`canvas-chat`).
	 */
	get(): Locator {
		return this.root;
	}

	getBody(): Locator {
		return this.root.getByTestId('canvas-chat-body');
	}

	getInput(): Locator {
		return this.root.locator('.chat-inputs textarea');
	}

	getMessages(): Locator {
		return this.root.locator('.chat-messages-list .chat-message');
	}

	getLatestBotMessage(): Locator {
		return this.root.locator('.chat-messages-list .chat-message.chat-message-from-bot').last();
	}

	getApproveButton(): Locator {
		return this.root.getByText('Approve');
	}

	getSessionIdButton(): Locator {
		return this.root.getByTestId('chat-session-id');
	}

	getRefreshSessionButton(): Locator {
		return this.root.getByTestId('refresh-session-button');
	}

	async sendMessage(message: string): Promise<void> {
		await this.getInput().fill(message);
		await this.root.locator('.chat-input-send-button').click();
	}
}
