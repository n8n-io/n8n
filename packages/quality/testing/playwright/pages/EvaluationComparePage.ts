import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * The multi-version eval-collection compare view
 * (`/workflow/:workflowId/evaluation/collections/:collectionId/compare`).
 */
export class EvaluationComparePage extends BasePage {
	async goto(workflowId: string, collectionId: string): Promise<void> {
		// The editor is an SPA — resolve on `domcontentloaded` rather than the full
		// `load` event (which can lag on a cold route), then wait for the view.
		await this.page.goto(`/workflow/${workflowId}/evaluation/collections/${collectionId}/compare`, {
			waitUntil: 'domcontentloaded',
			// Generous nav timeout: the dev server can cold-compile this route on
			// first navigation. Harmless against the prebuilt editor in CI.
			timeout: 60_000,
		});
		await this.getView().waitFor({ state: 'visible', timeout: 30_000 });
	}

	getView(): Locator {
		return this.page.getByTestId('compare-collection-view');
	}

	getHeader(): Locator {
		return this.page.getByTestId('compare-header');
	}

	getScoreChart(): Locator {
		return this.page.getByTestId('compare-score-chart');
	}

	getTabs(): Locator {
		return this.page.getByTestId('compare-tabs');
	}

	getDatasetMismatchBanner(): Locator {
		return this.page.getByTestId('compare-dataset-mismatch');
	}

	getCasesTable(): Locator {
		return this.page.getByTestId('compare-cases-table');
	}

	getCaseRows(): Locator {
		return this.page.getByTestId('compare-cases-row');
	}

	getOutputsTab(): Locator {
		return this.page.getByTestId('compare-outputs-tab');
	}

	/** Click a case row to drill into its side-by-side outputs. */
	async openCase(index: number): Promise<void> {
		await this.getCaseRows().nth(index).click();
	}
}
