import { checkEngineV2Eligibility } from '@n8n/workflow-engine-check';
import fc from 'fast-check';
import type { IWorkflowBase } from 'n8n-workflow';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { parityCaseArb } from './grammar/arbitrary';
import { getEntry, outputCount } from './grammar/catalog';
import type { ParityCase } from './grammar/ir';
import type { ParityRules } from './grammar/rules';
import { compare } from './oracle/compare';
import type { Diff } from './oracle/compare';
import { matchKnownDivergence } from './oracle/known-divergences';
import { normalize } from './oracle/normalize';
import type { Outcome } from './oracle/normalize';
import { CoverageReport } from './report/coverage';
import { buildRepro, writeRepro } from './report/repro';
import { diffSignature, findingFailsRun, findingSignature } from './report/signature';
import type { Finding } from './report/signature';
import type { EngineRunner, RawOutcome } from './runners/runner';

export interface Runners {
	v1: EngineRunner;
	v2: EngineRunner;
}

export interface CaseResult {
	verdict: 'discarded' | 'pass' | 'finding' | 'fail';
	raw: { v1?: RawOutcome; v2?: RawOutcome };
	outcomes: { v1?: Outcome; v2?: Outcome };
	/** Differences of severity `fail` that no known divergence explains. */
	failures: Diff[];
	warnings: Diff[];
	findings: Finding[];
	/** The IDs of the known divergences that explain a difference. */
	known: string[];
}

/** Edges from or into a port that the node does not have. */
function findPortsOutOfRange(parityCase: ParityCase): Finding[] {
	const nodes = new Map(
		[...parityCase.ir.triggers, ...parityCase.ir.nodes].map((irNode) => [irNode.key, irNode]),
	);
	return parityCase.ir.edges.flatMap((edge): Finding[] => {
		const from = nodes.get(edge.from);
		const to = nodes.get(edge.to);
		if (!from || !to) return [];
		const fromEntry = getEntry(from.catalogId);
		const outputs = outputCount(fromEntry, from.params) + (from.flags?.onError ? 1 : 0);
		const inputs = getEntry(to.catalogId).inputs;
		if (edge.out < outputs && edge.in < inputs) return [];
		return [
			{
				kind: 'portOutOfRange',
				engine: 'check',
				message: `The check accepts the edge ${edge.from}[${edge.out}] -> ${edge.to}[${edge.in}], but "${edge.from}" has ${outputs} outputs and "${edge.to}" has ${inputs} inputs`,
				detail: edge,
			},
		];
	});
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
	report?: CoverageReport,
): Promise<CaseResult> {
	// The check does not follow sub-workflows, so each one is checked on its own.
	const blocking = [
		...blockingCodes(parityCase.workflow),
		...Object.values(parityCase.subWorkflows).flatMap((subWorkflow) =>
			blockingCodes(subWorkflow).map((code) => `SUB_WORKFLOW:${code}`),
		),
	];
	const isNew = report?.recordCase(parityCase, blocking) ?? false;
	const result: CaseResult = {
		verdict: 'discarded',
		raw: {},
		outcomes: {},
		failures: [],
		warnings: [],
		findings: [],
		known: [],
	};
	if (blocking.length > 0) return result;

	result.raw.v1 = await runners.v1.run(parityCase);
	result.raw.v2 = await runners.v2.run(parityCase);
	result.findings.push(
		...findPortsOutOfRange(parityCase),
		...runnerFindings('v1', result.raw.v1),
		...runnerFindings('v2', result.raw.v2),
	);

	result.outcomes.v1 = normalize(result.raw.v1, parityCase);
	result.outcomes.v2 = normalize(result.raw.v2, parityCase);
	if (result.outcomes.v1 && result.outcomes.v2) {
		for (const diff of compare(result.outcomes.v1, result.outcomes.v2, parityCase, rules)) {
			const known = matchKnownDivergence(diff, parityCase);
			if (known) result.known.push(known);
			else if (diff.severity === 'fail') result.failures.push(diff);
			else result.warnings.push(diff);
		}
	}

	result.verdict =
		result.failures.length > 0 ? 'fail' : result.findings.length > 0 ? 'finding' : 'pass';

	if (isNew && report) {
		for (const diff of result.failures) report.recordFailure(diffSignature(diff, parityCase), diff);
		for (const diff of result.warnings) report.recordWarning(diffSignature(diff, parityCase), diff);
		for (const finding of result.findings) {
			report.recordFinding(findingSignature(finding), finding.message, finding);
		}
		for (const id of result.known) report.recordKnown(id);
	}
	return result;
}

export interface ParityOptions {
	seed: number;
	numRuns: number;
	outDir: string;
	/** How long to shrink one failure. */
	shrinkTimeMs: number;
	/** Runs only this fast-check path, for example from a repro file. */
	path?: string;
}

