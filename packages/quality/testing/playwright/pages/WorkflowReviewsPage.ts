import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/** Reviews in the shared Inbox, with their activity and decisions. */
export class WorkflowReviewsPage extends BasePage {
	async goto(): Promise<void> {
		await this.page.goto('/inbox');
		await this.page.getByTestId('inbox-view').waitFor({ state: 'visible' });
	}

	getRequestRow(title: string): Locator {
		return this.page.getByTestId('inbox-row').filter({ hasText: title });
	}

	getSelectedRequestTitle(): Locator {
		return this.page.getByTestId('workflow-review-request-title');
	}

	getActivityFeed(): Locator {
		return this.page.getByTestId('workflow-review-activity-feed');
	}

	getActivityEntries(): Locator {
		return this.page.getByTestId('workflow-review-activity-entry');
	}

	/** Status dot in the detail header. Its `aria-label` reads e.g. "Closed • Approved". */
	getSelectedRequestStatus(): Locator {
		return this.page
			.getByTestId('workflow-review-request-title-row')
			.getByTestId('workflow-review-request-status-dot');
	}

	/** Only shown once the review is approved and the version it pinned is published. */
	getClosedCallout(): Locator {
		return this.page.getByTestId('workflow-review-closed-callout');
	}

	getDecisionTrigger(): Locator {
		return this.page.getByTestId('workflow-review-decision-trigger');
	}

	async openRequest(title: string): Promise<void> {
		await this.getRequestRow(title).click();
		await this.getActivityFeed().waitFor({ state: 'visible' });
	}

	async postComment(body: string): Promise<void> {
		const composer = this.getCommentComposerInput();
		await composer.fill(body);
		await Promise.all([this.waitForRestResponse('/comments', 'POST'), composer.press('Enter')]);
	}

	/** Request changes opens a form that requires a note. */
	async requestChanges(note: string): Promise<void> {
		await this.chooseDecision('Request changes');
		const form = this.page.getByTestId('workflow-review-request-changes-form');
		await form.getByTestId('workflow-review-decision-note').fill(note);
		await Promise.all([
			this.waitForRestResponse('/decision', 'POST'),
			form.getByTestId('workflow-review-decision-request-changes-button').click(),
		]);
	}

	/** Approving also publishes the version the review pinned. */
	async approve(): Promise<void> {
		await Promise.all([
			this.waitForRestResponse('/decision', 'POST'),
			this.chooseDecision('Approve and publish'),
		]);
	}

	private getCommentComposerInput(): Locator {
		return this.page.getByTestId('workflow-review-comment-composer').locator('textarea');
	}

	private async chooseDecision(name: string): Promise<void> {
		await this.getDecisionTrigger().click();
		await this.page
			.getByTestId('workflow-review-decision-menu')
			.getByRole('menuitem', { name })
			.click();
	}
}
