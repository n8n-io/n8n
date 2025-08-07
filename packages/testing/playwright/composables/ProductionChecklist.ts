import type { Page } from '@playwright/test';

export const getSuggestedActionsButton = (page: Page) => page.getByTestId('suggested-action-count');
export const getSuggestedActionItem = (page: Page, text?: string) => {
	const items = page.getByTestId('suggested-action-item');
	if (text) {
		return items.getByText(text);
	}
	return items;
};
export const getSuggestedActionsPopover = (page: Page) =>
	page.locator('[data-reka-popper-content-wrapper=""]').filter({ hasText: /./ });

export const getErrorActionItem = (page: Page) =>
	getSuggestedActionItem(page, 'Set up error notifications');

export const getTimeSavedActionItem = (page: Page) =>
	getSuggestedActionItem(page, 'Track time saved');

export const getEvaluationsActionItem = (page: Page) =>
	getSuggestedActionItem(page, 'Test reliability of AI steps');

export const getIgnoreAllButton = (page: Page) => page.getByTestId('suggested-action-ignore-all');
