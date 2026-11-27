// @ts-check

function words(value) {
	return value.split(/\s+/).filter(Boolean);
}

export function parseDistributionMatrix(output) {
	const value = JSON.parse(output);
	if (!Array.isArray(value)) throw new Error('The distributor did not return a matrix');
	return value.map((entry) => {
		if (
			typeof entry !== 'object' ||
			entry === null ||
			typeof entry.shard !== 'number' ||
			typeof entry.specs !== 'string' ||
			typeof entry.images !== 'string'
		) {
			throw new Error('The distributor returned an invalid matrix entry');
		}
		const specs = words(entry.specs);
		if (specs.length === 0) {
			return {
				shard: entry.shard,
				specs,
				images: words(entry.images),
				capabilities: [],
				services: [],
				fixturePools: [],
				fixtureCount: 0,
				testTime: 0,
			};
		}
		if (
			!Array.isArray(entry.capabilities) ||
			!Array.isArray(entry.services) ||
			!Array.isArray(entry.fixturePools) ||
			typeof entry.fixtureCount !== 'number' ||
			typeof entry.testTime !== 'number'
		) {
			throw new Error('The distributor did not return distribution metadata');
		}
		return {
			shard: entry.shard,
			specs,
			images: words(entry.images),
			capabilities: entry.capabilities,
			services: entry.services,
			fixturePools: entry.fixturePools,
			fixtureCount: entry.fixtureCount,
			testTime: entry.testTime,
		};
	});
}

export function summarizeDistribution(project, selection, matrix, byShard) {
	const selectedSpecs = matrix.flatMap((shard) => shard.specs);
	const uniqueSpecs = new Set(selectedSpecs);
	const imageCounts = new Map();
	for (const shard of byShard) {
		for (const image of shard.images) imageCounts.set(image, (imageCounts.get(image) ?? 0) + 1);
	}

	return {
		project,
		selection,
		shards: byShard.length,
		selectedSpecs: selectedSpecs.length,
		uniqueSpecs: uniqueSpecs.size,
		duplicateSpecs: selectedSpecs.length - uniqueSpecs.size,
		runnableSpecs: byShard.reduce((sum, shard) => sum + shard.runnableSpecs, 0),
		runnableTests: byShard.reduce((sum, shard) => sum + shard.runnableTests, 0),
		modeledStackStarts: byShard.reduce((sum, shard) => sum + shard.modeledStackStarts, 0),
		stackStarts: byShard.reduce((sum, shard) => sum + shard.stackStarts, 0),
		extraStackStarts: byShard.reduce((sum, shard) => sum + shard.extraStackStarts, 0),
		declaredImageLoads: [...imageCounts.values()].reduce((sum, count) => sum + count, 0),
		images: Object.fromEntries([...imageCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
		byShard,
	};
}
