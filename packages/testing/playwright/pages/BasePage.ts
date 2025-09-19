import type { Page } from '@playwright/test';

export abstract class BasePage {
	constructor(protected readonly page: Page) {}

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
}
