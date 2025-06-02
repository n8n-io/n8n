/* eslint-disable import/no-default-export */
import type { Project } from '@playwright/test';
import { defineConfig } from '@playwright/test';

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

// Helper to generate parallel/sequential project pairs
function createProjectPair(name: string, containerConfig: any): Project[] {
	const modeTag = `@${name}`;

	return [
		{
			name: `${name} - Parallel`,
			// Run tests that are either tagged for this mode OR have no mode tags, but exclude @db:reset
			grep: new RegExp(`${modeTag}(?!.*@db:reset)|^(?!.*@mode:|.*@db:reset)`),
			fullyParallel: true,
			use: { containerConfig } as any,
		},
		{
			name: `${name} - Sequential`,
			// Run tests that are either tagged for this mode + @db:reset OR just @db:reset (no mode tag)
			grep: new RegExp(`${modeTag}.*@db:reset|@db:reset(?!.*@mode:)`),
			fullyParallel: false,
			use: { containerConfig } as any,
		},
	];
}

export default defineConfig({
	testDir: './tests',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : 8,
	timeout: 120000,

	reporter: process.env.CI
		? [
				['list'],
				['github'],
				['junit', { outputFile: process.env.PLAYWRIGHT_JUNIT_OUTPUT_NAME ?? 'results.xml' }],
				['html', { open: 'never' }],
				['json', { outputFile: 'test-results.json' }],
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
	},

	projects: containerConfigs.flatMap(({ name, config }) => createProjectPair(name, config)),
});
