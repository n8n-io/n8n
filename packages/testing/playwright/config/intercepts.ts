import type { BrowserContext, Route } from '@playwright/test';
import cloneDeep from 'lodash/cloneDeep';
import merge from 'lodash/merge';

const contextSettings = new Map<BrowserContext, Partial<Record<string, unknown>>>();

export function setContextSettings(
	context: BrowserContext,
	settings: Partial<Record<string, unknown>>,
) {
	contextSettings.set(context, settings);
}

export function getContextSettings(context: BrowserContext) {
	return contextSettings.get(context);
}

export async function setupDefaultInterceptors(target: BrowserContext) {
	// Global /rest/settings intercept - always active like Cypress
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
}
