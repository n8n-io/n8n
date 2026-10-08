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

	getGroup(name: 'Waiting for your review' | 'Authored by you' | 'Closed'): Locator {
		return this.page.getByRole('listbox', { name, exact: true });
	}

	getAssistantStatus(title: string): Locator {
		return this.getRequestRow(title).getByTestId('inbox-assistant-status');
	}

	getAssistantDetail(): Locator {
		return this.page.getByTestId('inbox-self-healing-detail');
	}

	getChangesDiff(): Locator {
		return this.page.getByTestId('workflow-review-changes-diff');
	}

	async selectDetailTab(name: 'Activity' | 'Changes'): Promise<void> {
		await this.page
			.getByTestId('workflow-review-detail-tab-bar')
			.getByText(name, { exact: true })
			.click();
	}

	async selectInboxTab(name: 'Open' | 'Closed'): Promise<void> {
		await this.page.getByTestId('inbox-tabs').getByText(name, { exact: true }).click();
	}

	async openAssistantResult(title: string): Promise<void> {
		await this.getRequestRow(title).click();
		await this.getAssistantDetail().waitFor({ state: 'visible' });
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

	async requestChanges(note: string): Promise<void> {
		await this.decide(note, 'workflow-review-decision-request-changes-button');
	}

	/** Approving also publishes the version the review pinned. */
	async approve(note: string): Promise<void> {
		await this.decide(note, 'workflow-review-decision-approve-button');
	}

	private getCommentComposerInput(): Locator {
		return this.page.getByTestId('workflow-review-comment-composer').locator('textarea');
	}

	/** The popover requires a note before it will accept either decision. */
	private async decide(note: string, buttonTestId: string): Promise<void> {
		await this.getDecisionTrigger().click();
		const popover = this.page.getByTestId('workflow-review-decision-popover');
		await popover.waitFor({ state: 'visible' });
		await popover.getByTestId('workflow-review-decision-note').fill(note);
		await Promise.all([
			this.waitForRestResponse('/decision', 'POST'),
			popover.getByTestId(buttonTestId).click(),
		]);
	}
}
