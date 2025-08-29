/* eslint-disable import-x/no-default-export */
import { currentsReporter } from '@currents/playwright';
import { defineConfig } from '@playwright/test';
import os from 'os';
import path from 'path';

import currentsConfig from './currents.config';
import { getProjects } from './playwright-projects';
import { getPortFromUrl } from './utils/url-helper';

const IS_CI = !!process.env.CI;

const MACBOOK_WINDOW_SIZE = { width: 1536, height: 960 };

const USER_FOLDER = path.join(os.tmpdir(), `n8n-main-${Date.now()}`);
// Calculate workers based on environment
// The amount of workers to run, limited to 6 as higher causes instability in the local server
// Use half the CPUs in local, full in CI (CI has no other processes so we can use more)
const CPU_COUNT = os.cpus().length;
const LOCAL_WORKERS = Math.min(6, Math.floor(CPU_COUNT / 2));
const CI_WORKERS = CPU_COUNT;
const WORKERS = IS_CI ? CI_WORKERS : LOCAL_WORKERS;

export default defineConfig({
	globalSetup: './global-setup.ts',
	forbidOnly: IS_CI,
	retries: IS_CI ? 2 : 0,
	workers: WORKERS,
	timeout: 60000,
	expect: {
		timeout: 10000,
	},
	projects: getProjects(),

	// We use this if an n8n url is passed in. If the server is already running, we reuse it.
	webServer: process.env.N8N_BASE_URL
		? {
				command: 'cd .. && pnpm start',
				url: `${process.env.N8N_BASE_URL}/favicon.ico`,
				timeout: 20000,
				reuseExistingServer: true,
				env: {
					DB_SQLITE_POOL_SIZE: '40',
					E2E_TESTS: 'true',
					N8N_PORT: getPortFromUrl(process.env.N8N_BASE_URL),
					N8N_USER_FOLDER: USER_FOLDER,
					N8N_LOG_LEVEL: 'debug',
					N8N_METRICS: 'true',
				},
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
