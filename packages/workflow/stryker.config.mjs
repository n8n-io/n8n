/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
	packageManager: 'pnpm',
	testRunner: 'vitest',
	plugins: ['@stryker-mutator/vitest-runner'],
	// Use the Stryker-specific vitest config (vm-engine only) — see
	// vitest.stryker.config.ts for the rationale.
	vitest: {
		configFile: 'vitest.stryker.config.ts',
	},
	// No `progress` reporter: these runs are non-interactive (CI / agent loop),
	// nobody watches the stream, and its streaming output only tempts a re-poll.
	reporters: ['clear-text', 'json'],
	coverageAnalysis: 'perTest',
	// Reuse mutant results across runs: the property-testing loop edits tests and
	// re-runs `mutate` repeatedly — incremental only re-tests mutants whose
	// covering tests changed, so every verify-after-edit is cheap. Keep the cache
	// file under reports/mutation/ so it's covered by the existing gitignore.
	incremental: true,
	incrementalFile: 'reports/mutation/stryker-incremental.json',
	// Skip mutants in module-level (static) code. Each forces a full re-instrument,
	// and on a utils file they are usually the single biggest cold-run cost.
	ignoreStatic: true,
	// Default empty — the `mutate` npm script always passes --mutate <file>.
	// Direct invocation with no --mutate will fail fast (allowEmpty: false).
	mutate: [],
	jsonReporter: { fileName: 'reports/mutation/raw.json' },
	// A string/utils mutant has no legit multi-second op; a 15s+ run is a
	// loop-condition mutant spinning. Cap low so those fail fast instead of
	// stalling the whole run at the old 60s-per-timeout.
	timeoutMS: 15_000,
	// Each Stryker worker spawns vitest with one project (vm-engine, via
	// vitest.stryker.config.ts). Default 4 is fine on CI runners; lower
	// locally if you hit OOM during the initial dry run via
	// `STRYKER_CONCURRENCY=1`.
	concurrency: Number(process.env.STRYKER_CONCURRENCY ?? 4),
	tempDirName: '.stryker-tmp',
	cleanTempDir: true,
};
