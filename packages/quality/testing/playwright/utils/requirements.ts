import { EMBEDDED_SETTINGS_GLOBAL } from '@n8n/constants';
import type { BrowserContext } from '@playwright/test';

import { setContextModuleSettings, setContextSettings } from '../config/intercepts';
import type { n8nPage } from '../pages/n8nPage';
import { TestError, type TestRequirements } from '../Types';

export async function setupTestRequirements(
	n8n: n8nPage,
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

	// 1. Setup frontend settings override
	if (requirements.config?.settings) {
		// Store settings for this context
		setContextSettings(context, requirements.config.settings);
		await mergeIntoEmbeddedSettings(context, requirements.config.settings);
	}

	// 1b. Setup module settings override
	if (requirements.config?.moduleSettings) {
		setContextModuleSettings(context, requirements.config.moduleSettings);
	}

	// 2. Setup feature flags
	if (requirements.config?.features) {
		for (const [feature, enabled] of Object.entries(requirements.config.features)) {
			if (enabled) {
				await n8n.api.enableFeature(feature);
			} else {
				await n8n.api.disableFeature(feature);
			}
		}
	}

	// 3. Setup API intercepts
	if (requirements.intercepts) {
		for (const config of Object.values(requirements.intercepts)) {
			await n8n.page.route(config.url, async (route) => {
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
				await n8n.navigate.toWorkflow('new');
				await n8n.canvas.importWorkflow(name, workflowData);
			} catch (error) {
				throw new TestError(`Failed to create workflow ${name}: ${String(error)}`);
			}
		}
	}
}

/**
 * The backend embeds the public settings in the page, so the `/rest/settings` intercept
 * does not see them. This deep-merges the overrides into them when the page assigns them,
 * the same way the intercept merges them into a fetched payload.
 */
async function mergeIntoEmbeddedSettings(
	context: BrowserContext,
	overrides: Partial<Record<string, unknown>>,
) {
	await context.addInitScript(
		({ key, overrides: settingsOverrides }) => {
			const isObject = (value: unknown): value is Record<string, unknown> =>
				typeof value === 'object' && value !== null;
			const merge = (target: unknown, source: unknown): unknown => {
				if (source === undefined) return target;
				if (!isObject(target) || !isObject(source)) return source;
				for (const [name, value] of Object.entries(source)) {
					target[name] = merge(target[name], value);
				}
				return target;
			};

			let settings: unknown;
			Object.defineProperty(window, key, {
				configurable: true,
				get: () => settings,
				set: (embedded: unknown) => {
					settings = merge(embedded, structuredClone(settingsOverrides));
				},
			});
		},
		{ key: EMBEDDED_SETTINGS_GLOBAL, overrides },
	);
}
