import type { BullState } from './probes';
import { FINAL_STATUSES } from './probes';
import type { Effect, WorkloadRequest } from './workload';

export interface Violation {
	invariant: string;
	detail: unknown;
}

export interface RunRecord {
	requests: WorkloadRequest[];
	/** Status of every execution of the workload workflow, by id. */
	executions: Record<string, string>;
	effects: Effect[];
	bull: Pick<BullState, 'wait' | 'active'>;
}

const accepted = (requests: WorkloadRequest[]) => requests.filter((r) => r.status === 200);

const repeated = (values: string[]) => {
	const counts = new Map<string, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	return [...counts].filter(([, count]) => count > 1).map(([value]) => value);
};

/** Every execution reached a final status. */
export function everyExecutionFinished({ executions }: RunRecord): Violation[] {
	const pending = Object.entries(executions).filter(
		([, status]) => !(FINAL_STATUSES as readonly string[]).includes(status),
	);
	return pending.length
		? [{ invariant: 'every execution finished', detail: Object.fromEntries(pending) }]
		: [];
}

/** An accepted request has its effect, or an execution that ended without success accounts for it. */
export function noAcceptedRequestLost({ requests, executions, effects }: RunRecord): Violation[] {
	const done = new Set(effects.map((e) => e.requestId));
	const missing = accepted(requests).filter((r) => !done.has(r.requestId));
	const unsuccessful = Object.values(executions).filter((status) => status !== 'success').length;
	return missing.length > unsuccessful
		? [
				{
					invariant: 'no accepted request lost',
					detail: {
						missing: missing.map((r) => r.requestId),
						unsuccessfulExecutions: unsuccessful,
					},
				},
			]
		: [];
}

/** No request and no execution wrote its effect more than once. */
export function noRepeatedEffects({ effects }: RunRecord): Violation[] {
	const requests = repeated(effects.map((e) => e.requestId));
	const executions = repeated(effects.map((e) => e.executionId));
	return requests.length || executions.length
		? [{ invariant: 'no repeated effects', detail: { requests, executions } }]
		: [];
}

/** Every successful execution wrote exactly one effect. */
export function everySuccessHasItsEffect({ executions, effects }: RunRecord): Violation[] {
	const written = new Set(effects.map((e) => e.executionId));
	const without = Object.entries(executions)
		.filter(([id, status]) => status === 'success' && !written.has(id))
		.map(([id]) => id);
	return without.length ? [{ invariant: 'every success has its effect', detail: without }] : [];
}

/** Nothing is left waiting or active in the queue. */
export function queueDrained({ bull }: RunRecord): Violation[] {
	return bull.wait.length || bull.active.length
		? [{ invariant: 'queue drained', detail: { wait: bull.wait, active: bull.active } }]
		: [];
}

export const WORKLOAD_INVARIANTS = [
	everyExecutionFinished,
	noAcceptedRequestLost,
	noRepeatedEffects,
	everySuccessHasItsEffect,
	queueDrained,
];

export function checkWorkload(record: RunRecord): Violation[] {
	return WORKLOAD_INVARIANTS.flatMap((invariant) => invariant(record));
}

export interface LeadershipEvent {
	instance: string;
	at: number;
	role: 'leader' | 'follower';
}

export interface Overlap {
	instances: [string, string];
	from: number;
	to: number;
}

/** Periods in which two instances both believed they led, from takeover and step-down events. */
export function leaderOverlaps(
	events: LeadershipEvent[],
	until = Number.POSITIVE_INFINITY,
): Overlap[] {
	const terms: Array<{ instance: string; from: number; to: number }> = [];
	const open = new Map<string, number>();
	for (const event of [...events].sort((a, b) => a.at - b.at)) {
		const since = open.get(event.instance);
		if (event.role === 'leader' && since === undefined) open.set(event.instance, event.at);
		if (event.role === 'follower' && since !== undefined) {
			terms.push({ instance: event.instance, from: since, to: event.at });
			open.delete(event.instance);
		}
	}
	for (const [instance, from] of open) terms.push({ instance, from, to: until });
	const overlaps: Overlap[] = [];
	for (let i = 0; i < terms.length; i++) {
		for (let j = i + 1; j < terms.length; j++) {
			const [a, b] = [terms[i], terms[j]];
			const from = Math.max(a.from, b.from);
			const to = Math.min(a.to, b.to);
			if (a.instance !== b.instance && from < to)
				overlaps.push({ instances: [a.instance, b.instance], from, to });
		}
	}
	return overlaps;
}

/** At most one leader at a time, allowing overlaps up to `toleranceMs`. */
export function oneLeaderAtATime(
	events: LeadershipEvent[],
	toleranceMs = 0,
	until?: number,
): Violation[] {
	const long = leaderOverlaps(events, until).filter((o) => o.to - o.from > toleranceMs);
	return long.length ? [{ invariant: 'one leader at a time', detail: long }] : [];
}
