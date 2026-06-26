import { BasePage } from './BasePage';

export class AIAssistantPage extends BasePage {
	// #region Container

	get container() {
		return this.page.getByTestId('ask-assistant-sidebar');
	}

	// #endregion

	// #region Getters

	getAskAssistantFloatingButton() {
		return this.page.getByTestId('ask-assistant-floating-button');
	}

	getAskAssistantCanvasActionButton() {
		return this.page.getByTestId('ask-assistant-canvas-action-button');
	}

	getAskAssistantChat() {
		return this.container.getByTestId('ask-assistant-chat');
	}

	getAskAssistantSidebar() {
		return this.container;
	}

	getPlaceholderMessage() {
		return this.container.getByTestId('placeholder-message');
	}

	getChatInput() {
		// Try suggestions input first (shown when suggestions are visible),
		// fall back to regular input (shown when there are messages),
		// or the mention input (shown when focused nodes feature is enabled)
		const suggestionsInput = this.container
			.getByTestId('chat-suggestions-input')
			.locator('textarea');
		const regularInput = this.container.getByTestId('chat-input').locator('textarea');
		const mentionInput = this.container.getByTestId('chat-input-with-mention').locator('textarea');

		// Return the first one that's visible
		return suggestionsInput.or(regularInput).or(mentionInput);
	}

	getSendMessageButton() {
		return this.container.getByTestId('send-message-button');
	}

	getCloseChatButton() {
		return this.container.getByTestId('close-chat-button');
	}

	getAskAssistantSidebarResizer() {
		return this.container.locator('[class*="_resizer"][data-dir="left"]').first();
	}

	getNodeErrorViewAssistantButton() {
		return this.page.getByTestId('node-error-view-ask-assistant-button').locator('button').first();
	}

	getChatMessagesAll() {
		return this.container.locator('[data-test-id^="chat-message"]');
	}

	getChatMessagesAssistant() {
		return this.container.getByTestId('chat-message-assistant');
	}

	getChatMessagesUser() {
		return this.container.getByTestId('chat-message-user');
	}

	getChatMessagesSystem() {
		return this.container.getByTestId('chat-message-system');
	}

	getQuickReplyButtons() {
		return this.container.getByTestId('quick-replies').locator('button');
	}

	getNewAssistantSessionModal() {
		return this.page.getByTestId('new-assistant-session-modal');
	}

	getStartNewSessionButton() {
		return this.getNewAssistantSessionModal().getByRole('button', { name: 'Start new session' });
	}

	getCodeDiffs() {
		return this.container.getByTestId('code-diff-suggestion');
	}

	getApplyCodeDiffButtons() {
		return this.container.getByTestId('replace-code-button');
	}

	getUndoReplaceCodeButtons() {
		return this.container.getByTestId('undo-replace-button');
	}

	getCodeReplacedMessage() {
		return this.container.getByTestId('code-replaced-message');
	}

	getCredentialEditAssistantButton() {
		return this.page.getByTestId('credential-edit-ask-assistant-button');
	}

	getCodeSnippet() {
		return this.container.getByTestId('assistant-code-snippet-content');
	}

	// #endregion

	// #region Actions

	async sendMessage(
		message: string,
		method: 'send-message-button' | 'enter-key' = 'send-message-button',
	) {
		// Only type if there's a message to type (e.g., skip for pre-populated suggestion pills)
		if (message) {
			await this.getChatInput().pressSequentially(message, { delay: 20 });
		}
		if (method === 'enter-key') {
			await this.getChatInput().press('Enter');
		} else {
			await this.getSendMessageButton().click();
		}
	}

	async waitForStreamingComplete(options?: { timeout?: number }) {
		const timeout = options?.timeout ?? 60000;
		// Wait for at least one assistant message to appear (indicating streaming has produced output)
		await this.getChatMessagesAssistant().first().waitFor({ state: 'visible', timeout });
		// Wait for streaming to end by checking for the send button's arrow-up icon
		// During streaming, a stop button with filled-square icon is shown instead
		// After streaming, the send button with arrow-up icon appears
		await this.page.waitForFunction(
			() => {
				const sendButton = document.querySelector('[data-test-id="send-message-button"]');
				if (!sendButton) return false;
				// The arrow-up icon indicates the send button (not streaming)
				// The filled-square icon indicates the stop button (streaming)
				const sendIcon = sendButton.querySelector('[data-icon="arrow-up"]');
				return sendIcon !== null;
			},
			{ timeout },
		);
	}

	// #endregion
}
