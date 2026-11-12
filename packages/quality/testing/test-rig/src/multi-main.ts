import { parseHookLine } from './hooks/control';
import type { HookSpec } from './hooks/spec';
import { FILES } from './hooks/spec';
import type { LeadershipEvent } from './invariants';
import { logs, until } from './process';
import type { RigStack } from './stack';

const leaderHook = (point: string, method: string): HookSpec => ({
	point,
	file: FILES.multiMainSetup,
	target: 'MultiMainSetup.prototype',
	method,
	kind: 'observe',
	phase: 'after',
	roles: ['main'],
});

/** Observe hooks that log every leader takeover and step-down in the mains. */
export const LEADER_HOOKS: HookSpec[] = [
	leaderHook('leader-takeover', 'takeOverAsLeader'),
	leaderHook('leader-stepdown', 'stepDownToFollower'),
];

/** Leader check timings, in seconds, short enough for a test to wait through a handover. */
export const fastLeaderElection = (ttlS: number, intervalS: number) => ({
	N8N_MULTI_MAIN_SETUP_ENABLED: 'true',
	N8N_MULTI_MAIN_SETUP_KEY_TTL: String(ttlS),
	N8N_MULTI_MAIN_SETUP_CHECK_INTERVAL: String(intervalS),
});

const ROLES = new Map<string, LeadershipEvent['role']>([
	['leader-takeover', 'leader'],
	['leader-stepdown', 'follower'],
]);

const mains = (rig: RigStack) => rig.n8nContainers().filter(({ name }) => name.startsWith('main'));

/** Leadership events of every main, read from their logs. */
export async function leadershipEvents(rig: RigStack): Promise<LeadershipEvent[]> {
	const all = await Promise.all(
		mains(rig).map(async ({ name, container }) =>
			(await logs(container)).split('\n').flatMap((line): LeadershipEvent[] => {
				const hit = parseHookLine(line);
				const role = hit?.event === 'hit' ? ROLES.get(hit.point) : undefined;
				return hit && role ? [{ instance: name, at: hit.at, role }] : [];
			}),
		),
	);
	return all.flat().sort((a, b) => a.at - b.at);
}

export async function currentLeader(rig: RigStack) {
	let leaders: ReturnType<typeof mains> = [];
	await until(
		'one leader',
		async () => {
			const latest = new Map<string, LeadershipEvent['role']>();
			for (const event of await leadershipEvents(rig)) latest.set(event.instance, event.role);
			leaders = mains(rig).filter(({ name }) => latest.get(name) === 'leader');
			return leaders.length === 1;
		},
		30_000,
	);
	const [leader] = leaders;
	return { leader, followers: mains(rig).filter(({ name }) => name !== leader.name) };
}
