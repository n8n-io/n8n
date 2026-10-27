/**
 * Default Stryker config for vitest packages onboarding to mutation health.
 *
 * Deliberately does NOT set `vitest.configFile` — the vitest-runner
 * auto-resolves the package's own `vitest.config.*` from the run cwd (the
 * package dir). That's the whole point: plain vitest packages (DI or not)
 * need no bespoke vitest config. Packages that DO need special handling ship
 * their own `stryker.config.mjs`, which mutate.mjs prefers over this default
 * (e.g. packages/workflow carves out the isolated-vm engine — see DEVP-257).
 *
 * Reporter paths are relative to the run cwd, so reports land in
 * <package-dir>/reports/mutation/ and mutate.mjs reads raw.json from there.
 */
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
	packageManager: 'pnpm',
	testRunner: 'vitest',
	plugins: ['@stryker-mutator/vitest-runner'],
	reporters: ['progress', 'clear-text', 'html', 'json'],
	coverageAnalysis: 'perTest',
	// Skip static mutants (evaluated once at module load). Stryker can't use
	// per-test coverage for them, so each forces a full-suite re-run — on
	// static-heavy foundational files that dominates runtime (e.g.
	// node-helpers.ts: ~26% static mutants, ~33-min leg). For nightly cadence
	// the dynamic mutants (the real branching logic) are what matter; dropping
	// static ones is an acceptable trade. Scores tick up slightly on
	// static-heavy files (smaller denominator) — expected, not a regression.
	ignoreStatic: true,
	// Empty — mutate.mjs always passes --mutate <file>.
	mutate: [],
	htmlReporter: { fileName: 'reports/mutation/raw.html' },
	jsonReporter: { fileName: 'reports/mutation/raw.json' },
	timeoutMS: 60_000,
	concurrency: Number(process.env.STRYKER_CONCURRENCY ?? 4),
	tempDirName: '.stryker-tmp',
	cleanTempDir: true,
};
