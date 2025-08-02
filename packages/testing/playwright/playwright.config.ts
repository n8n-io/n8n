/* eslint-disable import-x/no-default-export */
import { currentsReporter } from '@currents/playwright';
import { defineConfig } from '@playwright/test';

import currentsConfig from './currents.config';
import { getProjects } from './playwright-projects';

const IS_CI = !!process.env.CI;

const MACBOOK_WINDOW_SIZE = { width: 1536, height: 960 };

export default defineConfig({
	globalSetup: './global-setup.ts',
	forbidOnly: IS_CI,
	retries: IS_CI ? 2 : 0,
	workers: IS_CI ? 2 : 6,
	timeout: 60000,

	projects: getProjects(),

	// We use this if an n8n url is passed in. If the server is already running, we reuse it.
	webServer: process.env.N8N_BASE_URL
		? {
				command:
					'cd .. && N8N_PORT=5680 N8N_USER_FOLDER=/tmp/n8n-main-$(date +%s) E2E_TESTS=true pnpm start',
				url: process.env.N8N_BASE_URL + '/favicon.ico',
				timeout: 20000,
				reuseExistingServer: true,
			}
		: undefined,

	use: {
		trace: 'on',
		video: 'on',
		screenshot: 'on',
		testIdAttribute: 'data-test-id',
		headless: process.env.SHOW_BROWSER !== 'true',
		viewport: MACBOOK_WINDOW_SIZE,
		actionTimeout: 20000, // TODO: We might need to make this dynamic for container tests if we have low resource containers etc
		navigationTimeout: 10000,
	},

	reporter: IS_CI
		? [
				['list'],
				['github'],
				['junit', { outputFile: process.env.PLAYWRIGHT_JUNIT_OUTPUT_NAME ?? 'results.xml' }],
				['html', { open: 'never' }],
				['json', { outputFile: 'test-results.json' }],
				currentsReporter(currentsConfig),
			]
		: [['html']],
});
