import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Helper to open workflow settings modal
export const openWorkflowSettings = async (page: Page) => {
	await page.getByTestId('workflow-menu').click();
	await page.getByTestId('workflow-menu-item-settings').click();
	await expect(page.getByTestId('workflow-settings-dialog')).toBeVisible();
};
