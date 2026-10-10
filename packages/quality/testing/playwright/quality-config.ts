import type { CurrentsFixtures, CurrentsWorkerFixtures } from '@currents/playwright';
import { currentsReporter } from '@currents/playwright';
import { defineConfig } from '@playwright/test';
import type { PlaywrightTestConfig, ReporterDescription } from '@playwright/test';
import { resolve } from 'node:path';

import currentsConfig from './currents.config';

export function qualityReporters(): ReporterDescription[] {
	const shared: ReporterDescription[] = [
		[resolve(__dirname, 'reporters/metrics-reporter.ts')],
		[resolve(__dirname, 'reporters/benchmark-summary-reporter.ts')],
	];

	if (!process.env.CI) {
		return [['html'], ...shared, ['list']];
	}

	return [
		['list'],
		['junit', { outputFile: process.env.PLAYWRIGHT_JUNIT_OUTPUT_NAME ?? 'results.xml' }],
		['html', { open: 'never' }],
		['json', { outputFile: 'test-results.json' }],
		...(process.env.CURRENTS_RECORD_KEY ? [currentsReporter(currentsConfig)] : []),
		...shared,
	];
}

/** Share reporting without starting a browser, application, or container stack. */
export function defineQualityConfig<
	TestFixtures extends object = object,
	WorkerFixtures extends object = object,
>(
	config: PlaywrightTestConfig<
		TestFixtures & CurrentsFixtures,
		WorkerFixtures & CurrentsWorkerFixtures
	>,
) {
	return defineConfig<TestFixtures & CurrentsFixtures, WorkerFixtures & CurrentsWorkerFixtures>({
		forbidOnly: !!process.env.CI,
		retries: process.env.CI ? 2 : 0,
		...config,
		reporter: config.reporter ?? qualityReporters(),
		use: Object.assign(
			{
				currentsConfigOptions: currentsConfig,
				currentsFixturesEnabled: !!process.env.CI && !!process.env.CURRENTS_RECORD_KEY,
			},
			config.use,
		),
	});
}
