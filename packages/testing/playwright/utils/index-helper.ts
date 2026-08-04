import type { Locator } from '@playwright/test';

/**
 * Returns a locator for a specific element by index, or the original locator if no index is provided.
 * Without an index, Playwright throws an error when multiple matching elements are found.
 * @see https://playwright.dev/docs/locators#strictness
 */
export function locatorByIndex(locator: Locator, index?: number) {
	return typeof index === 'number' ? locator.nth(index) : locator;
}
