import { parseHookLine } from './hooks/control';
import type { HookSpec } from './hooks/spec';
import { FILES } from './hooks/spec';
import type { LeadershipEvent } from './invariants';
import type { Container } from './process';
import { logs, until } from './process';
import type { RigStack } from './stack';

const leaderHook = (point: string, method: string): HookSpec => ({
	point,
	file: FILES.multiMainSetup,
	target: 'MultiMainSetup.prototype',
	method,
	kind: 'observe',
	roles: ['main'],
});

/** Observe hooks that log every leader takeover and step-down in the mains. */
export const LEADER_HOOKS: HookSpec[] = [
	leaderHook('leader-takeover', 'takeOverAsLeader'),
	leaderHook('leader-stepdown', 'stepDownToFollower'),
];

/** Leader check timings, in seconds, short enough for a test to wait through a handover. */
export const fastLeaderElection = (ttlS = 4, intervalS = 1) => ({
	N8N_MULTI_MAIN_SETUP_ENABLED: 'true',
	N8N_MULTI_MAIN_SETUP_KEY_TTL: String(ttlS),
	N8N_MULTI_MAIN_SETUP_CHECK_INTERVAL: String(intervalS),
});

/** Parses leadership events from the log of one main. */
export function parseLeadershipEvents(instance: string, log: string): LeadershipEvent[] {
	return log.split('\n').flatMap((line): LeadershipEvent[] => {
		const parsed = parseHookLine(line);
		if (parsed?.event !== 'hit') return [];
		if (parsed.point === 'leader-takeover')
			return [{ instance, at: parsed.at, role: 'leader' as const }];
		if (parsed.point === 'leader-stepdown')
			return [{ instance, at: parsed.at, role: 'follower' as const }];
		return [];
	});
}

/** Leadership events of every main, read from their logs. */
export async function leadershipEvents(
	rig: Pick<RigStack, 'n8nContainers'>,
): Promise<LeadershipEvent[]> {
	const mains = rig.n8nContainers().filter(({ name }) => name.startsWith('main'));
	const all = await Promise.all(
		mains.map(async ({ name, container }) => parseLeadershipEvents(name, await logs(container))),
	);
	return all.flat().sort((a, b) => a.at - b.at);
}

export interface NamedContainer {
	name: string;
	container: Container;
}

/** Waits for the first leader and returns it with the other mains. */
export async function currentLeader(
	rig: Pick<RigStack, 'n8nContainers'>,
	timeoutMs = 30_000,
): Promise<{ leader: NamedContainer; followers: NamedContainer[] }> {
	let events: LeadershipEvent[] = [];
	await until(
		'a leader',
		async () => {
			events = await leadershipEvents(rig);
			return events.length > 0;
		},
		timeoutMs,
	);
	const mains = rig.n8nContainers().filter(({ name }) => name.startsWith('main'));
	const leader = mains.find(({ name }) => name === events[0].instance);
	if (!leader) throw new Error(`leader ${events[0].instance} is not a main`);
	return { leader, followers: mains.filter((main) => main !== leader) };
}
