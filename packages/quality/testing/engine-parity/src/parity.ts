import { checkEngineV2Eligibility } from '@n8n/workflow-engine-check';
import fc from 'fast-check';
import type { IWorkflowBase } from 'n8n-workflow';

import { parityCaseArb } from './grammar/arbitrary';
import type { ParityCase } from './grammar/ir';
import type { ParityRules } from './grammar/rules';
import { compare } from './oracle/compare';
import type { Diff } from './oracle/compare';
import { normalize } from './oracle/normalize';
import type { Outcome } from './oracle/normalize';
import type { EngineRunner, RawOutcome } from './runners/runner';

export interface Runners {
	v1: EngineRunner;
	v2: EngineRunner;
}

/**
 * A finding of level E: the eligibility check accepts the case, but an engine
 * does not run it, or the converted graph is not the workflow.
 */
export interface Finding {
	kind: 'refused' | 'timeout' | 'droppedEdge';
	engine: 'v1' | 'v2';
	message: string;
	detail?: unknown;
}

export interface CaseResult {
	verdict: 'discarded' | 'pass' | 'finding' | 'fail';
	raw: { v1?: RawOutcome; v2?: RawOutcome };
	outcomes: { v1?: Outcome; v2?: Outcome };
	/** Differences of severity `fail` that no known divergence explains. */
	failures: Diff[];
	warnings: Diff[];
	findings: Finding[];
}

function runnerFindings(engine: 'v1' | 'v2', raw: RawOutcome): Finding[] {
	if (raw.kind === 'refused') {
		return [
			{ kind: 'refused', engine, message: `Engine ${engine} refused the case: ${raw.reason}` },
		];
	}
	if (raw.kind === 'timeout') {
		return [
			{
				kind: 'timeout',
				engine,
				message: `Engine ${engine} did not finish the case`,
				detail: raw.stalledAt,
			},
		];
	}
	return (raw.notes ?? []).map((note) => ({ kind: 'droppedEdge', engine, message: note }));
}

function blockingCodes(workflow: IWorkflowBase): string[] {
	return checkEngineV2Eligibility(workflow)
		.reasons.filter((reason) => reason.severity === 'blocking')
		.map((reason) => reason.code);
}

/** Runs one case on both engines and compares the results. */
export async function checkCase(
	parityCase: ParityCase,
	runners: Runners,
	rules: ParityRules,
): Promise<CaseResult> {
	const blocking = blockingCodes(parityCase.workflow);
	const result: CaseResult = {
		verdict: 'discarded',
		raw: {},
		outcomes: {},
		failures: [],
		warnings: [],
		findings: [],
	};
	if (blocking.length > 0) return result;

	result.raw.v1 = await runners.v1.run(parityCase);
	result.raw.v2 = await runners.v2.run(parityCase);
	result.findings.push(
		...runnerFindings('v1', result.raw.v1),
		...runnerFindings('v2', result.raw.v2),
	);

	result.outcomes.v1 = normalize(result.raw.v1, parityCase);
	result.outcomes.v2 = normalize(result.raw.v2, parityCase);
	if (result.outcomes.v1 && result.outcomes.v2) {
		for (const diff of compare(result.outcomes.v1, result.outcomes.v2, parityCase, rules)) {
			if (diff.severity === 'fail') result.failures.push(diff);
			else result.warnings.push(diff);
		}
	}

	result.verdict =
		result.failures.length > 0 ? 'fail' : result.findings.length > 0 ? 'finding' : 'pass';

	return result;
}

export interface ParityOptions {
	seed: number;
	numRuns: number;
	/** Runs only this fast-check path. */
	path?: string;
}

export function parityOptionsFromEnv(): ParityOptions {
	const env = process.env;
	return {
		seed: env.PARITY_SEED ? Number(env.PARITY_SEED) : Math.floor(Math.random() * 2 ** 31),
		numRuns: Number(env.PARITY_RUNS || 200),
		path: env.PARITY_PATH || undefined,
	};
}

export interface ParityFailure {
	/** The fast-check path of the case. Run it again with `PARITY_SEED` and `PARITY_PATH`. */
	path: string;
	parityCase: ParityCase;
	result: CaseResult;
}

/**
 * Generates cases from the rules and runs each one on both engines. Nothing
 * stops the run at the first failure, so one run shows every failing case.
 */
export async function runParity(
	rules: ParityRules,
	runners: Runners,
	options: ParityOptions,
): Promise<ParityFailure[]> {
	const failures: ParityFailure[] = [];
	let index = 0;
	await fc.check(
		fc.asyncProperty(parityCaseArb(rules), async (parityCase) => {
			// The fast-check path of this case. A replayed path runs one case.
			const path = options.path ?? String(index++);
			const result = await checkCase(parityCase, runners, rules);
			if (result.failures.length > 0) failures.push({ path, parityCase, result });
			return true;
		}),
		{
			seed: options.seed,
			numRuns: options.path ? 1 : options.numRuns,
			...(options.path ? { path: options.path } : {}),
		},
	);
	return failures;
}
