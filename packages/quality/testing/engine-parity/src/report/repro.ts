import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { jsonParse } from 'n8n-workflow';
import type { IWorkflowBase } from 'n8n-workflow';

import { toSdkCode } from '../compile/to-sdk';
import type { IrWorkflow, ParityCase } from '../grammar/ir';
import type { Diff } from '../oracle/compare';
import type { Outcome } from '../oracle/normalize';
import type { RawOutcome } from '../runners/runner';
import type { Finding } from './signature';

export interface Repro {
	signature: string;
	rules: string;
	seed: number;
	/** The fast-check path of the shrunk case. Replay it with `PARITY_SEED` and `PARITY_PATH`. */
	path: string;
	ir: IrWorkflow;
	workflow: IWorkflowBase;
	/** The workflow as `@n8n/workflow-sdk` code. */
	sdkCode: string;
	raw: { v1: unknown; v2: unknown };
	outcomes: { v1?: Outcome; v2?: Outcome };
	diffs: Diff[];
	findings: Finding[];
}

/** The parts of a raw outcome that a reader needs. The run data is in `outcomes`. */
function summarizeRaw(raw: RawOutcome | undefined): unknown {
	if (!raw || raw.kind !== 'ran') return raw;
	const error: unknown = raw.error;
	return {
		kind: raw.kind,
		status: raw.status,
		lastNodeExecuted: raw.lastNodeExecuted,
		error:
			typeof error === 'object' && error !== null
				? {
						name: 'name' in error ? error.name : undefined,
						message: 'message' in error ? error.message : undefined,
						description: 'description' in error ? error.description : undefined,
					}
				: error,
		notes: raw.notes,
	};
}

export function buildRepro(args: {
	signature: string;
	rules: string;
	seed: number;
	path: string;
	parityCase: ParityCase;
	raw: { v1?: RawOutcome; v2?: RawOutcome };
	outcomes: { v1?: Outcome; v2?: Outcome };
	diffs: Diff[];
	findings: Finding[];
}): Repro {
	const { parityCase } = args;
	return {
		signature: args.signature,
		rules: args.rules,
		seed: args.seed,
		path: args.path,
		ir: parityCase.ir,
		workflow: parityCase.workflow,
		sdkCode: toSdkCode(parityCase.ir),
		raw: { v1: summarizeRaw(args.raw.v1), v2: summarizeRaw(args.raw.v2) },
		outcomes: args.outcomes,
		diffs: args.diffs,
		findings: args.findings,
	};
}

export function writeRepro(dir: string, repro: Repro): string {
	mkdirSync(dir, { recursive: true });
	const file = join(dir, `${repro.signature}.json`);
	writeFileSync(file, `${JSON.stringify(repro, null, 2)}\n`);
	return file;
}

export function readRepro(file: string): Repro {
	return jsonParse<Repro>(readFileSync(file, 'utf8'));
}

/** The case of a repro file, ready to run again. */
export function reproCase(repro: Repro): ParityCase {
	return { ir: repro.ir, workflow: repro.workflow };
}
