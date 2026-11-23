import type { IRunData } from 'n8n-workflow';

import type { ParityCase } from '../grammar/ir';

export type RawOutcome =
	| {
			kind: 'ran';
			/** The status as the engine reports it, for example `success` (v1) or `completed` (v2). */
			status: string;
			runData: IRunData;
			lastNodeExecuted?: string;
			error?: unknown;
			/** What the runner saw that does not show in the run data, for example a dropped edge. */
			notes?: string[];
	  }
	| { kind: 'refused'; reason: string }
	| { kind: 'timeout'; stalledAt: unknown };

export interface EngineRunner {
	readonly name: 'v1' | 'v2';
	/** Once for each worker. */
	start(): Promise<void>;
	run(parityCase: ParityCase): Promise<RawOutcome>;
	stop(): Promise<void>;
}

/** How long a case can run before the runner reports a timeout. */
export const CASE_TIMEOUT_MS = Number(process.env.PARITY_CASE_TIMEOUT_MS || 10_000);

export class TimeoutError extends Error {
	constructor(readonly ms: number) {
		super(`The case did not finish in ${ms} ms`);
	}
}

export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
				timer.unref();
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}
