import type { IDataObject, INodeExecutionData, IPinData } from 'n8n-workflow';

export type PinScenario = 'none' | 'small-spread' | 'medium-cluster' | 'heavy-concentrated';

const SMALL_BYTES = 10 * 1024;
const MEDIUM_BYTES = 100 * 1024;
const HEAVY_BYTES = 1024 * 1024;
const FILLER_BYTES = 5 * 1024;

const DEFAULT_HEAVY_NODE_BUDGET = 5;
const DEFAULT_MEDIUM_NODE_BUDGET = 15;
const MEDIUM_CLUSTER_NODE_BUDGET = 25;

export interface HeavyBudget {
	heavyNodes: number;
	mediumNodes: number;
}

function deterministicFiller(targetBytes: number, seed: number): string {
	// Repeat a short alphanumeric pattern, mixing in the seed so the bytes
	// vary per-node but stay reproducible across runs.
	const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	const chunkSize = 64;
	const chunks: string[] = [];
	let cursor = seed;
	while (chunks.join('').length < targetBytes) {
		let chunk = '';
		for (let charIndex = 0; charIndex < chunkSize; charIndex++) {
			cursor = (cursor * 1103515245 + 12345) & 0x7fffffff;
			chunk += alphabet[cursor % alphabet.length];
		}
		chunks.push(chunk);
	}
	return chunks.join('').slice(0, targetBytes);
}

function customerRecord(seed: number, targetBytes: number): IDataObject {
	const filler = deterministicFiller(Math.max(0, targetBytes - 512), seed);
	return {
		id: `cust-${seed.toString().padStart(8, '0')}`,
		email: `customer.${seed}@example.com`,
		firstName: 'Benchmark',
		lastName: `User${seed}`,
		createdAt: new Date(1700000000000 + seed * 1000).toISOString(),
		address: {
			street: `${seed} Performance Lane`,
			city: 'Metric City',
			postalCode: ((seed * 31) % 99999).toString().padStart(5, '0'),
			country: 'XX',
		},
		preferences: {
			newsletter: seed % 2 === 0,
			theme: seed % 3 === 0 ? 'dark' : 'light',
			notes: filler,
		},
	};
}

function buildItems(targetBytes: number, seed: number): INodeExecutionData[] {
	// Many small items mimic real API/DB responses better than one huge string.
	// Pick an item count that lands close to the target while keeping each item
	// in the 1-50KB range that's realistic for n8n workflows.
	const desiredItems = Math.max(1, Math.min(50, Math.floor(targetBytes / FILLER_BYTES)));
	const bytesPerItem = Math.max(512, Math.floor(targetBytes / desiredItems));
	const items: INodeExecutionData[] = [];
	for (let itemIndex = 0; itemIndex < desiredItems; itemIndex++) {
		items.push({ json: customerRecord(seed + itemIndex, bytesPerItem) });
	}
	return items;
}

function selectHeavyNodes(
	eligibleNodes: string[],
	budget: HeavyBudget,
): {
	heavy: Set<string>;
	medium: Set<string>;
	mediumCluster: Set<string>;
} {
	// Spread the heavy/medium picks across the workflow rather than clustering
	// them at the front, so renderers can't optimise around predictable layout.
	const heavy = new Set<string>();
	const medium = new Set<string>();
	const mediumCluster = new Set<string>();
	const stride = Math.max(1, Math.floor(eligibleNodes.length / budget.heavyNodes));
	for (let index = 0; index < budget.heavyNodes && index * stride < eligibleNodes.length; index++) {
		heavy.add(eligibleNodes[index * stride]);
	}
	const mediumStride = Math.max(1, Math.floor(eligibleNodes.length / budget.mediumNodes));
	for (
		let index = 0;
		index < budget.mediumNodes && index * mediumStride < eligibleNodes.length;
		index++
	) {
		const candidate = eligibleNodes[index * mediumStride];
		if (!heavy.has(candidate)) medium.add(candidate);
	}
	const clusterStride = Math.max(1, Math.floor(eligibleNodes.length / MEDIUM_CLUSTER_NODE_BUDGET));
	for (
		let index = 0;
		index < MEDIUM_CLUSTER_NODE_BUDGET && index * clusterStride < eligibleNodes.length;
		index++
	) {
		mediumCluster.add(eligibleNodes[index * clusterStride]);
	}
	return { heavy, medium, mediumCluster };
}

export function buildPinDataForWorkflow(
	eligibleNodes: string[],
	scenario: Exclude<PinScenario, 'none'>,
	budget: HeavyBudget = {
		heavyNodes: DEFAULT_HEAVY_NODE_BUDGET,
		mediumNodes: DEFAULT_MEDIUM_NODE_BUDGET,
	},
): IPinData {
	const pinData: IPinData = {};
	const { heavy, medium, mediumCluster } = selectHeavyNodes(eligibleNodes, budget);

	for (let index = 0; index < eligibleNodes.length; index++) {
		const nodeName = eligibleNodes[index];
		const seed = index * 7919 + 1;
		let targetBytes: number;
		switch (scenario) {
			case 'small-spread':
				targetBytes = SMALL_BYTES;
				break;
			case 'medium-cluster':
				targetBytes = mediumCluster.has(nodeName) ? MEDIUM_BYTES : FILLER_BYTES;
				break;
			case 'heavy-concentrated':
				if (heavy.has(nodeName)) targetBytes = HEAVY_BYTES;
				else if (medium.has(nodeName)) targetBytes = MEDIUM_BYTES;
				else targetBytes = FILLER_BYTES;
				break;
		}
		pinData[nodeName] = buildItems(targetBytes, seed);
	}

	return pinData;
}
