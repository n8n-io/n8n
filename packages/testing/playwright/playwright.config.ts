/* eslint-disable import-x/no-default-export */
import { currentsReporter } from '@currents/playwright';
import type { Project } from '@playwright/test';
import { defineConfig } from '@playwright/test';

import currentsConfig from './currents.config';

/*
 * Mode-based Test Configuration
 *
 * Usage examples:
 *
 * 1. Run only mode:standard tests:
 *    npx playwright test --project="mode:standard*"
 *
 * 2. Run only parallel tests for all modes:
 *    npx playwright test --project="*Parallel"
 *
 * 3. Run a specific mode's sequential tests:
 *    npx playwright test --project="mode:multi-main - Sequential"
 *
 * Test tagging examples:
 *
 * // Runs on all modes
 * test('basic functionality', async ({ page }) => { ... });
 *
 * // Only runs on multi-main mode
 * test('multi-main specific @mode:multi-main', async ({ page }) => { ... });
 *
 * // Only runs on postgres mode, and in sequential execution
 * test('database reset test @mode:postgres @db:reset', async ({ page }) => { ... });
 *
 * // Runs on all modes, but in sequential execution
 * test('another reset test @db:reset', async ({ page }) => { ... });
 */

// Container configurations
const containerConfigs = [
	{ name: 'mode:standard', config: {} },
	{ name: 'mode:postgres', config: { postgres: true } },
	{ name: 'mode:queue', config: { queueMode: { mains: 1, workers: 1 } } },
	{ name: 'mode:multi-main', config: { queueMode: { mains: 2, workers: 1 } } },
];

// Parallel tests can run fully parallel on a worker
// Sequential tests can run on a single worker, since the need a DB reset
// Chaos tests can run on a single worker, since they can destroy containers etc, these need to be isolate from DB tests since they are destructive
function createProjectTrio(name: string, containerConfig: any): Project[] {
	const modeTag = `@${name}`;

	// Parse custom env vars from command line
	const customEnv = process.env.N8N_TEST_ENV ? JSON.parse(process.env.N8N_TEST_ENV) : {};

	// Merge custom env vars into container config
	const mergedConfig = {
		...containerConfig,
		env: {
			...containerConfig.env,
			...customEnv,
		},
	};

	// Only add dependencies when using external URL (i.e., using containers)
	// This is to stop DB reset tests from running in parallel with other tests when more than 1 worker is used
	const shouldAddDependencies = process.env.N8N_BASE_URL;

	return [
		{
			name: `${name} - Parallel`,
			grep: new RegExp(
				`${modeTag}(?!.*(@db:reset|@chaostest))|^(?!.*(@mode:|@db:reset|@chaostest))`,
			),
			fullyParallel: true,
			use: { containerConfig: mergedConfig } as any,
		},
		{
			name: `${name} - Sequential`,
			grep: new RegExp(`${modeTag}.*@db:reset|@db:reset(?!.*@mode:)`),
			fullyParallel: false,
			workers: 1,
			...(shouldAddDependencies && { dependencies: [`${name} - Parallel`] }),
			use: { containerConfig: mergedConfig } as any,
		},
		{
			name: `${name} - Chaos`,
			grep: new RegExp(`${modeTag}.*@chaostest`),
			fullyParallel: false,
			workers: 1,
			use: { containerConfig: mergedConfig } as any,
			timeout: 120000,
		},
	];
}

export default defineConfig({
	globalSetup: './global-setup.ts',
	testDir: './tests',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : 8,
	timeout: 60000,

	reporter: process.env.CI
		? [
				['list'],
				['github'],
				['junit', { outputFile: process.env.PLAYWRIGHT_JUNIT_OUTPUT_NAME ?? 'results.xml' }],
				['html', { open: 'never' }],
				['json', { outputFile: 'test-results.json' }],
				['blob'],
				currentsReporter(currentsConfig),
			]
		: [['html']],

	use: {
		trace: 'on',
		video: 'on',
		screenshot: 'on',
		testIdAttribute: 'data-test-id',
		headless: true,
		viewport: { width: 1536, height: 960 },
		actionTimeout: 10000,
		navigationTimeout: 10000,
		channel: 'chromium',
	},

	projects: process.env.N8N_BASE_URL
		? containerConfigs
				.filter(({ name }) => name === 'mode:standard')
				.flatMap(({ name, config }) => createProjectTrio(name, config))
		: containerConfigs.flatMap(({ name, config }) => createProjectTrio(name, config)),
});
