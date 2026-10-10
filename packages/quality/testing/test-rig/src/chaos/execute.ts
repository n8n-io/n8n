import type { Fault, ScheduledFault } from './schedule';

export interface AppliedFault extends ScheduledFault {
	startedMs: number;
	endedMs: number;
	error?: string;
}

export interface Clock {
	now: () => number;
	sleep: (ms: number) => Promise<void>;
}

/**
 * Applies each fault at its time. Faults overlap: one starts while another
 * still lasts. A fault that fails is recorded and the schedule goes on.
 */
export async function runSchedule(
	schedule: ScheduledFault[],
	apply: (fault: Fault) => Promise<void>,
	clock: Clock,
): Promise<AppliedFault[]> {
	const start = clock.now();
	const running: Array<Promise<AppliedFault>> = [];
	for (const entry of [...schedule].sort((a, b) => a.atMs - b.atMs)) {
		const wait = entry.atMs - (clock.now() - start);
		if (wait > 0) await clock.sleep(wait);
		const startedMs = clock.now() - start;
		running.push(
			apply(entry.fault).then(
				() => ({ ...entry, startedMs, endedMs: clock.now() - start }),
				(error: unknown) => ({
					...entry,
					startedMs,
					endedMs: clock.now() - start,
					error: error instanceof Error ? error.message : String(error),
				}),
			),
		);
	}
	return await Promise.all(running);
}
