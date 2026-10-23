/** Deterministic pseudo-random numbers from a 32-bit seed (mulberry32). */
export function random(seed: number) {
	let state = seed >>> 0;
	const next = () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return {
		next,
		int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
		pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
	};
}

export type Upstream = 'postgres' | 'redis';

/** One fault the chaos driver can apply. Targets are n8n container names: main, worker-1, ... */
export type Fault =
	| { kind: 'kill'; target: string }
	| { kind: 'stop'; target: string }
	| { kind: 'freeze'; target: string; forMs: number }
	| { kind: 'delay'; target: string; to: Upstream; ms: number; forMs: number }
	| { kind: 'cut'; target: string; to: Upstream; forMs: number }
	| { kind: 'hook'; target: string; point: string; forMs: number };

export type FaultKind = Fault['kind'];

export interface ScheduledFault {
	atMs: number;
	fault: Fault;
}

export interface MenuOptions {
	targets: string[];
	/** Targets that `kill` and `stop` may pick; a restarted container gets a new host port, so keep the main out. */
	restartTargets?: string[];
	/** Targets that `hook` may pick: containers that run the hooked methods. */
	hookTargets?: string[];
	kinds: FaultKind[];
	/** Hook points declared for the stack that a `hook` fault may arm. */
	hookPoints?: string[];
	/** Longest time a fault lasts. */
	maxFaultMs?: number;
}

function faultFrom(rng: ReturnType<typeof random>, menu: MenuOptions): Fault {
	const maxMs = menu.maxFaultMs ?? 8_000;
	const kinds = menu.kinds.filter((kind) => kind !== 'hook' || menu.hookPoints?.length);
	const kind = rng.pick(kinds);
	const restartable = menu.restartTargets ?? menu.targets;
	const pool =
		kind === 'kill' || kind === 'stop'
			? restartable
			: kind === 'hook'
				? (menu.hookTargets ?? menu.targets)
				: menu.targets;
	const target = rng.pick(pool);
	const forMs = rng.int(1_000, maxMs);
	const to = rng.pick(['postgres', 'redis'] as const);
	switch (kind) {
		case 'kill':
		case 'stop':
			return { kind, target };
		case 'freeze':
			return { kind, target, forMs };
		case 'delay':
			return { kind, target, to, ms: rng.int(100, 2_000), forMs };
		case 'cut':
			return { kind, target, to, forMs };
		case 'hook':
			return { kind, target, point: rng.pick(menu.hookPoints ?? []), forMs };
	}
}

/** The same seed and menu always give the same schedule. */
export function generateSchedule(
	seed: number,
	menu: MenuOptions,
	count: number,
	durationMs: number,
): ScheduledFault[] {
	if (menu.targets.length === 0 || menu.kinds.length === 0) throw new Error('empty fault menu');
	if (menu.restartTargets?.length === 0 && menu.kinds.some((k) => k === 'kill' || k === 'stop')) {
		throw new Error('kill and stop need a restart target');
	}
	const rng = random(seed);
	return Array.from({ length: count }, () => ({
		atMs: rng.int(0, durationMs),
		fault: faultFrom(rng, menu),
	})).sort((a, b) => a.atMs - b.atMs);
}

export const describeFault = (fault: Fault): string =>
	Object.entries(fault)
		.map(([key, value]) => `${key}=${String(value)}`)
		.join(' ');
