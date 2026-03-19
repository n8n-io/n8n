import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class InstanceAiCanvasPanelPage extends BasePage {
	// #region Getters

	getPanel(): Locator {
		return this.page.getByTestId('instance-ai-canvas-panel');
	}

	getCloseButton(): Locator {
		return this.page.getByTestId('instance-ai-canvas-panel-close');
	}

	getThreadPickerTrigger(): Locator {
		return this.page.getByTestId('instance-ai-thread-picker-trigger');
	}

	getThreadPickerDropdown(): Locator {
		return this.page.getByTestId('instance-ai-thread-picker-dropdown');
	}

	getGlobalThreadItem(): Locator {
		return this.page.getByTestId('instance-ai-thread-picker-global');
	}

	getThreadItems(): Locator {
		return this.page.getByTestId('instance-ai-thread-picker-item');
	}

	getUserMessages(): Locator {
		return this.page.getByTestId('instance-ai-user-message');
	}

	getAssistantMessages(): Locator {
		return this.page.getByTestId('instance-ai-assistant-message');
	}

	getEmptyState(): Locator {
		return this.page.getByTestId('instance-ai-empty-state');
	}

	getCanvasAiButton(): Locator {
		return this.page.getByTestId('ask-assistant-canvas-action-button');
	}

	// #endregion

	// #region Actions

	async openPanel(): Promise<void> {
		await this.getCanvasAiButton().click();
		await this.getPanel().waitFor({ state: 'visible' });
	}

	async closePanel(): Promise<void> {
		await this.getCloseButton().click();
	}

	async openThreadPicker(): Promise<void> {
		await this.getThreadPickerTrigger().click();
		await this.getThreadPickerDropdown().waitFor({ state: 'visible' });
	}

	// #endregion
}
