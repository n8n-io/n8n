import type { Fault, ScheduledFault } from './schedule';

export interface AppliedFault extends ScheduledFault {
	startedMs: number;
	endedMs: number;
	error?: string;
	hit?: boolean;
}

export interface Clock {
	now: () => number;
	sleep: (ms: number) => Promise<void>;
}

/**
 * Applies each fault at its time. Faults on different targets overlap; a fault
 * on a busy target waits until the fault before it on that target ends. A fault
 * that fails is recorded and the schedule goes on.
 */
export async function runSchedule(
	schedule: ScheduledFault[],
	apply: (fault: Fault) => Promise<Pick<AppliedFault, 'hit'> | undefined>,
	clock: Clock,
): Promise<AppliedFault[]> {
	const start = clock.now();
	const running: Array<Promise<AppliedFault>> = [];
	const busy = new Map<string, Promise<AppliedFault>>();
	for (const entry of [...schedule].sort((a, b) => a.atMs - b.atMs)) {
		const wait = entry.atMs - (clock.now() - start);
		if (wait > 0) await clock.sleep(wait);
		const applied = (busy.get(entry.fault.target) ?? Promise.resolve()).then(async () => {
			const startedMs = clock.now() - start;
			return await apply(entry.fault).then(
				(outcome) => ({ ...entry, ...outcome, startedMs, endedMs: clock.now() - start }),
				(error: unknown) => ({
					...entry,
					startedMs,
					endedMs: clock.now() - start,
					error: error instanceof Error ? error.message : String(error),
				}),
			);
		});
		busy.set(entry.fault.target, applied);
		running.push(applied);
	}
	return await Promise.all(running);
}
