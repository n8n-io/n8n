import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class InstanceAiPage extends BasePage {
	async goto(): Promise<void> {
		await this.page.goto('/instance-ai');
	}

	getChatInput(): Locator {
		return this.page.getByRole('textbox');
	}

	getSendButton(): Locator {
		return this.page.getByTestId('instance-ai-send-button');
	}

	getAssistantMessages(): Locator {
		return this.page.getByTestId('instance-ai-assistant-message');
	}

	getQuestionsPanel(): Locator {
		return this.page.getByTestId('instance-ai-questions');
	}

	getQuestionOptions(): Locator {
		return this.getQuestionsPanel().getByRole('button');
	}

	getQuestionsNextButton(): Locator {
		return this.page.getByTestId('instance-ai-questions-next');
	}

	getConfirmApproveButton(): Locator {
		return this.page.getByTestId('instance-ai-panel-confirm-approve');
	}

	getPreviewIframe() {
		return this.page.getByTestId('workflow-preview-iframe').contentFrame();
	}

	getPreviewCanvasNodes(): Locator {
		return this.getPreviewIframe().locator('[data-test-id="canvas-node"]');
	}

	getPreviewRunningNodes(): Locator {
		return this.getPreviewIframe().locator(
			'[data-test-id="canvas-node"].running, [data-test-id="canvas-node"].waiting',
		);
	}

	getPreviewSuccessIndicators(): Locator {
		return this.getPreviewIframe().locator('[data-test-id="canvas-node-status-success"]');
	}
}
