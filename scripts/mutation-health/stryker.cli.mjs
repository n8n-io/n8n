/**
 * Stryker config for `packages/cli`. It is the shared default plus one change:
 * related-test discovery is off.
 *
 * `packages/cli` runs vitest with `pool: 'forks'` and a global setup, thus each
 * test file costs a process. Stryker's vitest runner defaults to
 * [related mode](https://vitest.dev/guide/cli.html#vitest-related), which walks
 * the import graph of the mutated file and finds hundreds of test files in this
 * package — the dry run alone then outlives any usable timeout.
 *
 * With `related: false` the run tests exactly the files `--test-files` names, so
 * `mutate.mjs` requires that flag for cli targets (see `cliScopeError`). Stryker
 * also uses the resolved `testFiles` as its global test filter, thus a mutant
 * with no per-test coverage stays inside the same set.
 */
import defaultConfig from './stryker.default.mjs';

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
	...defaultConfig,
	vitest: { related: false },
};
