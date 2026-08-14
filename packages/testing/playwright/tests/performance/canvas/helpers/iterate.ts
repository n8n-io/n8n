/**
 * Run a measurement function `iterations` times. The first run is treated as
 * warmup (it includes JIT, module init, container warm) and discarded; the
 * remaining samples are returned for callers to median/aggregate.
 */
export async function withWarmup<T>(
	iterations: number,
	run: (iteration: number) => Promise<T>,
): Promise<T[]> {
	const samples: T[] = [];
	for (let iteration = 0; iteration < iterations; iteration++) {
		const sample = await run(iteration);
		if (iteration > 0) samples.push(sample);
	}
	return samples;
}

export function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function medianBy<T>(samples: T[], pick: (sample: T) => number): number {
	return median(samples.map(pick));
}
