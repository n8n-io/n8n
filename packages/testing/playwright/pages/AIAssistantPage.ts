import { BasePage } from './BasePage';

export class AIAssistantPage extends BasePage {
	// #region Getters

	getAskAssistantFloatingButton() {
		return this.page.getByTestId('ask-assistant-floating-button');
	}

	getAskAssistantCanvasActionButton() {
		return this.page.getByTestId('ask-assistant-canvas-action-button');
	}

	getAskAssistantChat() {
		return this.page.getByTestId('ask-assistant-chat');
	}

	getAskAssistantSidebar() {
		return this.page.getByTestId('ask-assistant-sidebar');
	}

	getPlaceholderMessage() {
		return this.page.getByTestId('placeholder-message');
	}

	getChatInput() {
		return this.page.getByTestId('chat-input').locator('textarea');
	}

	getSendMessageButton() {
		return this.page.getByTestId('send-message-button');
	}

	getCloseChatButton() {
		return this.page.getByTestId('close-chat-button');
	}

	getAskAssistantSidebarResizer() {
		return this.getAskAssistantSidebar().locator('[class*="_resizer"][data-dir="left"]').first();
	}

	getNodeErrorViewAssistantButton() {
		return this.page.getByTestId('node-error-view-ask-assistant-button').locator('button').first();
	}

	getChatMessagesAll() {
		return this.page.locator('[data-test-id^="chat-message"]');
	}

	getChatMessagesAssistant() {
		return this.page.getByTestId('chat-message-assistant');
	}

	getChatMessagesUser() {
		return this.page.getByTestId('chat-message-user');
	}

	getChatMessagesSystem() {
		return this.page.getByTestId('chat-message-system');
	}

	getQuickReplyButtons() {
		return this.page.getByTestId('quick-replies').locator('button');
	}

	getQuickReplies() {
		return this.page.getByTestId('quick-replies');
	}

	getNewAssistantSessionModal() {
		return this.page.getByTestId('new-assistant-session-modal');
	}

	getCodeDiffs() {
		return this.page.getByTestId('code-diff-suggestion');
	}

	getApplyCodeDiffButtons() {
		return this.page.getByTestId('replace-code-button');
	}

	getUndoReplaceCodeButtons() {
		return this.page.getByTestId('undo-replace-button');
	}

	getCodeReplacedMessage() {
		return this.page.getByTestId('code-replaced-message');
	}

	getCredentialEditAssistantButton() {
		return this.page.getByTestId('credential-edit-ask-assistant-button');
	}

	getCodeSnippet() {
		return this.page.getByTestId('assistant-code-snippet-content');
	}

	getWorkflowSuggestions() {
		return this.page.getByTestId('workflow-suggestions');
	}

	getSuggestionPills() {
		// Get buttons within the pills container section, not the prompt input section
		return this.getWorkflowSuggestions()
			.locator('section[aria-label="Workflow suggestions"]')
			.getByRole('button');
	}

	getCanvasBuildWithAIButton() {
		return this.page.getByTestId('canvas-build-with-ai-button');
	}

	// #endregion

	// #region Actions

	async sendMessage(
		message: string,
		method: 'send-message-button' | 'enter-key' = 'send-message-button',
	) {
		await this.getChatInput().pressSequentially(message, { delay: 20 });
		if (method === 'enter-key') {
			await this.getChatInput().press('Enter');
		} else {
			await this.getSendMessageButton().click();
		}
	}

	async clickSuggestionByText(text: string) {
		await this.getSuggestionPills().filter({ hasText: text }).first().click();
	}

	async waitForStreamingComplete(options?: { timeout?: number }) {
		const timeout = options?.timeout ?? 60000;
		// Wait for at least one assistant message to appear (indicating streaming has produced output)
		// and ensure the send button is re-enabled (indicating streaming is complete)
		await this.getChatMessagesAssistant().first().waitFor({ state: 'visible', timeout });
		await this.page.waitForFunction(
			() => {
				const sendButton = document.querySelector(
					'[data-test-id="send-message-button"]',
				) as HTMLButtonElement;
				return sendButton && !sendButton.disabled;
			},
			{ timeout: 10000 },
		);
	}

	// #endregion
}
