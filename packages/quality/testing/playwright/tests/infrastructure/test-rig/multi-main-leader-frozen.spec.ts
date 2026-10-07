import {
	atMost,
	currentLeader,
	fastLeaderElection,
	freeze,
	LEADER_HOOKS,
	leaderOverlaps,
	leadershipEvents,
	msUntilLog,
	RigStack,
	Scenario,
} from '@n8n/test-rig';
import { expect, test } from '@playwright/test';

const TTL_S = 4;
const INTERVAL_S = 1;
const TAKEOVER_LIMIT_MS = (TTL_S + 2 * INTERVAL_S) * 1000 + 2000;
const STEP_DOWN_LIMIT_MS = INTERVAL_S * 1000 + 2000;

test('multi-main: a frozen leader steps down after it thaws and finds a new leader', async () => {
	test.setTimeout(300_000);

	const rig = await RigStack.start({
		name: 'leader-frozen',
		mains: 2,
		workers: 1,
		runners: 'internal',
		scale: 1,
		hooks: LEADER_HOOKS,
		env: fastLeaderElection(TTL_S, INTERVAL_S),
	});
	const s = new Scenario('multi-main-leader-frozen', rig, test.info().outputPath());

	await s.run(test.info(), async () => {
		const { leader, followers } = await currentLeader(rig);
		s.mark('leader', leader.name);

		let frozenAt = 0;
		const takeover = msUntilLog(
			followers.map((f) => f.container),
			' hit leader-takeover ',
			TAKEOVER_LIMIT_MS + 10_000,
			() => frozenAt,
		);
		frozenAt = Date.now();
		await freeze(leader.container, true);
		s.mark('leader-frozen');
		const takeoverMs = await takeover;
		s.mark('follower-took-over', takeoverMs);

		let thawedAt = 0;
		const stepDown = msUntilLog(
			[leader.container],
			' hit leader-stepdown ',
			STEP_DOWN_LIMIT_MS + 10_000,
			() => thawedAt,
		);
		thawedAt = Date.now();
		await freeze(leader.container, false);
		s.mark('leader-thawed');
		const stepDownMs = await stepDown;
		s.mark('leader-stepped-down', stepDownMs);

		const events = await leadershipEvents(rig);
		await s.collectLogs();
		s.set({
			leader: leader.name,
			takeoverAfterFreezeMs: takeoverMs,
			stepDownAfterThawMs: stepDownMs,
			overlaps: leaderOverlaps(events),
			events,
		});

		const failed = s.verify({
			always: [
				['takeover within the lease and two checks', takeoverMs, atMost(TAKEOVER_LIMIT_MS)],
				['step-down within one check after thaw', stepDownMs, atMost(STEP_DOWN_LIMIT_MS)],
			],
		});
		expect(failed).toEqual([]);
	});
});
