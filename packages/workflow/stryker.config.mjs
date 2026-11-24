/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
	packageManager: 'pnpm',
	testRunner: 'vitest',
	plugins: ['@stryker-mutator/vitest-runner'],
	vitest: {
		configFile: 'vitest.stryker.config.ts',
		// The vm engine needs `forks`: isolated-vm aborts the process when a worker
		// thread that started an isolate exits (laverdet/isolated-vm#464).
		pool: 'forks',
	},
	// No `progress` reporter: these runs are non-interactive, nobody watches the stream.
	reporters: ['clear-text', 'json'],
	coverageAnalysis: 'perTest',
	// Skip module-level (static) mutants — each forces a full re-instrument.
	ignoreStatic: true,
	// Default empty — the `mutate` npm script always passes --mutate <file>.
	// Direct invocation with no --mutate will fail fast (allowEmpty: false).
	mutate: [],
	jsonReporter: { fileName: 'reports/mutation/raw.json' },
	// Cap low: a string/utils mutant running 15s+ is a spinning loop-condition mutant; fail it fast.
	timeoutMS: 15_000,
	// Default 4 is fine on CI runners; lower locally if you hit OOM during the
	// initial dry run via `STRYKER_CONCURRENCY=1`.
	concurrency: Number(process.env.STRYKER_CONCURRENCY ?? 4),
	// See stryker.default.mjs: keeps the --inPlace backup out of vitest's test glob.
	tempDirName: 'node_modules/.stryker-tmp',
	cleanTempDir: true,
};
