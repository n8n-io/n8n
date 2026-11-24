import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

type Direction = 'apply' | 'promote';

/** The page of a project that shows the changes before a Promote or an Apply. */
export class PromotionPreviewPage extends BasePage {
	async goto(projectId: string, direction: Direction): Promise<void> {
		await this.page.goto(`/projects/${projectId}/promotions/${direction}`);
	}

	getSubmitButton(): Locator {
		return this.page.getByTestId('promotion-preview-submit');
	}

	getChangesTab(): Locator {
		return this.page.getByTestId('promotion-preview-tabs').getByTestId('tab-changes');
	}

	/** The tab "Issues". Promote shows it only when the selection has issues. */
	getIssuesTab(): Locator {
		return this.page.getByTestId('promotion-preview-tabs').getByTestId('tab-blockers');
	}

	private getTreeRow(workflowId: string): Locator {
		return this.page
			.getByTestId('promotion-preview-tree')
			.locator(`[data-resource-key="workflow:${workflowId}"]`);
	}

	getWorkflowCheckbox(workflowId: string): Locator {
		return this.getTreeRow(workflowId).getByTestId('promotion-preview-tree-checkbox');
	}

	private getIssues(): Locator {
		return this.page.getByTestId('promotion-preview-blockers');
	}

	/** A section of the tab "Issues", by a part of its heading. */
	getIssuesSection(heading: string): Locator {
		return this.getIssues()
			.getByTestId('promotion-preview-blockers-section')
			.filter({ has: this.page.getByRole('heading', { name: heading }) });
	}

	/** A row of the tab "Issues", by the name of its dependency. */
	getIssueRow(name: string): Locator {
		return this.getIssues().getByTestId('promotion-preview-blocker-row').filter({ hasText: name });
	}

	/** The dialog that asks for the commit message of a Promote. */
	getPromoteDialog(): Locator {
		return this.page.getByTestId('promote-selection-dialog');
	}

	getPromoteDialogTitle(): Locator {
		return this.getPromoteDialog().getByRole('heading');
	}

	getPromoteCommitMessage(): Locator {
		return this.getPromoteDialog().getByTestId('promote-commit-message');
	}

	getPromoteConfirmButton(): Locator {
		return this.getPromoteDialog().getByTestId('promote-confirm-button');
	}

	/** The dialog that lists the dependencies that an Apply leaves unresolved. */
	getApplyUnresolvedDialog(): Locator {
		return this.page.getByTestId('apply-unresolved-dialog');
	}

	getApplyUnresolvedDialogTitle(): Locator {
		return this.getApplyUnresolvedDialog().getByRole('heading');
	}

	getApplyUnresolvedConfirmButton(): Locator {
		return this.getApplyUnresolvedDialog().getByTestId('apply-unresolved-confirm');
	}

	/** The list of the unresolved dependencies in a dialog. */
	getUnresolvedDependencyList(dialog: Locator): Locator {
		return dialog.getByTestId('promotion-missing-dependency-list');
	}

	/** An unresolved dependency that a dialog lists, by its name. */
	getUnresolvedDependency(dialog: Locator, name: string): Locator {
		return dialog.getByTestId('promotion-missing-dependency').filter({ hasText: name });
	}
}
