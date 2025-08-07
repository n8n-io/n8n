import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const getActivationModal = (page: Page) => page.getByTestId('activation-modal');

export const closeActivationModal = async (page: Page) => {
	await expect(getActivationModal(page)).toBeVisible();

	// click checkbox so it does not show again
	await getActivationModal(page).getByText("Don't show again").click();

	// confirm modal
	await getActivationModal(page).getByRole('button', { name: 'Got it' }).click();
};
