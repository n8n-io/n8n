/**
 * Algorithm:
 * 1. Enrich specs with duration from metrics
 * 2. Group specs that share a generated worker-fixture identity
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

interface SpecWithDuration {
	path: string;
	capabilities: string[];
	distributionGroup?: string;
	fixturePools?: string[];
	duration: number;
}

interface PackingItem {
	fixtures: string[];
	capabilities: string[];
	specs: string[];
	duration: number;
}

interface Bucket {
	specs: string[];
	testTime: number;
	capabilities: Set<string>;
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
		const group = spec.distributionGroup;
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
		const capabilities = [...new Set(specs.flatMap((spec) => spec.capabilities))].sort();
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
					capabilities,
					specs: subGroup.map((s) => s.path),
					duration: subGroup.reduce((sum, s) => sum + s.duration, 0),
				});
			}
		} else {
			items.push({
				fixtures,
				capabilities,
				specs: specs.map((s) => s.path),
				duration: totalDuration,
			});
		}
	}

	return items;
}

/**
 * Each shard pays the same fixed setup cost, so a small selection on many shards
 * spends more time in setup than in tests. The limit applies before bin-packing,
 * so the packer still balances the shards it gets.
 *
 * The count never drops below the number of fixture-group packing items. A group
 * split by maxGroupDuration needs one shard per piece, so counting distinct
 * fixture groups instead would leave the packer too few shards and merge the
 * remaining fixture groups onto one runner. One runner that starts every
 * image set pays back in container startup what it saved in setup.
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
		fixtures: new Set<string>(),
		hasStandardSpecs: false,
	}));

	for (const item of allItems) {
		const lightest = buckets.reduce((min, b) => (b.testTime < min.testTime ? b : min));

		lightest.specs.push(...item.specs);
		lightest.testTime += item.duration;

		for (const capability of item.capabilities) lightest.capabilities.add(capability);
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
				fixturePools: [...b.fixtures].sort(),
				fixtureCount: b.fixtures.size + (b.hasStandardSpecs ? 1 : 0),
			})),
		totalTestTime,
	};
}
