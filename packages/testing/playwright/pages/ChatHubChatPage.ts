import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { ChatHubCredentialModal } from './components/ChatHubCredentialModal';
import { ChatHubPersonalAgentModal } from './components/ChatHubPersonalAgentModal';
import { ChatHubSidebar } from './components/ChatHubSidebar';
import { ChatHubToolsModal } from './components/ChatHubToolsModal';

export class ChatHubChatPage extends BasePage {
	readonly sidebar = new ChatHubSidebar(this.page.locator('#sidebar'));
	readonly toolsModal = new ChatHubToolsModal(this.page.getByTestId('toolsSelectorModal-modal'));
	readonly credModal = new ChatHubCredentialModal(
		this.page.getByTestId('chatCredentialSelectorModal-modal'),
	);
	readonly personalAgentModal = new ChatHubPersonalAgentModal(
		this.page.getByTestId('agentEditorModal-modal'),
	);

	constructor(page: Page) {
		super(page);
	}

	getGreetingMessage(): Locator {
		return this.page.getByRole('heading', { level: 2 });
	}

	getWelcomeStartNewChatButton(): Locator {
		return this.page.getByTestId('welcome-start-new-chat');
	}

	async dismissWelcomeScreen(): Promise<void> {
		// Wait for conversation list to load (indicates sessions are ready)
		const conversationList = this.sidebar.getConversations();
		await this.page.getByTestId('chat-conversation-list').waitFor({ state: 'visible' });

		// Only dismiss welcome screen if there are no existing conversations
		const conversationCount = await conversationList.count();
		if (conversationCount === 0) {
			const welcomeButton = this.getWelcomeStartNewChatButton();
			await welcomeButton.click();
			await welcomeButton.waitFor({ state: 'hidden' });
		}
	}

	getModelSelectorButton(): Locator {
		return this.page.getByTestId('chat-model-selector');
	}

	getSelectedCredentialName(): Locator {
		return this.getModelSelectorButton().locator('span.n8n-text').first();
	}

	getChatInput(): Locator {
		return this.page.locator('form').getByRole('textbox');
	}

	getSendButton(): Locator {
		return this.page.getByTitle('Send');
	}

	getChatMessages(): Locator {
		return this.page.locator('[data-message-id]');
	}

	getEditButtonAt(index: number): Locator {
		return this.getChatMessages().nth(index).getByTestId('chat-message-edit');
	}

	getEditorAt(index: number): Locator {
		return this.getChatMessages().nth(index).getByRole('textbox');
	}

	getSendButtonAt(index: number): Locator {
		return this.getChatMessages().nth(index).getByText('Send');
	}

	getRegenerateButtonAt(index: number): Locator {
		return this.getChatMessages().nth(index).getByTestId('chat-message-regenerate');
	}

	getPrevAlternativeButtonAt(index: number): Locator {
		return this.getChatMessages().nth(index).getByTestId('chat-message-prev-alternative');
	}

	getNextAlternativeButtonAt(index: number): Locator {
		return this.getChatMessages().nth(index).getByTestId('chat-message-next-alternative');
	}

	async clickEditButtonAt(index: number): Promise<void> {
		await this.hoverMessageActionsAt(index);
		await this.getEditButtonAt(index).click({ force: true });
	}

	async clickRegenerateButtonAt(index: number): Promise<void> {
		await this.hoverMessageActionsAt(index);
		await this.getRegenerateButtonAt(index).click({ force: true });
	}

	async clickPrevAlternativeButtonAt(index: number): Promise<void> {
		await this.hoverMessageActionsAt(index);
		await this.getPrevAlternativeButtonAt(index).click({ force: true });
	}

	async clickNextAlternativeButtonAt(index: number): Promise<void> {
		await this.hoverMessageActionsAt(index);
		await this.getNextAlternativeButtonAt(index).click({ force: true });
	}

	/**
	 * Hovers over the message content area to reveal hidden action buttons.
	 * The action buttons are hidden by CSS until the content area is hovered.
	 */
	private async hoverMessageActionsAt(index: number): Promise<void> {
		const message = this.getChatMessages().nth(index);
		await message.hover();
		await message.getByTestId('chat-message-actions').waitFor({ state: 'visible' });
	}

	getAttachButton(): Locator {
		return this.page.getByRole('button', { name: /attach/i });
	}

	getFileInput(): Locator {
		return this.page.locator('input[type="file"]');
	}

	getAttachmentsAt(messageIndex: number): Locator {
		return this.getChatMessages().nth(messageIndex).locator('.chat-file');
	}

	getToolsButton(): Locator {
		return this.page.getByTestId('chat-tools-button');
	}

	getOpenWorkflowButton(): Locator {
		return this.page.getByRole('button', { name: /open workflow/i });
	}

	async clickOpenWorkflowButton(): Promise<Page> {
		const newPagePromise = this.page.context().waitForEvent('page');

		await this.getOpenWorkflowButton().click();

		const workflowPage = await newPagePromise;

		await workflowPage.waitForLoadState();
		return workflowPage;
	}

	async openAttachmentAt(messageIndex: number, attachmentIndex: number): Promise<Page> {
		const [newPage] = await Promise.all([
			this.page.context().waitForEvent('page'),
			this.getAttachmentsAt(messageIndex).nth(attachmentIndex).click(),
		]);

		await newPage.waitForLoadState('load');

		return newPage;
	}
}
