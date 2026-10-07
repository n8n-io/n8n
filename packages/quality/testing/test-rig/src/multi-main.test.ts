import { fastLeaderElection, LEADER_HOOKS, parseLeadershipEvents } from './multi-main';
import { parseHookSpecs } from './hooks/spec';

describe('parseLeadershipEvents', () => {
	it('reads takeovers and step-downs and skips other lines', () => {
		const log = [
			'[test-rig] 2026-10-07T10:00:00.000Z pid=1 installed leader-takeover {}',
			'[test-rig] 2026-10-07T10:00:01.000Z pid=1 hit leader-takeover {}',
			'Leader is now this instance',
			'[test-rig] 2026-10-07T10:00:05.000Z pid=1 hit leader-stepdown {}',
			'[test-rig] 2026-10-07T10:00:06.000Z pid=1 hit job-start {}',
		].join('\n');
		expect(parseLeadershipEvents('main-2', log)).toEqual([
			{ instance: 'main-2', at: Date.parse('2026-10-07T10:00:01.000Z'), role: 'leader' },
			{ instance: 'main-2', at: Date.parse('2026-10-07T10:00:05.000Z'), role: 'follower' },
		]);
	});
});

describe('leader hooks and timings', () => {
	it('declares valid hooks that the mains must install', () => {
		expect(parseHookSpecs(LEADER_HOOKS).map((hook) => hook.roles)).toEqual([['main'], ['main']]);
	});

	it('enables multi-main with short leader checks', () => {
		expect(fastLeaderElection(6, 2)).toEqual({
			N8N_MULTI_MAIN_SETUP_ENABLED: 'true',
			N8N_MULTI_MAIN_SETUP_KEY_TTL: '6',
			N8N_MULTI_MAIN_SETUP_CHECK_INTERVAL: '2',
		});
	});
});
