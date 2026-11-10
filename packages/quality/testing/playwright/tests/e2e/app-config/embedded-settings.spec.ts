import type { Page } from '@playwright/test';

import { test, expect } from '../../../fixtures/base';

/** Resolves to the local n8n, but is not on the editor's list of localhost names. */
const INSECURE_HOST = 'n8n-insecure.test';

test.use({
	launchOptions: { args: [`--host-resolver-rules=MAP ${INSECURE_HOST} 127.0.0.1`] },
});

/** Records every `GET /rest/settings` request that the page sends. */
function recordSettingsRequests(page: Page) {
	const urls: string[] = [];
	page.on('request', (request) => {
		if (request.method() === 'GET' && new URL(request.url()).pathname.endsWith('/rest/settings')) {
			urls.push(request.url());
		}
	});
	return urls;
}

/** Records the path of every response with status 401 or 403. */
function recordDeniedResponses(page: Page) {
	const paths = new Set<string>();
	page.on('response', (response) => {
		if ([401, 403].includes(response.status())) {
			paths.add(`${response.request().method()} ${new URL(response.url()).pathname}`);
		}
	});
	return paths;
}

test.describe(
	'Embedded settings',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.skip(
			!!process.env.N8N_EDITOR_URL,
			'backend-served page only: the Vite dev server does not embed the settings',
		);

		test('loads the sign-in page without a settings request @auth:none', async ({ n8n }) => {
			const settingsRequests = recordSettingsRequests(n8n.page);
			const deniedResponses = recordDeniedResponses(n8n.page);

			await n8n.signIn.goto();
			await expect(n8n.signIn.getEmailField()).toBeVisible();

			expect([...deniedResponses]).toEqual(['GET /rest/login']);
			expect(settingsRequests).toHaveLength(0);
		});

		test('applies test settings overrides before the first request @auth:none', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements({
				config: {
					settings: {
						userManagement: {
							quota: -1,
							showSetupOnFirstLoad: true,
							smtpSetup: false,
							authenticationMethod: 'email',
							passwordMinLength: 8,
						},
					},
				},
			});
			const settingsRequests = recordSettingsRequests(n8n.page);

			await n8n.signIn.goto();

			await expect(n8n.page).toHaveURL(/\/setup$/);
			expect(settingsRequests).toHaveLength(0);
		});

		test('loads full settings once for a signed-in user', async ({ n8n }) => {
			const settingsRequests = recordSettingsRequests(n8n.page);

			await n8n.workflows.goto();
			await expect(n8n.sideBar.getSettings()).toBeVisible();

			expect(settingsRequests).toHaveLength(1);
		});

		test('shows the insecure cookie warning on an insecure origin @auth:none', async ({
			n8n,
			baseURL,
		}) => {
			const url = new URL('/signin', baseURL);
			url.hostname = INSECURE_HOST;

			await n8n.signIn.gotoUrl(url.toString());

			await expect(n8n.signIn.getInsecureConnectionWarning()).toBeVisible();
			await expect(n8n.signIn.getEmailField()).toBeHidden();
		});
	},
);
