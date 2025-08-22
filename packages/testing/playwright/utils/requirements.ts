import type { Page, BrowserContext } from '@playwright/test';

import { setContextSettings } from '../config/intercepts';
import { n8nPage } from '../pages/n8nPage';
import { ApiHelpers } from '../services/api-helper';
import { TestError, type TestRequirements } from '../Types';

export async function setupTestRequirements(
	page: Page,
	context: BrowserContext,
	requirements: TestRequirements,
): Promise<{ webhookPath?: string; webhookId?: string; workflowId?: string } | void> {
	const api = new ApiHelpers(context.request);
	const n8n = new n8nPage(page, api);

	// 1. Setup browser storage first (before any navigation)
	if (requirements.storage) {
		await context.addInitScript((storage) => {
			// Set localStorage items
			for (const [key, value] of Object.entries(storage)) {
				window.localStorage.setItem(key, value);
			}
		}, requirements.storage);
	}

	// 2. Setup frontend settings override
	if (requirements.config?.settings) {
		// Store settings for this context
		setContextSettings(context, requirements.config.settings);
	}

	// 3. Setup feature flags
	if (requirements.config?.features) {
		for (const [feature, enabled] of Object.entries(requirements.config.features)) {
			if (enabled) {
				await api.enableFeature(feature);
			} else {
				await api.disableFeature(feature);
			}
		}
	}

	// 4. Setup API intercepts
	if (requirements.intercepts) {
		for (const [name, config] of Object.entries(requirements.intercepts)) {
			await page.route(config.url, async (route) => {
				if (config.forceNetworkError) {
					await route.abort('failed');
					return;
				}

				await route.fulfill({
					status: config.status ?? 200,
					contentType: config.contentType ?? 'application/json',
					headers: config.headers,
					body:
						typeof config.response === 'string' ? config.response : JSON.stringify(config.response),
				});
			});
		}
	}

	// 5. API-driven setup (fast, reliable)
	if (requirements.setup) {
		try {
			// Create projects first
			if (requirements.setup.projects) {
				for (const project of requirements.setup.projects) {
					await api.projectApi.createProject(project.name);
				}
			}

			// Create credentials
			if (requirements.setup.credentials) {
				for (const credential of requirements.setup.credentials) {
					await api.credentialApi.createCredential({
						name: credential.name,
						type: credential.type,
						data: credential.data,
					});
				}
			}

			// Create workflows
			if (requirements.setup.workflows) {
				for (const workflow of requirements.setup.workflows) {
					await api.workflowApi.createWorkflow({
						name: workflow.name,
						nodes: workflow.nodes ?? [],
						connections: workflow.connections ?? {},
						settings: workflow.settings ?? {},
						tags: workflow.tags ?? [],
					});
				}
			}
		} catch (error) {
			throw new TestError(`Failed to setup API resources: ${String(error)}`);
		}
	}

	// 6. Navigate to UI entry point
	let importResult: { webhookPath?: string; webhookId?: string; workflowId?: string } | undefined;

	if (requirements.entry) {
		try {
			switch (requirements.entry.type) {
				case 'home':
					await n8n.start.fromHome();
					break;
				case 'blank-canvas':
					await n8n.start.fromBlankCanvas();
					break;
				case 'new-project':
					await n8n.start.fromNewProject();
					break;
				case 'imported-workflow':
					if (!requirements.entry.workflow) {
						throw new TestError('workflow file required for imported-workflow entry type');
					}
					const result = await n8n.start.fromImportedWorkflow(requirements.entry.workflow);
					importResult = {
						webhookPath: result.webhookPath,
						webhookId: result.webhookId,
						workflowId: result.workflowId,
					};
					break;
				default:
					throw new TestError(`Unknown entry type: ${requirements.entry.type}`);
			}
		} catch (error) {
			throw new TestError(`Failed to navigate to entry point: ${String(error)}`);
		}
	} else {
		// Default: go to home page
		await n8n.start.fromHome();
	}

	// Return import result if we imported a workflow, otherwise return undefined
	return importResult;
}
