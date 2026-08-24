/* eslint-disable import-x/no-default-export */
import type { CurrentsFixtures, CurrentsWorkerFixtures } from '@currents/playwright';
import { currentsReporter } from '@currents/playwright';
import { defineConfig } from '@playwright/test';
import type { PlaywrightTestConfig } from '@playwright/test';
import os from 'os';
import path from 'path';

import currentsConfig from './currents.config';
import { getProjects } from './playwright-projects';
import { getBackendUrl, getFrontendUrl, getPortFromUrl } from './utils/url-helper';

const IS_CI = !!process.env.CI;
const IS_DEV = !!process.env.N8N_EDITOR_URL;

const MACBOOK_WINDOW_SIZE = { width: 1536, height: 960 };

// Sticky across processes: workers re-import this config, and Date.now()
// would give each of them a different path than the one the webServer got.
// Only workers honor the inherited value; the main process always mints a
// fresh folder so a stale shell-exported variable can't leak in.
const USER_FOLDER =
	(process.env.TEST_WORKER_INDEX !== undefined ? process.env.N8N_TEST_USER_FOLDER : undefined) ??
	path.join(os.tmpdir(), `n8n-main-${Date.now()}`);

// Helper to get environment variables from N8N_TEST_ENV
const getTestEnv = () => {
	const testEnv = process.env.N8N_TEST_ENV;
	if (testEnv) {
		try {
			return JSON.parse(testEnv);
		} catch {
			return {};
		}
	}
	return {};
};

// Calculate workers based on environment
// The amount of workers to run, limited to 6 as higher causes instability in the local server
// Use half the CPUs in local, full in CI (CI has no other processes so we can use more)
const CPU_COUNT = os.cpus().length;
const LOCAL_WORKERS = Math.min(6, Math.floor(CPU_COUNT / 2));
const CI_WORKERS = CPU_COUNT;
const WORKERS = IS_DEV ? 1 : IS_CI ? CI_WORKERS : LOCAL_WORKERS;

const BACKEND_URL = getBackendUrl();
const FRONTEND_URL = getFrontendUrl();
const WEB_SERVER_URL = FRONTEND_URL ?? BACKEND_URL;

const EXPECT_TIMEOUT = IS_DEV ? 20000 : 10000;

const webServer: PlaywrightTestConfig['webServer'] = [];

// Escape hatch for wrapper scripts (e.g. `pnpm test:local:isolated`) that
// manage the n8n process themselves with custom env vars and a more reliable
// readiness check. Stops Playwright from racing to launch a second n8n.
const SKIP_WEB_SERVER = process.env.PLAYWRIGHT_SKIP_WEBSERVER === 'true';

if (BACKEND_URL && !SKIP_WEB_SERVER) {
	// Expose the user folder to specs (the dev-server smoke asserts the sqlite DB
	// is created inside it). Only meaningful when this run starts the backend
	// itself; a reused server writes to wherever it was already pointed.
	// N8N_TEST_ENV may override N8N_USER_FOLDER (spread below wins), so export
	// the folder the backend will actually use.
	if (IS_DEV) {
		const envUserFolder: unknown = getTestEnv().N8N_USER_FOLDER;
		process.env.N8N_TEST_USER_FOLDER =
			typeof envUserFolder === 'string' ? envUserFolder : USER_FOLDER;
	}
	webServer.push({
		command: 'cd .. && pnpm start',
		url: `${BACKEND_URL}/favicon.ico`,
		timeout: 30000,
		reuseExistingServer: IS_DEV ? false : true,
		env: {
			DB_SQLITE_POOL_SIZE: '40',
			E2E_TESTS: 'true',
			N8N_PORT: getPortFromUrl(BACKEND_URL),
			N8N_USER_FOLDER: USER_FOLDER,
			N8N_LOG_LEVEL: 'debug',
			N8N_METRICS: 'true',
			N8N_RESTRICT_FILE_ACCESS_TO: '',
			N8N_DYNAMIC_BANNERS_ENABLED: 'false',
			...getTestEnv(),
		},
	});
}

// Gate on N8N_EDITOR_URL: FRONTEND_URL alone falls back to N8N_BASE_URL. Invoke vite via
// pnpm, not turbo — turbo detaches tasks into process groups Playwright's tree-kill misses.
if (IS_DEV && FRONTEND_URL) {
	webServer.push({
		command: 'pnpm --filter=n8n-editor-ui dev',
		url: `${FRONTEND_URL}/favicon.ico`,
		timeout: 30000,
		reuseExistingServer: IS_DEV ? false : true,
		env: {
			E2E_TESTS: 'true',
			// The dev frontend derives its backend URL (BASE_PATH + REST base)
			// from N8N_PORT, so pass the backend's port, not the frontend's.
			...(BACKEND_URL ? { N8N_PORT: getPortFromUrl(BACKEND_URL) } : {}),
			N8N_EDITOR_PORT: getPortFromUrl(FRONTEND_URL),
			...getTestEnv(),
		},
	});
}

export default defineConfig<CurrentsFixtures, CurrentsWorkerFixtures>({
	globalSetup: './global-setup.ts',
	globalTeardown: IS_DEV ? './global-teardown.ts' : undefined,
	forbidOnly: IS_CI,
	retries: IS_CI ? 2 : 0,
	workers: WORKERS,
	timeout: 60000,
	expect: {
		timeout: EXPECT_TIMEOUT,
	},
	projects: getProjects(),

	// We use this if an n8n url is passed in. If the server is already running, we reuse it.
	webServer,

	use: {
		baseURL: WEB_SERVER_URL,
		trace: 'on',
		video: 'on',
		screenshot: 'on',
		testIdAttribute: 'data-test-id',
		headless: process.env.SHOW_BROWSER !== 'true',
		viewport: MACBOOK_WINDOW_SIZE,
		actionTimeout: 20000, // TODO: We might need to make this dynamic for container tests if we have low resource containers etc
		navigationTimeout: 10000,
		currentsFixturesEnabled: !!process.env.CI,
	},

	reporter: IS_CI
		? [
				['list'],
				['junit', { outputFile: process.env.PLAYWRIGHT_JUNIT_OUTPUT_NAME ?? 'results.xml' }],
				['html', { open: 'never' }],
				['json', { outputFile: 'test-results.json' }],
				...(process.env.CURRENTS_RECORD_KEY ? [currentsReporter(currentsConfig)] : []),
				['./reporters/metrics-reporter.ts'],
				['./reporters/benchmark-summary-reporter.ts'],
				...(process.env.LANGSMITH_API_KEY ? ([['./reporters/langsmith-eval.ts']] as const) : []),
			]
		: [
				['html'],
				['./reporters/metrics-reporter.ts'],
				['./reporters/benchmark-summary-reporter.ts'],
				['list'],
				...(process.env.LANGSMITH_API_KEY ? ([['./reporters/langsmith-eval.ts']] as const) : []),
			],
});
