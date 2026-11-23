/**
 * Runs one repro file on both engines and prints the differences.
 *
 *   pnpm parity:replay parity-failures/smoke/L2.merge-merge.items.json
 *
 * Needs a container runtime for the Postgres database of engine v2.
 */
// First: n8n settings read the user folder when n8n-core loads.
import { removeTestUserFolder } from './runners/test-user-folder';

import { resolve } from 'node:path';

import { ruleSets } from './grammar/rules';
import { checkCase } from './parity';
import { readRepro, reproCase } from './report/repro';
import { diffSignature, findingSignature } from './report/signature';
import { startExpressionEngine, stopExpressionEngine } from './runners/expression-engine';
import { V1Runner } from './runners/v1-runner';
import { V2Runner } from './runners/v2-runner';

async function main(file: string | undefined): Promise<number> {
	if (!file) {
		process.stderr.write('Usage: pnpm parity:replay <repro file>\n');
		return 2;
	}
	const repro = readRepro(resolve(process.env.INIT_CWD ?? process.cwd(), file));
	const parityCase = reproCase(repro);
	const rules = ruleSets[repro.rules] ?? ruleSets.smoke;
	const runners = { v1: new V1Runner(), v2: new V2Runner() };

	await startExpressionEngine();
	await runners.v1.start();
	await runners.v2.start();
	try {
		const result = await checkCase(parityCase, runners, rules);
		const lines = [
			`Repro: ${repro.signature} (rule set ${repro.rules}, seed ${repro.seed}, path ${repro.path})`,
			`Verdict: ${result.verdict}`,
			'',
			...result.failures.map(
				(diff) =>
					`FAIL ${diffSignature(diff, parityCase)}: ${diff.message}\n  v1: ${JSON.stringify(diff.v1)}\n  v2: ${JSON.stringify(diff.v2)}`,
			),
			...result.warnings.map((diff) => `WARN ${diffSignature(diff, parityCase)}: ${diff.message}`),
			...result.findings.map((finding) => `FIND ${findingSignature(finding)}: ${finding.message}`),
			...result.known.map((id) => `KNOWN ${id}`),
		];
		process.stdout.write(`${lines.join('\n')}\n`);
		return result.failures.length > 0 ? 1 : 0;
	} finally {
		await runners.v2.stop();
		await runners.v1.stop();
		await stopExpressionEngine();
		removeTestUserFolder();
	}
}

main(process.argv[2]).then(
	(code) => process.exit(code),
	(error: unknown) => {
		process.stderr.write(
			`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
		);
		process.exit(1);
	},
);
