/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
	packageManager: 'pnpm',
	testRunner: 'vitest',
	plugins: ['@stryker-mutator/vitest-runner'],
	reporters: ['progress', 'clear-text', 'html', 'json'],
	coverageAnalysis: 'perTest',
	mutate: [
		'src/cron.ts',
		'src/metadata-utils.ts',
		'src/workflow-checksum.ts',
		'src/deferred-promise.ts',
	],
	htmlReporter: { fileName: 'reports/mutation/calibration.html' },
	jsonReporter: { fileName: 'reports/mutation/calibration.json' },
	timeoutMS: 60_000,
	concurrency: 4,
	tempDirName: '.stryker-tmp',
	cleanTempDir: true,
};
