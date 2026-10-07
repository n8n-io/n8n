import {
	atMost,
	currentLeader,
	fastLeaderElection,
	is,
	LEADER_HOOKS,
	leadershipEvents,
	msUntilLog,
	oneLeaderAtATime,
	RigStack,
	Scenario,
	signal,
} from '@n8n/test-rig';
import { expect, test } from '@playwright/test';

const TTL_S = 4;
const INTERVAL_S = 1;
const HANDOVER_LIMIT_MS = (TTL_S + 2 * INTERVAL_S) * 1000 + 2000;

test(
	'multi-main: a follower takes over within the lease when the leader is killed',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	async () => {
		test.setTimeout(300_000);

		const rig = await RigStack.start({
			name: 'leader-killed',
			mains: 2,
			workers: 1,
			runners: 'internal',
			scale: 1,
			hooks: LEADER_HOOKS,
			env: fastLeaderElection(TTL_S, INTERVAL_S),
		});
		const s = new Scenario('multi-main-leader-killed', rig, test.info().outputPath());

		await s.run(test.info(), async () => {
			const { leader, followers } = await currentLeader(rig);
			s.mark('leader', leader.name);

			let killedAt = 0;
			const handover = msUntilLog(
				followers.map((f) => f.container),
				' hit leader-takeover ',
				HANDOVER_LIMIT_MS + 10_000,
				() => killedAt,
			);
			killedAt = await signal(leader.container, 'SIGKILL');
			s.mark('leader-killed');
			const handoverMs = await handover;
			s.mark('follower-took-over', handoverMs);

			const events = [
				...(await leadershipEvents(rig)),
				{ instance: leader.name, at: killedAt, role: 'follower' as const },
			];
			await s.collectLogs();
			s.set({ leader: leader.name, handoverMs, events, leaderKey: await rig.redis.leader() });

			const failed = s.verify({
				always: [
					['handover within the lease and two checks', handoverMs, atMost(HANDOVER_LIMIT_MS)],
					['one leader at a time', oneLeaderAtATime(events), is([])],
				],
			});
			expect(failed).toEqual([]);
		});
	},
);
