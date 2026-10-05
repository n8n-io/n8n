/**
 * Algorithm:
 * 1. Enrich specs with duration from metrics
 * 2. Group specs that share the same fixture pools
 * 3. Split large groups exceeding maxGroupDuration
 * 4. Limit the bucket count to keep each shard near targetShardDuration
 * 5. Greedy bin-packing: assign heaviest items to lightest shard
 */

import type { DiscoveredSpec } from './types.js';

export interface ShardAssignment {
	shard: number;
	specs: string[];
	testTime: number;
	capabilities: string[];
	services: string[];
	fixturePools: string[];
	fixtureCount: number;
}

export interface ShardDistribution {
	shards: ShardAssignment[];
	totalTestTime: number;
}

interface DistributeConfig {
	defaultDuration: number;
	maxGroupDuration: number;
	targetShardDuration?: number;
	minShardSpecs?: number;
}

type SpecWithDuration = DiscoveredSpec & { duration: number };

interface PackingItem {
	fixtures: string[];
	capabilities: string[];
	services: string[];
	specs: string[];
	duration: number;
}

interface Bucket {
	specs: string[];
	testTime: number;
	capabilities: Set<string>;
	services: Set<string>;
	fixtures: Set<string>;
	hasStandardSpecs: boolean;
}

function enrichWithDuration(
	specs: DiscoveredSpec[],
	metrics: Record<string, number>,
	defaultDuration: number,
): SpecWithDuration[] {
	return specs.map((spec) => ({
		...spec,
		duration: metrics[spec.path] || defaultDuration,
	}));
}

function groupSpecs(specs: SpecWithDuration[]): {
	groups: Map<string, SpecWithDuration[]>;
	standard: SpecWithDuration[];
} {
	const groups = new Map<string, SpecWithDuration[]>();
	const standard: SpecWithDuration[] = [];

	for (const spec of specs) {
		const group = spec.fixturePools?.length
			? JSON.stringify([...spec.fixturePools].sort())
			: undefined;
		if (group) {
			if (!groups.has(group)) {
				groups.set(group, []);
			}
			groups.get(group)?.push(spec);
		} else {
			standard.push(spec);
		}
	}

	return { groups, standard };
}

function splitLargeGroups(
	groups: Map<string, SpecWithDuration[]>,
	maxGroupDuration: number,
): PackingItem[] {
	const items: PackingItem[] = [];

	for (const specs of groups.values()) {
		specs.sort((a, b) => b.duration - a.duration);
		const totalDuration = specs.reduce((sum, s) => sum + s.duration, 0);
		const fixtures = [...new Set(specs.flatMap((spec) => spec.fixturePools ?? []))].sort();

		if (totalDuration > maxGroupDuration && specs.length > 1) {
			const numSubGroups = Math.ceil(totalDuration / maxGroupDuration);
			const targetPerSubGroup = totalDuration / numSubGroups;

			let currentTotal = 0;
			const subGroups: SpecWithDuration[][] = [[]];

			for (const spec of specs) {
				const currentIdx = subGroups.length - 1;
				if (currentTotal + spec.duration > targetPerSubGroup && subGroups[currentIdx].length > 0) {
					subGroups.push([]);
					currentTotal = 0;
				}
				subGroups[subGroups.length - 1].push(spec);
				currentTotal += spec.duration;
			}

			for (const subGroup of subGroups) {
				items.push({
					fixtures,
					capabilities: [...new Set(subGroup.flatMap((spec) => spec.capabilities))].sort(),
					services: [...new Set(subGroup.flatMap((spec) => spec.services))].sort(),
					specs: subGroup.map((s) => s.path),
					duration: subGroup.reduce((sum, s) => sum + s.duration, 0),
				});
			}
		} else {
			items.push({
				fixtures,
				capabilities: [...new Set(specs.flatMap((spec) => spec.capabilities))].sort(),
				services: [...new Set(specs.flatMap((spec) => spec.services))].sort(),
				specs: specs.map((s) => s.path),
				duration: totalDuration,
			});
		}
	}

	return items;
}

/**
 * Small selections spend more time in shard setup than in tests.
 * Limit the shard count before bin-packing.
 * Keep one shard for each grouped item.
 * This prevents one runner from starting multiple fixture groups.
 */
function boundShardCount(
	numShards: number,
	totalTestTime: number,
	specCount: number,
	groupedItemCount: number,
	config: DistributeConfig,
): number {
	const limits = [numShards];
	if (config.targetShardDuration && config.targetShardDuration > 0) {
		limits.push(Math.ceil(totalTestTime / config.targetShardDuration));
	}
	if (config.minShardSpecs && config.minShardSpecs > 1) {
		limits.push(Math.floor(specCount / config.minShardSpecs));
	}
	return Math.min(numShards, Math.max(1, groupedItemCount, Math.min(...limits)));
}

function assignToShards(items: PackingItem[], numShards: number): Bucket[] {
	const allItems = items.sort((a, b) => b.duration - a.duration);

	const buckets: Bucket[] = Array.from({ length: numShards }, () => ({
		specs: [],
		testTime: 0,
		capabilities: new Set<string>(),
		services: new Set<string>(),
		fixtures: new Set<string>(),
		hasStandardSpecs: false,
	}));

	for (const item of allItems) {
		const lightest = buckets.reduce((min, b) => (b.testTime < min.testTime ? b : min));

		lightest.specs.push(...item.specs);
		lightest.testTime += item.duration;

		for (const capability of item.capabilities) lightest.capabilities.add(capability);
		for (const service of item.services) lightest.services.add(service);
		if (item.fixtures.length > 0) {
			for (const fixture of item.fixtures) lightest.fixtures.add(fixture);
		} else {
			lightest.hasStandardSpecs = true;
		}
	}

	return buckets;
}

export function distributeShards(
	specs: DiscoveredSpec[],
	numShards: number,
	metrics: Record<string, number>,
	config: DistributeConfig,
): ShardDistribution {
	const enriched = enrichWithDuration(specs, metrics, config.defaultDuration);
	const { groups, standard } = groupSpecs(enriched);

	const groupedItems = splitLargeGroups(groups, config.maxGroupDuration);
	const standardItems: PackingItem[] = standard.map((spec) => ({
		fixtures: spec.fixturePools ?? [],
		capabilities: spec.capabilities,
		services: spec.services,
		specs: [spec.path],
		duration: spec.duration,
	}));

	const totalTestTime = enriched.reduce((sum, s) => sum + s.duration, 0);
	const targetShards = boundShardCount(
		numShards,
		totalTestTime,
		enriched.length,
		groupedItems.length,
		config,
	);
	const buckets = assignToShards([...groupedItems, ...standardItems], targetShards);

	return {
		shards: buckets
			.filter((b) => b.specs.length > 0)
			.map((b, i) => ({
				shard: i + 1,
				specs: b.specs,
				testTime: b.testTime,
				capabilities: [...b.capabilities].sort(),
				services: [...b.services].sort(),
				fixturePools: [...b.fixtures].sort(),
				fixtureCount: b.fixtures.size + (b.hasStandardSpecs ? 1 : 0),
			})),
		totalTestTime,
	};
}
