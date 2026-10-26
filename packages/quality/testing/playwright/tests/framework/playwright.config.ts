import type { CurrentsFixtures, CurrentsWorkerFixtures } from '@currents/playwright';
import { defineConfig } from '@playwright/test';
import { join } from 'node:path';

if (!process.env.HARNESS_OUTPUT)
	throw new Error('Run this config through harness-contract.test.ts');

// eslint-disable-next-line import-x/no-default-export -- Playwright loads a default config export.
export default defineConfig<CurrentsFixtures, CurrentsWorkerFixtures>({
	testDir: '.',
	testMatch: 'consumers.ts',
	workers: 1,
	retries: 0,
	timeout: 20_000,
	globalTimeout: 35_000,
	outputDir: join(process.env.HARNESS_OUTPUT, 'artifacts'),
	reporter: [['list'], ['json', { outputFile: join(process.env.HARNESS_OUTPUT, 'report.json') }]],
	use: {
		currentsFixturesEnabled: false,
		browserName: 'chromium',
		headless: true,
		trace: 'off',
		video: 'off',
		screenshot: 'off',
	},
});
