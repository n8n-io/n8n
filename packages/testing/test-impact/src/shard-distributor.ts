/**
 * Algorithm:
 * 1. Enrich specs with duration from metrics
 * 2. Group by capability (specs sharing a capability stay together)
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
	duration: number;
}

interface PackingItem {
	capability: string | null;
	specs: string[];
	duration: number;
}

interface Bucket {
	specs: string[];
	testTime: number;
	capabilities: Set<string>;
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

function groupByCapability(specs: SpecWithDuration[]): {
	groups: Map<string, SpecWithDuration[]>;
	standard: SpecWithDuration[];
} {
	const groups = new Map<string, SpecWithDuration[]>();
	const standard: SpecWithDuration[] = [];

	for (const spec of specs) {
		if (spec.capabilities.length > 0) {
			const cap = spec.capabilities[0];
			if (!groups.has(cap)) {
				groups.set(cap, []);
			}
			groups.get(cap)?.push(spec);
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

	for (const [capability, specs] of groups.entries()) {
		specs.sort((a, b) => b.duration - a.duration);
		const totalDuration = specs.reduce((sum, s) => sum + s.duration, 0);

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
					capability,
					specs: subGroup.map((s) => s.path),
					duration: subGroup.reduce((sum, s) => sum + s.duration, 0),
				});
			}
		} else {
			items.push({
				capability,
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
 * The count never drops below the number of capability packing items. A group
 * split by maxGroupDuration needs one shard per piece, so counting distinct
 * capabilities instead would leave the packer too few shards and merge the
 * remaining capabilities' fixtures onto one runner. One runner that starts every
 * image set pays back in container startup what it saved in setup.
 */
function boundShardCount(
	numShards: number,
	totalTestTime: number,
	specCount: number,
	capabilityItemCount: number,
	config: DistributeConfig,
): number {
	const limits = [numShards];
	if (config.targetShardDuration && config.targetShardDuration > 0) {
		limits.push(Math.ceil(totalTestTime / config.targetShardDuration));
	}
	if (config.minShardSpecs && config.minShardSpecs > 1) {
		limits.push(Math.floor(specCount / config.minShardSpecs));
	}
	return Math.min(numShards, Math.max(1, capabilityItemCount, Math.min(...limits)));
}

function assignToShards(items: PackingItem[], numShards: number): Bucket[] {
	const allItems = items.sort((a, b) => b.duration - a.duration);

	const buckets: Bucket[] = Array.from({ length: numShards }, () => ({
		specs: [],
		testTime: 0,
		capabilities: new Set<string>(),
		hasStandardSpecs: false,
	}));

	for (const item of allItems) {
		const lightest = buckets.reduce((min, b) => (b.testTime < min.testTime ? b : min));

		lightest.specs.push(...item.specs);
		lightest.testTime += item.duration;

		if (item.capability) {
			lightest.capabilities.add(item.capability);
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
	const { groups, standard } = groupByCapability(enriched);

	const capabilityItems = splitLargeGroups(groups, config.maxGroupDuration);
	const standardItems: PackingItem[] = standard.map((spec) => ({
		capability: null,
		specs: [spec.path],
		duration: spec.duration,
	}));

	const totalTestTime = enriched.reduce((sum, s) => sum + s.duration, 0);
	const targetShards = boundShardCount(
		numShards,
		totalTestTime,
		enriched.length,
		capabilityItems.length,
		config,
	);
	const buckets = assignToShards([...capabilityItems, ...standardItems], targetShards);

	return {
		shards: buckets
			.filter((b) => b.specs.length > 0)
			.map((b, i) => ({
				shard: i + 1,
				specs: b.specs,
				testTime: b.testTime,
				capabilities: [...b.capabilities].sort(),
				fixtureCount: b.capabilities.size + (b.hasStandardSpecs ? 1 : 0),
			})),
		totalTestTime,
	};
}
