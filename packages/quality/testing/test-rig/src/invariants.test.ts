import type { LeadershipEvent, RunRecord } from './invariants';
import {
	checkWorkload,
	everyExecutionFinished,
	everySuccessHasItsEffect,
	leaderOverlaps,
	noAcceptedRequestLost,
	noRepeatedEffects,
	oneLeaderAtATime,
	queueDrained,
} from './invariants';

const request = (requestId: string, status = 200) => ({ requestId, status, sentAt: 0, ms: 1 });

const healthy: RunRecord = {
	requests: [request('a'), request('b'), request('c', 0)],
	executions: { 1: 'success', 2: 'success' },
	effects: [
		{ requestId: 'a', executionId: '1' },
		{ requestId: 'b', executionId: '2' },
	],
	bull: { wait: [], active: [] },
};

describe('workload invariants', () => {
	it('find nothing wrong with a healthy run', () => {
		expect(checkWorkload(healthy)).toEqual([]);
	});

	it('flag an execution left running', () => {
		expect(
			everyExecutionFinished({ ...healthy, executions: { 1: 'success', 2: 'running' } }),
		).toEqual([{ invariant: 'every execution finished', detail: { 2: 'running' } }]);
	});

	it('flag an accepted request with no effect and no failed execution', () => {
		const lost = { ...healthy, effects: [healthy.effects[0]], executions: { 1: 'success' } };
		expect(noAcceptedRequestLost(lost)).toEqual([
			{
				invariant: 'no accepted request lost',
				detail: { missing: ['b'], unsuccessfulExecutions: 0 },
			},
		]);
	});

	it('accept a missing effect that a failed execution accounts for', () => {
		const failed = {
			...healthy,
			effects: [healthy.effects[0]],
			executions: { 1: 'success', 2: 'crashed' },
		};
		expect(noAcceptedRequestLost(failed)).toEqual([]);
	});

	it('flag a request or execution that wrote its effect twice', () => {
		const twice = {
			...healthy,
			effects: [...healthy.effects, { requestId: 'a', executionId: '3' }],
		};
		expect(noRepeatedEffects(twice)).toEqual([
			{ invariant: 'no repeated effects', detail: { requests: ['a'], executions: [] } },
		]);
		const sameExecution = {
			...healthy,
			effects: [...healthy.effects, { requestId: 'x', executionId: '1' }],
		};
		expect(noRepeatedEffects(sameExecution)[0]?.detail).toEqual({
			requests: [],
			executions: ['1'],
		});
	});

	it('flag a successful execution without its effect', () => {
		expect(everySuccessHasItsEffect({ ...healthy, effects: [healthy.effects[1]] })).toEqual([
			{ invariant: 'every success has its effect', detail: ['1'] },
		]);
	});

	it('flag jobs left in the queue', () => {
		expect(queueDrained({ ...healthy, bull: { wait: ['9'], active: [] } })).toEqual([
			{ invariant: 'queue drained', detail: { wait: ['9'], active: [] } },
		]);
	});
});

describe('leadership invariants', () => {
	const handover: LeadershipEvent[] = [
		{ instance: 'a', at: 0, role: 'leader' },
		{ instance: 'b', at: 100, role: 'leader' },
		{ instance: 'a', at: 130, role: 'follower' },
	];

	it('find the period in which two instances led', () => {
		expect(leaderOverlaps(handover)).toEqual([{ instances: ['a', 'b'], from: 100, to: 130 }]);
	});

	it('find no overlap in a clean handover, in any event order', () => {
		const clean: LeadershipEvent[] = [
			{ instance: 'b', at: 120, role: 'leader' },
			{ instance: 'a', at: 0, role: 'leader' },
			{ instance: 'a', at: 100, role: 'follower' },
		];
		expect(leaderOverlaps(clean)).toEqual([]);
	});

	it('treat a leader that never stepped down as leading until the end', () => {
		const stuck: LeadershipEvent[] = [
			{ instance: 'a', at: 0, role: 'leader' },
			{ instance: 'b', at: 50, role: 'leader' },
		];
		expect(leaderOverlaps(stuck, 80)).toEqual([{ instances: ['a', 'b'], from: 50, to: 80 }]);
	});

	it('allow an overlap within the tolerance', () => {
		expect(oneLeaderAtATime(handover, 30)).toEqual([]);
		expect(oneLeaderAtATime(handover, 29)[0]?.invariant).toBe('one leader at a time');
	});
});
