import type { Locator, Page } from '@playwright/test';

export class NotificationsPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	/**
	 * Gets the main container locator for a notification by searching in its title text.
	 * @param text The text or a regular expression to find within the notification's title.
	 * @returns A Locator for the notification container element.
	 */
	getNotificationByTitle(text: string | RegExp): Locator {
		return this.page.getByRole('alert').filter({
			has: this.page.locator('.el-notification__title').filter({ hasText: text }),
		});
	}

	/**
	 * Gets the main container locator for a notification by searching in its content/body text.
	 * This is useful for finding notifications where the detailed message is in the content
	 * rather than the title (e.g., error messages with detailed descriptions).
	 * @param text The text or a regular expression to find within the notification's content.
	 * @returns A Locator for the notification container element.
	 */
	getNotificationByContent(text: string | RegExp): Locator {
		return this.page.getByRole('alert').filter({
			has: this.page.locator('.el-notification__content').filter({ hasText: text }),
		});
	}

	/**
	 * Gets the main container locator for a notification by searching in both title and content.
	 * This is the most flexible method as it will find notifications regardless of whether
	 * the text appears in the title or content section.
	 * @param text The text or a regular expression to find within the notification's title or content.
	 * @returns A Locator for the notification container element.
	 */
	getNotificationByTitleOrContent(text: string | RegExp): Locator {
		return this.page.getByRole('alert').filter({ hasText: text });
	}

	/**
	 * Clicks the close button on the FIRST notification matching the text.
	 * Fast execution with short timeouts for snappy notifications.
	 * @param text The text of the notification to close.
	 * @param options Optional configuration
	 */
	async closeNotificationByText(
		text: string | RegExp,
		options: { timeout?: number } = {},
	): Promise<boolean> {
		const { timeout = 2000 } = options;

		try {
			const notification = this.getNotificationByTitle(text).first();
			await notification.waitFor({ state: 'visible', timeout });

			const closeBtn = notification.locator('.el-notification__closeBtn');
			await closeBtn.click({ timeout: 500 });

			// Quick check that it's gone - don't wait long
			await notification.waitFor({ state: 'hidden', timeout: 1000 });
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Wait for a notification to appear with specific text.
	 * Reasonable timeout for waiting, but still faster than before.
	 * @param text The text to search for in notification title.
	 * @param options Optional configuration
	 */
	async waitForNotification(
		text: string | RegExp,
		options: { timeout?: number } = {},
	): Promise<boolean> {
		const { timeout = 5000 } = options;

		try {
			const notification = this.getNotificationByTitle(text).first();
			await notification.waitFor({ state: 'visible', timeout });
			return true;
		} catch {
			return false;
		}
	}

	// Wait for notification and then close it
	async waitForNotificationAndClose(
		text: string | RegExp,
		options: { timeout?: number } = {},
	): Promise<boolean> {
		const { timeout = 3000 } = options;
		const isVisible = await this.waitForNotification(text, { timeout });
		if (!isVisible) {
			return false;
		}
		return await this.closeNotificationByText(text, { timeout });
	}

	/**
	 * Get all visible notification texts.
	 * @returns Array of notification title texts
	 */
	async getAllNotificationTexts(): Promise<string[]> {
		try {
			const titles = this.page.getByRole('alert').locator('.el-notification__title');
			return await titles.allTextContents();
		} catch {
			return [];
		}
	}

	/**
	 * Nuclear option: Close everything as fast as possible.
	 * No waiting, no error handling, just close and move on.
	 */
	async quickCloseAll(): Promise<void> {
		try {
			const closeButtons = this.page.locator('.el-notification__closeBtn');
			const count = await closeButtons.count();

			for (let i = 0; i < count; i++) {
				try {
					await closeButtons.nth(i).click({ timeout: 100 });
				} catch {
					// Continue silently
				}
			}
		} catch {
			// Silent fail
		}
	}

	getErrorNotifications(): Locator {
		return this.page.locator('.el-notification:has(.el-notification--error)');
	}

	getSuccessNotifications(): Locator {
		return this.page.locator('.el-notification:has(.el-notification--success)');
	}

	getWarningNotifications(): Locator {
		return this.page.locator('.el-notification:has(.el-notification--warning)');
	}
}
