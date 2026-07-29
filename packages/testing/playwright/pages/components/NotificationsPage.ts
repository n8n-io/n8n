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
	 * Gets an action element (e.g. a link/button) within a notification matched by title or content.
	 * @param text The text or regular expression to find the notification.
	 * @param actionLabel The text or regular expression of the action element inside the notification.
	 * @returns A Locator for the action element.
	 */
	getNotificationAction(text: string | RegExp, actionLabel: string | RegExp): Locator {
		return this.getNotificationByTitleOrContent(text).getByText(actionLabel);
	}

	/**
	 * Clicks the close button on the FIRST notification matching the text.
	 * Throws if the notification is still on screen afterwards - a toast left
	 * open covers the top-right of the app and intercepts later clicks.
	 * @param text The text of the notification to close.
	 * @param options Optional configuration
	 */
	async closeNotificationByText(
		text: string | RegExp,
		options: { timeout?: number } = {},
	): Promise<void> {
		const { timeout = 2000 } = options;
		const notification = this.getNotificationByTitle(text).first();

		try {
			await notification.locator('.el-notification__closeBtn').click({ timeout });
		} catch {
			// It may have auto-dismissed; the hidden check below is the real contract.
		}

		await notification.waitFor({ state: 'hidden', timeout });
	}

	/**
	 * Wait for a notification to appear with specific text. Throws if it never shows -
	 * callers use this as a synchronisation point, so a silent miss lets the test run
	 * on against unfinished state and fail later with a misleading error.
	 * @param text The text to search for in notification title.
	 * @param options Optional configuration
	 */
	async waitForNotification(
		text: string | RegExp,
		options: { timeout?: number } = {},
	): Promise<void> {
		const { timeout = 5000 } = options;
		await this.getNotificationByTitle(text).first().waitFor({ state: 'visible', timeout });
	}

	// Wait for notification and then close it
	async waitForNotificationAndClose(
		text: string | RegExp,
		options: { timeout?: number } = {},
	): Promise<void> {
		const { timeout = 3000 } = options;
		await this.waitForNotification(text, { timeout });
		await this.closeNotificationByText(text, { timeout });
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

	getModalOverlay(): Locator {
		return this.page.locator('.el-overlay').first();
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
