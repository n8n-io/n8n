import type { BrowserContext, Request, Route } from '@playwright/test';
import cloneDeep from 'lodash/cloneDeep';
import merge from 'lodash/merge';
import type { IWorkflowSettings } from 'n8n-workflow';

export interface InterceptorOptions {
	/** Settings merged into every workflow the editor creates or updates. */
	workflowSettings?: Partial<IWorkflowSettings>;
}

const contextSettings = new Map<BrowserContext, Partial<Record<string, unknown>>>();
const contextModuleSettings = new Map<BrowserContext, Partial<Record<string, unknown>>>();

export function setContextSettings(
	context: BrowserContext,
	settings: Partial<Record<string, unknown>>,
) {
	contextSettings.set(context, settings);
}

export function getContextSettings(context: BrowserContext) {
	return contextSettings.get(context);
}

export function setContextModuleSettings(
	context: BrowserContext,
	moduleSettings: Partial<Record<string, unknown>>,
) {
	contextModuleSettings.set(context, moduleSettings);
}

export function getContextModuleSettings(context: BrowserContext) {
	return contextModuleSettings.get(context);
}

export async function setupDefaultInterceptors(
	target: BrowserContext,
	options: InterceptorOptions = {},
) {
	// Global /rest/settings intercept - always active like Cypress
	// TODO: Remove this as a global and move it per test
	await target.route('**/rest/settings', async (route: Route) => {
		try {
			const originalResponse = await route.fetch();
			const originalJson = await originalResponse.json();

			// Get settings stored for this specific context
			const testSettings = getContextSettings(target);

			// Deep merge test settings with backend settings (like Cypress)
			const modifiedData = {
				data:
					testSettings && Object.keys(testSettings).length > 0
						? merge(cloneDeep(originalJson.data), testSettings)
						: originalJson.data,
			};

			await route.fulfill({
				status: originalResponse.status(),
				headers: originalResponse.headers(),
				contentType: 'application/json',
				body: JSON.stringify(modifiedData),
			});
		} catch (error) {
			console.error('Error in /rest/settings intercept:', error);
			await route.continue();
		}
	});

	// Global /rest/module-settings intercept - lets a test pin a backend module's
	// client settings (e.g. turn `instance-ai` off) without changing the instance.
	await target.route('**/rest/module-settings', async (route: Route) => {
		try {
			const originalResponse = await route.fetch();
			const originalJson = await originalResponse.json();

			const testModuleSettings = getContextModuleSettings(target);

			const modifiedData = {
				data:
					testModuleSettings && Object.keys(testModuleSettings).length > 0
						? merge(cloneDeep(originalJson.data), testModuleSettings)
						: originalJson.data,
			};

			await route.fulfill({
				status: originalResponse.status(),
				headers: originalResponse.headers(),
				contentType: 'application/json',
				body: JSON.stringify(modifiedData),
			});
		} catch (error) {
			console.error('Error in /rest/module-settings intercept:', error);
			await route.continue();
		}
	});

	// POST /rest/credentials/test
	await target.route('**/rest/credentials/test', async (route: Route) => {
		if (route.request().method() === 'POST') {
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({ data: { status: 'success', message: 'Tested successfully' } }),
			});
		} else {
			await route.continue();
		}
	});

	// POST /rest/license/renew
	await target.route('**/rest/license/renew', async (route: Route) => {
		if (route.request().method() === 'POST') {
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({
					data: {
						usage: { activeWorkflowTriggers: { limit: -1, value: 0, warningThreshold: 0.8 } },
						license: { planId: '', planName: 'Community' },
					},
				}),
			});
		} else {
			await route.continue();
		}
	});

	// Pathname /api/health
	await target.route(
		(url) => url.pathname.endsWith('/api/health'),
		async (route: Route) => {
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({ status: 'OK' }),
			});
		},
	);

	// Pathname /api/versions/*
	await target.route(
		(url) => url.pathname.startsWith('/api/versions/'),
		async (route: Route) => {
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify([
					{
						name: '1.45.1',
						createdAt: '2023-08-18T11:53:12.857Z',
						hasSecurityIssue: null,
						hasSecurityFix: null,
						securityIssueFixVersion: null,
						hasBreakingChange: null,
						documentationUrl: 'https://docs.n8n.io/release-notes/#n8n131',
						nodes: [],
						description: 'Includes <strong>bug fixes</strong>',
					},
					{
						name: '1.0.5',
						createdAt: '2023-07-24T10:54:56.097Z',
						hasSecurityIssue: false,
						hasSecurityFix: null,
						securityIssueFixVersion: null,
						hasBreakingChange: true,
						documentationUrl: 'https://docs.n8n.io/release-notes/#n8n104',
						nodes: [],
						description:
							'Includes <strong>core functionality</strong> and <strong>bug fixes</strong>',
					},
				]),
			});
		},
	);

	if (options.workflowSettings) {
		await routeWorkflowSettings(target, options.workflowSettings);
	}
}

const isWorkflowCreate = (url: URL) => url.pathname.endsWith('/rest/workflows');
const isWorkflowUpdate = (url: URL) => /\/rest\/workflows\/[^/]+$/.test(url.pathname);

/**
 * The editor's default settings carry no `engineType`, so a workflow saved
 * from the canvas runs on the legacy engine. This merge gives it what
 * `api.workflows` gives an API-built one. A value the editor sends is a choice
 * the user made in the settings dialog, so it wins. An update without
 * `settings` keeps the stored ones, so it passes untouched: the stack's keys
 * alone would replace the editor's execution order.
 */
async function routeWorkflowSettings(
	target: BrowserContext,
	workflowSettings: Partial<IWorkflowSettings>,
) {
	await target.route(
		(url) => isWorkflowCreate(url) || isWorkflowUpdate(url),
		async (route: Route) => {
			const request = route.request();
			const url = new URL(request.url());
			const isCreate = request.method() === 'POST' && isWorkflowCreate(url);
			const isUpdate = request.method() === 'PATCH' && isWorkflowUpdate(url);
			const body = isCreate || isUpdate ? saveBody(request) : null;

			if (!body || (isUpdate && !body.settings)) {
				await route.continue();
				return;
			}

			await route.continue({
				postData: JSON.stringify({ ...body, settings: { ...workflowSettings, ...body.settings } }),
			});
		},
	);
}

/** The editor sends JSON; anything else passes through untouched instead of stalling the request. */
function saveBody(request: Request): { settings?: object } | null {
	try {
		return request.postDataJSON() as { settings?: object } | null;
	} catch {
		return null;
	}
}
