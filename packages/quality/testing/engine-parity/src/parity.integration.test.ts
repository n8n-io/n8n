import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { selectRuleSets } from './grammar/rules';
import { parityOptionsFromEnv, runParity } from './parity';
import { V1Runner } from './runners/v1-runner';
import { V2Runner } from './runners/v2-runner';

/**
 * Generates workflows from the rule sets in `PARITY_RULES`, runs each one on
 * engine v1 and engine v2, and compares the results. See the README for the
 * environment variables.
 */
describe('engine parity (integration)', () => {
	const runners = { v1: new V1Runner(), v2: new V2Runner() };
	const options = parityOptionsFromEnv(join(__dirname, '..'));

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
			const { report, failures, summaryFile } = await runParity(rules, runners, options);

			// Not `console`: the nodes log to the console, and the shared config hides it.
			process.stdout.write(`\n${report.toMarkdown()}\nSummary: ${summaryFile}\n`);

			expect(
				failures,
				`Engine v1 and engine v2 differ. Seed ${options.seed}. Repro files: ${failures.map(({ file }) => file).join(', ')}`,
			).toEqual([]);
		});
	});
});
