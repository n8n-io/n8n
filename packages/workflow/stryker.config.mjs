/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
	packageManager: 'pnpm',
	testRunner: 'vitest',
	plugins: ['@stryker-mutator/vitest-runner'],
	reporters: ['progress', 'clear-text', 'html', 'json'],
	coverageAnalysis: 'perTest',
	// Default empty — the `mutate` npm script always passes --mutate <file>.
	// Direct invocation with no --mutate will fail fast (allowEmpty: false).
	mutate: [],
	htmlReporter: { fileName: 'reports/mutation/raw.html' },
	jsonReporter: { fileName: 'reports/mutation/raw.json' },
	timeoutMS: 60_000,
	concurrency: 4,
	tempDirName: '.stryker-tmp',
	cleanTempDir: true,
};
