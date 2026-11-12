export interface Violation {
	invariant: string;
	detail: unknown;
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
