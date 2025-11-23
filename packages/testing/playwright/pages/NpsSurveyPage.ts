import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

export class NpsSurveyPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	getNpsSurveyModal(): Locator {
		return this.page.getByTestId('nps-survey-modal');
	}

	getNpsSurveyRatings(): Locator {
		return this.page.getByTestId('nps-survey-ratings');
	}

	getNpsSurveyFeedback(): Locator {
		return this.page.getByTestId('nps-survey-feedback');
	}

	getNpsSurveySubmitButton(): Locator {
		return this.page.getByTestId('nps-survey-feedback-button');
	}

	getNpsSurveyCloseButton(): Locator {
		return this.getNpsSurveyModal().locator('button.el-drawer__close-btn');
	}

	getRatingButton(rating: number): Locator {
		return this.getNpsSurveyRatings().locator('button').nth(rating);
	}

	getFeedbackTextarea(): Locator {
		return this.getNpsSurveyFeedback().locator('textarea');
	}

	async clickRating(rating: number): Promise<void> {
		await this.getRatingButton(rating).click();
	}

	async fillFeedback(feedback: string): Promise<void> {
		await this.getFeedbackTextarea().fill(feedback);
	}

	async clickSubmitButton(): Promise<void> {
		await this.getNpsSurveySubmitButton().click();
	}

	async closeSurvey(): Promise<void> {
		await this.getNpsSurveyCloseButton().click();
	}

	async getRatingButtonCount(): Promise<number> {
		return await this.getNpsSurveyRatings().locator('button').count();
	}
}
