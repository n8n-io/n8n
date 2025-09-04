import type { Page, BrowserContext } from '@playwright/test';

import { setContextSettings } from '../config/intercepts';
import { n8nPage } from '../pages/n8nPage';
import { ApiHelpers } from '../services/api-helper';
import { TestError, type TestRequirements } from '../Types';

export async function setupTestRequirements(
	page: Page,
	context: BrowserContext,
	requirements: TestRequirements,
): Promise<void> {
	// 0. Setup browser storage before creating a new page
	if (requirements.storage) {
		await context.addInitScript((storage) => {
			// Set localStorage items
			for (const [key, value] of Object.entries(storage)) {
				window.localStorage.setItem(key, value);
			}
		}, requirements.storage);
	}

	const api = new ApiHelpers(context.request);
	const n8n = new n8nPage(page, api);

	// 1. Setup frontend settings override
	if (requirements.config?.settings) {
		// Store settings for this context
		setContextSettings(context, requirements.config.settings);
	}

	// 2. Setup feature flags
	if (requirements.config?.features) {
		for (const [feature, enabled] of Object.entries(requirements.config.features)) {
			if (enabled) {
				await api.enableFeature(feature);
			} else {
				await api.disableFeature(feature);
			}
		}
	}

	// 3. Setup API intercepts
	if (requirements.intercepts) {
		for (const config of Object.values(requirements.intercepts)) {
			await page.route(config.url, async (route) => {
				await route.fulfill({
					status: config.status ?? 200,
					contentType: config.contentType ?? 'application/json',
					body:
						typeof config.response === 'string' ? config.response : JSON.stringify(config.response),
				});
			});
		}
	}

	// 4. Setup workflows
	if (requirements.workflow) {
		const entries =
			typeof requirements.workflow === 'string'
				? [[requirements.workflow, requirements.workflow]]
				: Object.entries(requirements.workflow);

		for (const [name, workflowData] of entries) {
			try {
				// Import workflow using the n8n page object
				await n8n.goHome();
				await n8n.workflows.clickAddWorkflowButton();
				await n8n.canvas.importWorkflow(name, workflowData);
			} catch (error) {
				throw new TestError(`Failed to create workflow ${name}: ${String(error)}`);
			}
		}
	}
}
