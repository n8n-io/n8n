import { BasePage } from './BasePage';

export class AIAssistantPage extends BasePage {
	/**
	 * Get the floating assistant button (used when feature is enabled)
	 */
	getAskAssistantFloatingButton() {
		return this.page.getByTestId('ask-assistant-floating-button');
	}

	/**
	 * Get the canvas action button for assistant (used when feature is enabled)
	 */
	getAskAssistantCanvasActionButton() {
		return this.page.getByTestId('ask-assistant-canvas-action-button');
	}

	/**
	 * Get the assistant chat sidebar
	 */
	getAskAssistantChat() {
		return this.page.getByTestId('ask-assistant-chat');
	}

	/**
	 * Get the placeholder message
	 */
	getPlaceholderMessage() {
		return this.page.getByTestId('placeholder-message');
	}

	/**
	 * Get the chat input field
	 */
	getChatInput() {
		return this.page.getByTestId('chat-input');
	}

	/**
	 * Get the send message button
	 */
	getSendMessageButton() {
		return this.page.getByTestId('send-message-button');
	}

	/**
	 * Get the close chat button
	 */
	getCloseChatButton() {
		return this.page.getByTestId('close-chat-button');
	}

	/**
	 * Get the assistant sidebar resizer
	 */
	getAskAssistantSidebarResizer() {
		return this.page
			.getByTestId('ask-assistant-sidebar')
			.locator('[class*="_resizer"][data-dir="left"]')
			.first();
	}

	/**
	 * Get the node error view assistant button
	 */
	getNodeErrorViewAssistantButton() {
		return this.page.getByTestId('node-error-view-ask-assistant-button').locator('button').first();
	}

	/**
	 * Get all chat messages
	 */
	getChatMessagesAll() {
		return this.page.locator('[data-test-id^="chat-message"]');
	}

	/**
	 * Get assistant chat messages
	 */
	getChatMessagesAssistant() {
		return this.page.getByTestId('chat-message-assistant');
	}

	/**
	 * Get user chat messages
	 */
	getChatMessagesUser() {
		return this.page.getByTestId('chat-message-user');
	}

	/**
	 * Get system chat messages
	 */
	getChatMessagesSystem() {
		return this.page.getByTestId('chat-message-system');
	}

	/**
	 * Get quick reply buttons
	 */
	getQuickReplyButtons() {
		return this.page.getByTestId('quick-replies').locator('button');
	}

	/**
	 * Get new assistant session modal
	 */
	getNewAssistantSessionModal() {
		return this.page.getByTestId('new-assistant-session-modal');
	}
}
