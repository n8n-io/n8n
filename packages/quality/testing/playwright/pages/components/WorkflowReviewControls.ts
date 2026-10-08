import type { Locator } from '@playwright/test';

import { BasePage } from '../BasePage';

/** The review surfaces on the workflow editor header, as an author sees them. */
export class WorkflowReviewControls extends BasePage {
	/** Only present while a review is open on this workflow. */
	getStatusPill(): Locator {
		return this.page.getByTestId('workflow-review-status-pill');
	}

	getPublishChoiceDialog(): Locator {
		return this.page.getByTestId('workflow-publish-choice-dialog');
	}

	async chooseSubmitForReview(): Promise<void> {
		await this.clickByTestId('workflow-submit-for-review-choice-button');
	}

	/** Ends by dismissing the confirmation dialog, so the canvas is usable again. */
	async submitForReview(options: {
		versionName: string;
		title: string;
		reviewerEmail: string;
	}): Promise<void> {
		await this.page.getByTestId('workflow-submit-for-review-dialog').waitFor({ state: 'visible' });
		await this.fillByTestId('workflow-review-version-name-input', options.versionName);
		await this.clickByTestId('workflow-review-next-button');

		await this.fillByTestId('workflow-review-title-input', options.title);
		await this.selectReviewer(options.reviewerEmail);

		await Promise.all([
			this.waitForRestResponse('/rest/workflow-review-requests', 'POST'),
			this.clickByTestId('workflow-review-submit-button'),
		]);

		await this.clickByTestId('workflow-review-submitted-got-it-button');
	}

	/** Adds the currently saved version to the open review. */
	async submitChangesToReview(versionName: string): Promise<void> {
		await this.getStatusPill().click();
		await this.clickByTestId('workflow-review-submit-changes-button');

		await this.page.getByTestId('workflow-update-review-dialog').waitFor({ state: 'visible' });
		await this.fillByTestId('workflow-update-review-version-name-input', versionName);
		await this.clickByTestId('workflow-update-review-next-button');

		await Promise.all([
			this.waitForRestResponse('/update-version', 'POST'),
			this.clickByTestId('workflow-update-review-submit-button'),
		]);
	}

	private async selectReviewer(email: string): Promise<void> {
		await this.clickByTestId('workflow-review-reviewer-select');
		// The list filters as you type, so the full email narrows it to one option
		await this.page.getByTestId('workflow-review-reviewer-select').locator('input').fill(email);
		await this.getVisiblePopoverOption().filter({ hasText: email }).click();
	}
}
