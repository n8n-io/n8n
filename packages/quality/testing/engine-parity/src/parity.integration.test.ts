import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { selectRuleSets } from './grammar/rules';
import { parityOptionsFromEnv, runParity } from './parity';
import { V1Runner } from './runners/v1-runner';
import { V2Runner } from './runners/v2-runner';

/**
 * Generates workflows from the rule sets in `PARITY_RULES`, runs each one on
 * engine v1 and engine v2, and compares the results. `PARITY_SEED`,
 * `PARITY_RUNS` and `PARITY_PATH` select the cases.
 */
describe('engine parity (integration)', () => {
	const runners = { v1: new V1Runner(), v2: new V2Runner() };
	const options = parityOptionsFromEnv();

	beforeAll(async () => {
		await runners.v1.start();
		await runners.v2.start();
	});

	afterAll(async () => {
		await runners.v2.stop();
		await runners.v1.stop();
	});

	describe.each(selectRuleSets())('rule set $name', (rules) => {
		it(`engine v1 and engine v2 agree (seed ${options.seed}, ${options.numRuns} runs)`, async () => {
			const failures = await runParity(rules, runners, options);

			expect(
				failures.map(({ path, result }) => ({ path, failures: result.failures })),
				`Engine v1 and engine v2 differ. Seed ${options.seed}. Paths: ${failures.map(({ path }) => path).join(', ')}`,
			).toEqual([]);
		});
	});
});
