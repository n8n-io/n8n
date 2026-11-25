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

/** The largest delay that `setTimeout` accepts. A larger delay fires at once. */
const MAX_TIMER_MS = 2 ** 31 - 1;

export function parseCaseTimeout(value: string | undefined): number {
	if (!value) return 10_000;
	const ms = Number(value);
	if (!Number.isInteger(ms) || ms <= 0 || ms > MAX_TIMER_MS) {
		throw new Error(
			`PARITY_CASE_TIMEOUT_MS must be a whole number from 1 to ${MAX_TIMER_MS}, got "${value}"`,
		);
	}
	return ms;
}

/** How long a case can run before the runner reports a timeout. */
export const CASE_TIMEOUT_MS = parseCaseTimeout(process.env.PARITY_CASE_TIMEOUT_MS);

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
