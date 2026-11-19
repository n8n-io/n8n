import type { BullState } from './probes';
import { ENGINE_FINAL_STATUSES, FINAL_STATUSES } from './probes';
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

const repeated = (values: string[]) => {
	const counts = new Map<string, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	return [...counts].filter(([, count]) => count > 1).map(([value]) => value);
};

/** Every execution reached a final status. */
export function everyExecutionFinished({ executions }: RunRecord): Violation[] {
	const pending = Object.entries(executions).filter(
		([, status]) => !FINAL_STATUSES.includes(status),
	);
	return pending.length
		? [{ invariant: 'every execution finished', detail: Object.fromEntries(pending) }]
		: [];
}

/** An accepted request has the effect of the execution it started, or an execution that ended without success accounts for it. */
export function noAcceptedRequestLost({ requests, executions, effects }: RunRecord): Violation[] {
	const pairs = new Set(effects.map((e) => `${e.requestId}|${e.executionId}`));
	const done = new Set(effects.map((e) => e.requestId));
	const lost = requests
		.filter((r) => r.accepted)
		.filter((r) =>
			r.executionId ? !pairs.has(`${r.requestId}|${r.executionId}`) : !done.has(r.requestId),
		)
		.filter((r) => {
			const status = r.executionId && executions[r.executionId];
			return !status || status === 'success';
		})
		.map((r) => r.requestId);
	return lost.length ? [{ invariant: 'no accepted request lost', detail: { missing: lost } }] : [];
}

/** No request and no execution wrote its effect more than once. */
export function noRepeatedEffects({ effects }: Pick<RunRecord, 'effects'>): Violation[] {
	const requests = repeated(effects.map((e) => e.requestId));
	const executions = repeated(effects.map((e) => e.executionId));
	return requests.length || executions.length
		? [{ invariant: 'no repeated effects', detail: { requests, executions } }]
		: [];
}

/** Every successful execution wrote at least one effect. */
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

const WORKLOAD_INVARIANTS = [
	everyExecutionFinished,
	noAcceptedRequestLost,
	noRepeatedEffects,
	everySuccessHasItsEffect,
	queueDrained,
];

export function checkWorkload(record: RunRecord): Violation[] {
	return WORKLOAD_INVARIANTS.flatMap((invariant) => invariant(record));
}

export interface EngineExecution {
	id: string;
	status: string;
	/** The `requestId` of the webhook body that started it, or '' when its trigger output has none. */
	requestId: string;
	/** Steps in `queued`, `running` or `waiting`. */
	liveSteps: number;
}

export interface EngineRunRecord {
	requests: WorkloadRequest[];
	/** Every engine v2 execution of the workload workflow. */
	executions: EngineExecution[];
	effects: Effect[];
}

/** Every accepted request started exactly one engine execution, the one its response named. */
export function everyAcceptedRequestHasOneExecution({
	requests,
	executions,
}: EngineRunRecord): Violation[] {
	const byRequest = new Map<string, string[]>();
	for (const { id, requestId } of executions)
		byRequest.set(requestId, [...(byRequest.get(requestId) ?? []), id]);
	const wrong = requests
		.filter((r) => r.status === 200)
		.map((r) => ({
			requestId: r.requestId,
			answered: r.executionId,
			found: byRequest.get(r.requestId) ?? [],
		}))
		.filter(
			({ answered, found }) =>
				found.length !== 1 || (answered !== undefined && found[0] !== answered),
		);
	return wrong.length
		? [{ invariant: 'every accepted request has one execution', detail: wrong }]
		: [];
}

/** Every engine execution reached a final status. */
export function everyEngineExecutionFinished({ executions }: EngineRunRecord): Violation[] {
	const pending = executions.filter((e) => !ENGINE_FINAL_STATUSES.includes(e.status));
	return pending.length
		? [
				{
					invariant: 'every execution finished',
					detail: Object.fromEntries(pending.map((e) => [e.id, e.status])),
				},
			]
		: [];
}

/** No execution is `running` with no step left that could move it on. */
export function noRunningExecutionWithoutLiveStep({ executions }: EngineRunRecord): Violation[] {
	const stranded = executions
		.filter((e) => e.status === 'running' && e.liveSteps === 0)
		.map((e) => e.id);
	return stranded.length
		? [{ invariant: 'no running execution without a live step', detail: stranded }]
		: [];
}

const ENGINE_INVARIANTS = [
	everyAcceptedRequestHasOneExecution,
	everyEngineExecutionFinished,
	noRunningExecutionWithoutLiveStep,
	noRepeatedEffects,
];

export function checkEngineWorkload(record: EngineRunRecord): Violation[] {
	return ENGINE_INVARIANTS.flatMap((invariant) => invariant(record));
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
			if (from < to) overlaps.push({ instances: [a.instance, b.instance], from, to });
		}
	}
	return overlaps;
}

/** At most one leader at a time, allowing overlaps up to `toleranceMs`. */
export function oneLeaderAtATime(events: LeadershipEvent[], toleranceMs = 0): Violation[] {
	const long = leaderOverlaps(events).filter((o) => o.to - o.from > toleranceMs);
	return long.length ? [{ invariant: 'one leader at a time', detail: long }] : [];
}
