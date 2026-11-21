import type { LeadershipEvent } from './invariants';
import { leaderOverlaps, oneLeaderAtATime } from './invariants';

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