export function parityOptionsFromEnv(packageDir: string): ParityOptions {
	const env = process.env;
	return {
		seed: env.PARITY_SEED ? Number(env.PARITY_SEED) : Math.floor(Math.random() * 2 ** 31),
		numRuns: Number(env.PARITY_RUNS || 200),
		outDir: env.PARITY_OUT_DIR || join(packageDir, 'parity-failures'),
		shrinkTimeMs: Number(env.PARITY_SHRINK_MS || 120_000),
		path: env.PARITY_PATH || undefined,
	};
}

export interface ParityResult {
	report: CoverageReport;
	/** One repro file for each failure signature. */
	failures: Array<{ signature: string; file: string }>;
	summaryFile: string;
}

type FirstSeen = { path: string; parityCase: ParityCase; result: CaseResult };

/**
 * Generates cases from the rules and runs each one on both engines. Nothing
 * stops the run at the first failure: each failure signature keeps the first
 * case that showed it. Then each signature shrinks on its own, from the
 * fast-check path of that case, to the smallest case with the same signature.
 */
export async function runParity(
	rules: ParityRules,
	runners: Runners,
	options: ParityOptions,
): Promise<ParityResult> {
	const report = new CoverageReport(rules.name, options.seed);
	// Each rule set writes to its own folder. Files of an earlier run would read as new failures.
	const outDir = join(options.outDir, rules.name);
	rmSync(outDir, { recursive: true, force: true });
	const arbitrary = parityCaseArb(rules);
	const failing = new Map<string, FirstSeen>();
	const findings = new Map<string, FirstSeen & { failsRun: boolean }>();

	let index = 0;
	// The property returns true for differences, so the run continues. An exception still fails it.
	await fc.assert(
		fc.asyncProperty(arbitrary, async (parityCase) => {
			// The fast-check path of this case. A replayed path runs one case.
			const path = options.path ?? String(index++);
			const result = await checkCase(parityCase, runners, rules, report);
			for (const diff of result.failures) {
				const signature = diffSignature(diff, parityCase);
				if (!failing.has(signature)) failing.set(signature, { path, parityCase, result });
			}
			for (const finding of result.findings) {
				const signature = findingSignature(finding);
				if (!findings.has(signature)) {
					findings.set(signature, { path, parityCase, result, failsRun: findingFailsRun(finding) });
				}
			}
			return true;
		}),
		{
			seed: options.seed,
			numRuns: options.path ? 1 : options.numRuns,
			...(options.path ? { path: options.path } : {}),
		},
	);

	const failures: ParityResult['failures'] = [];
	for (const [signature, first] of failing) {
		const shrunk = await shrinkSignature(arbitrary, signature, first, runners, rules, options);
		const file = writeRepro(
			outDir,
			buildRepro({
				signature,
				rules: rules.name,
				seed: options.seed,
				path: shrunk.path,
				parityCase: shrunk.parityCase,
				raw: shrunk.result.raw,
				outcomes: shrunk.result.outcomes,
				diffs: [...shrunk.result.failures, ...shrunk.result.warnings],
				findings: shrunk.result.findings,
			}),
		);
		report.repros[signature] = file;
		failures.push({ signature, file });
	}

	// Repro files of findings are not shrunk.
	for (const [signature, first] of findings) {
		const file = writeRepro(
			outDir,
			buildRepro({
				signature,
				rules: rules.name,
				seed: options.seed,
				path: first.path,
				parityCase: first.parityCase,
				raw: first.result.raw,
				outcomes: first.result.outcomes,
				diffs: [...first.result.failures, ...first.result.warnings],
				findings: first.result.findings,
			}),
		);
		report.repros[signature] = file;
		if (first.failsRun) failures.push({ signature, file });
	}

	return { report, failures, summaryFile: report.write(outDir) };
}

async function shrinkSignature(
	arbitrary: fc.Arbitrary<ParityCase>,
	signature: string,
	first: FirstSeen,
	runners: Runners,
	rules: ParityRules,
	options: ParityOptions,
): Promise<{ parityCase: ParityCase; result: CaseResult; path: string }> {
	const hasSignature = (parityCase: ParityCase, result: CaseResult) =>
		result.failures.some((diff) => diffSignature(diff, parityCase) === signature);

	const details = await fc.check(
		fc.asyncProperty(arbitrary, async (parityCase) => {
			const result = await checkCase(parityCase, runners, rules);
			return !hasSignature(parityCase, result);
		}),
		{
			seed: options.seed,
			path: first.path,
			numRuns: 1,
			interruptAfterTimeLimit: options.shrinkTimeMs,
			markInterruptAsFailure: false,
		},
	);

	if (details.failed && details.counterexample) {
		const [parityCase] = details.counterexample;
		const result = await checkCase(parityCase, runners, rules);
		if (hasSignature(parityCase, result)) {
			return { parityCase, result, path: details.counterexamplePath ?? first.path };
		}
	}
	// The shrink did not reproduce the failure: keep the case that showed it first.
	return { parityCase: first.parityCase, result: first.result, path: first.path };
}
