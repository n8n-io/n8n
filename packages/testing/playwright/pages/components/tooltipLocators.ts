import type { Locator, Page } from '@playwright/test';

/** Returns the currently-visible `N8nTooltip` content bubble, if any. */
export function getVisibleTooltip(page: Page): Locator {
	return page.getByTestId('tooltip-content').filter({ visible: true });
}
