/**
 * Two fixes for `@stryker-mutator/vitest-runner` 10.0.0 under Vitest 5. Pure,
 * so the unit tests can drive them without Stryker or Vitest. The runner is
 * tested only against Vitest 4.1.
 *
 * 1. Test names. For each mutant the runner runs only the tests that cover
 *    it. It selects them with a `testNamePattern` regex built from names that
 *    join the suite and the test with a space ("suite test"). Vitest 4 matched
 *    the pattern against names in that form. Vitest 5 matches it against
 *    `fullTestName`, which joins them with " > " ("suite > test"). The pattern
 *    then misses every test inside a `describe`, no test runs, and every
 *    mutant survives with a score of 0.
 *
 * 2. Test files that do not load. The runner counts only tests. A test file
 *    that throws on import has no tests, so it drops out of the run without an
 *    error. Alone, it reads as "No tests were executed", which mutate.mjs then
 *    records as "no covering tests".
 *
 * Remove the first fix when the runner supports Vitest 5.
 *
 * `compatPlugins` builds the plugin from the runner's plugin list. The list is
 * a parameter, so the unit tests run without the runner installed.
 */

// The Stryker test runner that `vitest-compat-runner.mjs` declares.
export const COMPAT_RUNNER_NAME = 'vitest-compat';

// The two separators a full test name can have between a suite and a test.
const NAME_SEPARATOR = '(?: > | )';

const nestedPatterns = new WeakSet();

/**
 * A pattern that selects the same tests with either separator. Any space in
 * the runner's pattern can stand for a separator, so each one becomes an
 * alternation. The runner escapes each name, so a space is never inside a
 * character class. A pattern that this function made comes back unchanged.
 */
export function toNestedNamePattern(pattern) {
	if (!(pattern instanceof RegExp) || nestedPatterns.has(pattern)) return pattern;
	const nested = new RegExp(pattern.source.replaceAll(' ', NAME_SEPARATOR), pattern.flags);
	nestedPatterns.add(nested);
	return nested;
}

/**
 * Wrap a vitest runner so each test run selects tests by nested names. The
 * runner sets `testNamePattern` on each project and then starts Vitest, so the
 * wrap goes on `ctx.start`, after the runner has set the pattern. `init`
 * creates a new Vitest context, so each `init` wraps the context it made.
 */
export function withNestedNamePatterns(runner) {
	const init = runner.init.bind(runner);
	runner.init = async (...args) => {
		await init(...args);
		const { ctx } = runner;
		const start = ctx.start.bind(ctx);
		ctx.start = (...startArgs) => {
			for (const project of ctx.projects) {
				project.config.testNamePattern = toNestedNamePattern(project.config.testNamePattern);
			}
			return start(...startArgs);
		};
	};
	return runner;
}

/**
 * One line for each test file that failed before it collected a test, with
 * the errors Vitest recorded. A file whose tests ran and failed is not here:
 * the runner already reports failed tests.
 */
export function fileLoadErrors(files) {
	return files
		.filter((file) => file.result?.state === 'fail' && file.tasks.length === 0)
		.map((file) => {
			const messages = file.result.errors?.map((error) => error.message) ?? [];
			return `${file.filepath ?? file.name}: ${messages.join('; ') || 'the file did not load'}`;
		});
}

/**
 * Wrap a vitest runner so a test file that does not load fails the dry run.
 * Stryker then stops with the file's error instead of scoring the target as
 * having no tests.
 */
export function withLoadErrors(runner) {
	const dryRun = runner.dryRun.bind(runner);
	runner.dryRun = async (...args) => {
		const result = await dryRun(...args);
		if (result.status !== 'complete') return result;
		const errors = fileLoadErrors(runner.ctx.state.getFiles());
		if (errors.length === 0) return result;
		return { status: 'error', errorMessage: `A test file did not load:\n${errors.join('\n')}` };
	};
	return runner;
}

/**
 * The Stryker plugins that declare the `vitest-compat` test runner, built from
 * the plugin list of `@stryker-mutator/vitest-runner`. It throws when the list
 * has no `vitest` test runner, so a runner upgrade that changes the export
 * stops the run at load time with a clear message.
 */
export function compatPlugins(vitestRunnerPlugins) {
	const vitestRunner = vitestRunnerPlugins.find(
		(plugin) => plugin.kind === 'TestRunner' && plugin.name === 'vitest',
	);
	if (!vitestRunner) {
		throw new Error('@stryker-mutator/vitest-runner no longer declares the "vitest" test runner.');
	}
	const factory = (injector) =>
		withLoadErrors(withNestedNamePatterns(vitestRunner.factory(injector)));
	// Stryker reads the factory's dependencies from `inject`: the same as the wrapped one.
	factory.inject = vitestRunner.factory.inject;
	return [{ kind: vitestRunner.kind, name: COMPAT_RUNNER_NAME, factory }];
}
