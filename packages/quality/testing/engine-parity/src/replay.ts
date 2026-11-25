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

import { selectRuleSets } from './grammar/rules';
import { checkCase } from './parity';
import { readRepro, reproCase } from './report/repro';
import { diffSignature, findingFailsRun, findingSignature } from './report/signature';
import { startExpressionEngine, stopExpressionEngine } from './runners/expression-engine';
import { V1Runner } from './runners/v1-runner';
import { V2Runner } from './runners/v2-runner';

function write(stream: NodeJS.WriteStream, text: string): Promise<void> {
	return new Promise((done) => stream.write(text, () => done()));
}

async function replay(file: string): Promise<number> {
	const repro = readRepro(resolve(process.env.INIT_CWD ?? process.cwd(), file));
	const parityCase = reproCase(repro);
	// Fails on an unknown rule set: other rules can change the verdict.
	const [rules] = selectRuleSets(repro.rules);
	const runners = { v1: new V1Runner(), v2: new V2Runner() };

	try {
		await startExpressionEngine();
		await runners.v1.start();
		await runners.v2.start();
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
		await write(process.stdout, `${lines.join('\n')}\n`);
		// The same verdict as the parity run: refusals and timeouts fail it too.
		const failed = result.failures.length > 0 || result.findings.some(findingFailsRun);
		return failed ? 1 : 0;
	} finally {
		// Also after a failed start: the Postgres container must not keep running.
		await Promise.allSettled([runners.v2.stop(), runners.v1.stop()]);
		await stopExpressionEngine().catch(() => undefined);
	}
}

async function main(file: string | undefined): Promise<number> {
	try {
		if (!file) {
			await write(process.stderr, 'Usage: pnpm parity:replay <repro file>\n');
			return 2;
		}
		return await replay(file);
	} catch (error) {
		await write(
			process.stderr,
			`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
		);
		return 1;
	} finally {
		removeTestUserFolder();
	}
}

// Open handles can keep the process alive, so exit when the output is written.
void main(process.argv[2]).then((code) => process.exit(code));
