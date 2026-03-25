import type { Page } from '@playwright/test';

import { BaseModal } from './components/BaseModal';
import { FloatingUiHelper } from './components/FloatingUiHelper';

export abstract class BasePage extends FloatingUiHelper {
	protected readonly baseModal: BaseModal;

	constructor(protected readonly page: Page) {
		super(page);
		this.baseModal = new BaseModal(this.page);
	}

	protected async clickByTestId(testId: string) {
		await this.page.getByTestId(testId).click();
	}

	protected async fillByTestId(testId: string, value: string) {
		await this.page.getByTestId(testId).fill(value);
	}

	protected async clickByText(text: string) {
		await this.page.getByText(text).click();
	}

	protected async clickButtonByName(name: string) {
		await this.page.getByRole('button', { name }).click();
	}

	protected async waitForRestResponse(
		url: string | RegExp,
		method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
	) {
		if (typeof url === 'string') {
			return await this.page.waitForResponse((res) => {
				const matches = res.url().includes(url);
				return matches && (method ? res.request().method() === method : true);
			});
		}

		return await this.page.waitForResponse((res) => {
			const matches = url.test(res.url());
			return matches && (method ? res.request().method() === method : true);
		});
	}

	/**
	 * Wait for debounce to complete.
	 * Respects the N8N_DEBOUNCE_MULTIPLIER sessionStorage setting.
	 * With multiplier=0 (test mode), returns immediately.
	 * @param baseTime - Base debounce time in milliseconds (default: 150)
	 */
	protected async waitForDebounce(baseTime = 150): Promise<void> {
		const effectiveTime = await this.page.evaluate((time) => {
			const stored = sessionStorage.getItem('N8N_DEBOUNCE_MULTIPLIER');
			const multiplier = stored !== null ? parseFloat(stored) : 1;
			return Math.round(time * (Number.isNaN(multiplier) ? 1 : multiplier));
		}, baseTime);

		if (effectiveTime > 0) {
			// eslint-disable-next-line playwright/no-wait-for-timeout
			await this.page.waitForTimeout(effectiveTime);
		}
	}
}
