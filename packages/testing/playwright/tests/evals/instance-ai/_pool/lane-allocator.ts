// Lifted from packages/@n8n/instance-ai/evaluations/cli/lane-allocator.ts — the
// in-memory allocator the eval CLI already uses — and exposed as a synchronous
// try-acquire so it can live in an HTTP sidecar that worker processes poll.
// Two invariants preserved verbatim from the source: a lane never exceeds
// `maxConcurrentBuilds`, and the same key never runs twice on one lane at once.

export interface PoolLane {
	url: string;
	activeBuilds: number;
	inflightKeys: Set<string>;
}

export class PoolAllocator {
	constructor(
		private readonly lanes: PoolLane[],
		private readonly maxConcurrentBuilds: number,
	) {}

	/** Returns a free lane for `key`, or null if none can run it right now. */
	tryAcquire(key: string): PoolLane | null {
		const lane = this.findFree(key);
		if (!lane) return null;
		lane.activeBuilds++;
		lane.inflightKeys.add(key);
		return lane;
	}

	release(url: string, key: string): void {
		const lane = this.lanes.find((l) => l.url === url);
		if (!lane) return;
		lane.activeBuilds = Math.max(0, lane.activeBuilds - 1);
		lane.inflightKeys.delete(key);
	}

	private findFree(key: string): PoolLane | undefined {
		// Least-loaded policy, identical to the CLI allocator: spread builds
		// evenly rather than filling lane 0 to cap before touching lane 1.
		let best: PoolLane | undefined;
		for (const lane of this.lanes) {
			if (!this.canRun(lane, key)) continue;
			if (best === undefined || lane.activeBuilds < best.activeBuilds) best = lane;
		}
		return best;
	}

	private canRun(lane: PoolLane, key: string): boolean {
		return lane.activeBuilds < this.maxConcurrentBuilds && !lane.inflightKeys.has(key);
	}
}
