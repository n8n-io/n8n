import type { Locator, Page } from '@playwright/test';

export class NotificationsPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	/**
	 * Gets the main container locator for a notification by its visible text.
	 * @param text The text or a regular expression to find within the notification's title.
	 * @returns A Locator for the notification container element.
	 */
	notificationContainerByText(text: string | RegExp): Locator {
		return this.page.getByRole('alert').filter({
			has: this.page.locator('.el-notification__title').filter({ hasText: text }),
		});
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
			const notification = this.notificationContainerByText(text).first();
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
	 * Closes ALL currently visible notifications that match the given text.
	 * Uses aggressive polling for fast cleanup.
	 * @param text The text of the notifications to close.
	 * @param options Optional configuration
	 */
	async closeAllNotificationsWithText(
		text: string | RegExp,
		options: { timeout?: number; maxRetries?: number } = {},
	): Promise<number> {
		const { timeout = 1500, maxRetries = 15 } = options;
		let closedCount = 0;
		let retries = 0;

		while (retries < maxRetries) {
			try {
				const notifications = this.notificationContainerByText(text);
				const count = await notifications.count();

				if (count === 0) {
					break;
				}

				// Close the first visible notification quickly
				const firstNotification = notifications.first();
				if (await firstNotification.isVisible({ timeout: 200 })) {
					const closeBtn = firstNotification.locator('.el-notification__closeBtn');
					await closeBtn.click({ timeout: 300 });

					// Brief wait for disappearance, then continue
					await firstNotification.waitFor({ state: 'hidden', timeout: 500 }).catch(() => {});
					closedCount++;
				} else {
					// If not visible, likely already gone
					break;
				}
			} catch (error) {
				// Continue quickly on any error
				break;
			}

			retries++;
		}

		return closedCount;
	}

	/**
	 * Check if a notification is visible based on text.
	 * Fast check with short timeout.
	 * @param text The text to search for in notification title.
	 * @param options Optional configuration
	 */
	async isNotificationVisible(
		text: string | RegExp,
		options: { timeout?: number } = {},
	): Promise<boolean> {
		const { timeout = 500 } = options;

		try {
			const notification = this.notificationContainerByText(text).first();
			await notification.waitFor({ state: 'visible', timeout });
			return true;
		} catch {
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
			const notification = this.notificationContainerByText(text).first();
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
		await this.waitForNotification(text, { timeout });
		await this.closeNotificationByText(text, { timeout });
		return true;
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
	 * Wait for all notifications to disappear.
	 * Fast check with short timeout.
	 * @param options Optional configuration
	 */
	async waitForAllNotificationsToDisappear(options: { timeout?: number } = {}): Promise<boolean> {
		const { timeout = 2000 } = options;

		try {
			// Wait for no alerts to be visible
			await this.page.getByRole('alert').first().waitFor({
				state: 'detached',
				timeout,
			});
			return true;
		} catch {
			// Check if any are still visible
			const count = await this.getNotificationCount();
			return count === 0;
		}
	}

	/**
	 * Get the count of visible notifications.
	 * @param text Optional text to filter notifications
	 */
	async getNotificationCount(text?: string | RegExp): Promise<number> {
		try {
			const notifications = text
				? this.notificationContainerByText(text)
				: this.page.getByRole('alert');
			return await notifications.count();
		} catch {
			return 0;
		}
	}

	/**
	 * Quick utility to close any notification and continue.
	 * Uses the most aggressive timeouts for maximum speed.
	 * @param text The text of the notification to close.
	 */
	async quickClose(text: string | RegExp): Promise<void> {
		try {
			const notification = this.notificationContainerByText(text).first();
			if (await notification.isVisible({ timeout: 100 })) {
				await notification.locator('.el-notification__closeBtn').click({ timeout: 200 });
			}
		} catch {
			// Silent fail for speed
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
}
