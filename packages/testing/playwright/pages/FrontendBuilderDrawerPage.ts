import type { FrameLocator, Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class FrontendBuilderDrawerPage extends BasePage {
	getDrawer(): Locator {
		return this.page.getByTestId('frontend-builder-drawer');
	}

	getPromptInput(): Locator {
		return this.page.getByTestId('frontend-builder-prompt');
	}

	getSendButton(): Locator {
		return this.page.getByTestId('frontend-builder-send');
	}

	private getPreviewIframe(): FrameLocator {
		return this.page.frameLocator('iframe[title="Generated frontend preview"]');
	}

	getPreviewElementByTestId(testId: string): Locator {
		return this.getPreviewIframe().getByTestId(testId);
	}

	async sendPrompt(prompt: string): Promise<void> {
		await this.getPromptInput().fill(prompt);
		await this.getSendButton().click();
	}
}
