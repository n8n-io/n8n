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
	// Each Stryker worker spawns vitest with two projects (legacy-engine +
	// vm-engine). Default 4 is fine on CI runners; lower locally if you hit
	// OOM during the initial dry run via `STRYKER_CONCURRENCY=1`.
	concurrency: Number(process.env.STRYKER_CONCURRENCY ?? 4),
	tempDirName: '.stryker-tmp',
	cleanTempDir: true,
};
