import { MAX_PINNED_DATA_SIZE, MAX_WORKFLOW_SIZE } from '@n8n/api-types';
import { node, sticky, trigger, workflow } from '@n8n/workflow-sdk';
import type { IDataObject } from '@n8n/workflow-sdk';
import type { IPinData, IWorkflowBase } from 'n8n-workflow';

import { buildPinDataForWorkflow, type PinScenario } from './pinned-payloads';

export type Tier = 'S' | 'M' | 'L';

// Tiers are intentionally conservative. We started with S/M/L/XL = 40/150/400/800
// but canvas-execution at 400+ nodes crashes the Chromium renderer — run-data
// fan-out across hundreds of executing nodes drives non-V8 renderer memory
// pressure that raising the V8 heap doesn't fix (the reported jsHeapSizeLimit is
// already ~4 GB, V8's pointer-compression cage; we run at the default, no launch
// flag). Until the frontend optimization that lifts that ceiling lands, L = 200
// is the largest tier the suite runs.
export const TIER_CONFIG: Record<Tier, { nodes: number; stickyNotes: number }> = {
	S: { nodes: 30, stickyNotes: 2 },
	M: { nodes: 80, stickyNotes: 4 },
	L: { nodes: 200, stickyNotes: 8 },
};

// Heavy-concentrated payload caps per tier. Scaled to the smaller tier sizes.
export const HEAVY_BUDGET_BY_TIER: Record<Tier, { heavyNodes: number; mediumNodes: number }> = {
	S: { heavyNodes: 2, mediumNodes: 6 },
	M: { heavyNodes: 3, mediumNodes: 8 },
	L: { heavyNodes: 5, mediumNodes: 12 },
};

export interface BuildOptions {
	tier: Tier;
	pinScenario?: PinScenario;
	name?: string;
}

export interface GeneratedWorkflow {
	workflow: Partial<IWorkflowBase>;
	triggerName: string;
	midDepthNodeName: string;
	sampleNodeNames: string[];
	pinnedDataBytes: number;
}

const TRIGGER_NAME = 'Start';

// Only HTTP Request nodes carry pinned data — they'd otherwise make real
// network calls and time out / fail in CI. Set / Code / Merge / DateTime
// execute their actual logic with minimal pass-through parameters so the
// benchmark measures real node-execution + canvas-rendering cost.
// IF and Switch are excluded because their default empty conditions break
// the linear chain (no working output to route to).
const NODE_TYPE_CYCLE: Array<{ type: string; typeVersion: number; pinnable: boolean }> = [
	{ type: 'n8n-nodes-base.set', typeVersion: 3.4, pinnable: false },
	{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, pinnable: true },
	{ type: 'n8n-nodes-base.set', typeVersion: 3.4, pinnable: false },
	{ type: 'n8n-nodes-base.set', typeVersion: 3.4, pinnable: false },
	{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, pinnable: true },
	{ type: 'n8n-nodes-base.code', typeVersion: 2, pinnable: false },
	{ type: 'n8n-nodes-base.set', typeVersion: 3.4, pinnable: false },
	{ type: 'n8n-nodes-base.merge', typeVersion: 3, pinnable: false },
	{ type: 'n8n-nodes-base.set', typeVersion: 3.4, pinnable: false },
	{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, pinnable: true },
	{ type: 'n8n-nodes-base.set', typeVersion: 3.4, pinnable: false },
	{ type: 'n8n-nodes-base.set', typeVersion: 3.4, pinnable: false },
	{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, pinnable: true },
	{ type: 'n8n-nodes-base.set', typeVersion: 3.4, pinnable: false },
	{ type: 'n8n-nodes-base.code', typeVersion: 2, pinnable: false },
	{ type: 'n8n-nodes-base.set', typeVersion: 3.4, pinnable: false },
	{ type: 'n8n-nodes-base.dateTime', typeVersion: 2, pinnable: false },
	{ type: 'n8n-nodes-base.merge', typeVersion: 3, pinnable: false },
	{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, pinnable: true },
	{ type: 'n8n-nodes-base.set', typeVersion: 3.4, pinnable: false },
];

function nodeNameFor(index: number, type: string): string {
	// Suffix the type so the canvas labels remain readable in screenshots / NDV titles.
	const shortType = type.split('.').pop() ?? type;
	return `${shortType[0].toUpperCase()}${shortType.slice(1)} ${index}`;
}

function parametersFor(type: string): IDataObject {
	switch (type) {
		case 'n8n-nodes-base.set':
			return { assignments: { assignments: [] }, options: {} };
		case 'n8n-nodes-base.httpRequest':
			return { url: 'https://example.invalid/benchmark', options: {} };
		case 'n8n-nodes-base.code':
			return { jsCode: 'return $input.all();' };
		case 'n8n-nodes-base.merge':
			return { mode: 'append' };
		case 'n8n-nodes-base.dateTime':
			return { action: 'getCurrentDate', options: {} };
		default:
			return {};
	}
}

function stickyContent(index: number): string {
	return `## Benchmark section ${index}\n\nGenerated sticky note used to exercise sticky markdown rendering at scale.`;
}

function pickSampleNames(names: string[], count: number): string[] {
	const step = Math.max(1, Math.floor(names.length / count));
	const picks: string[] = [];
	for (let index = 0; index < count && index * step < names.length; index++) {
		picks.push(names[index * step]);
	}
	return picks;
}

function jsonSize(value: unknown): number {
	return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

export function buildCanvasBenchmarkWorkflow(options: BuildOptions): GeneratedWorkflow {
	const { tier, pinScenario = 'none' } = options;
	const { nodes: nodeCount, stickyNotes } = TIER_CONFIG[tier];

	// Build the trigger and the linear chain of flow nodes. Node positions are
	// left to the SDK's auto-layout — the benchmark only cares about node/sticky
	// counts and execution cost, not exact coordinates.
	const start = trigger({
		type: 'n8n-nodes-base.manualTrigger',
		version: 1,
		config: { name: TRIGGER_NAME },
	});

	const flowNames: string[] = [TRIGGER_NAME];
	// The trigger has no entry in the cycle but is safe to pin.
	const pinnableNames: string[] = [TRIGGER_NAME];

	let builder = workflow(`canvas-benchmark-${tier}`, options.name ?? `Canvas Benchmark ${tier}`)
		.settings({ executionOrder: 'v1' })
		.add(start);

	for (let index = 1; index < nodeCount; index++) {
		const cycle = NODE_TYPE_CYCLE[(index - 1) % NODE_TYPE_CYCLE.length];
		const name = nodeNameFor(index, cycle.type);
		flowNames.push(name);
		if (cycle.pinnable) pinnableNames.push(name);
		// `.to()` connects from the builder's current node and advances the cursor,
		// producing trigger -> n1 -> n2 -> ... in a single linear chain.
		builder = builder.to(
			node({
				type: cycle.type,
				version: cycle.typeVersion,
				config: { name, parameters: parametersFor(cycle.type) },
			}),
		);
	}

	for (let stickyIndex = 0; stickyIndex < stickyNotes; stickyIndex++) {
		builder = builder.add(sticky(stickyContent(stickyIndex), { width: 320, height: 160 }));
	}

	let pinData: IPinData | undefined;
	let pinnedDataBytes = 0;
	if (pinScenario !== 'none') {
		pinData = buildPinDataForWorkflow(pinnableNames, pinScenario, HEAVY_BUDGET_BY_TIER[tier]);
		pinnedDataBytes = jsonSize(pinData);
		if (pinnedDataBytes > MAX_PINNED_DATA_SIZE) {
			throw new Error(
				`Generated pinned data ${pinnedDataBytes} bytes exceeds MAX_PINNED_DATA_SIZE ${MAX_PINNED_DATA_SIZE}`,
			);
		}
	}

	// The SDK's WorkflowJSON is structurally compatible with IWorkflowBase; the
	// cast bridges the SDK's self-contained type duplicates to the n8n-workflow
	// types the public API expects.
	const workflowResult = builder.toJSON() as unknown as Partial<IWorkflowBase>;
	// workflow() requires an id up front, but the create API must assign its own:
	// several specs create the same tier's workflow against one database, so a
	// fixed id collides ("Workflow with id ... exists already").
	delete workflowResult.id;
	workflowResult.active = false;
	if (pinData) {
		workflowResult.pinData = pinData;
	}

	const workflowBytes = jsonSize(workflowResult);
	if (workflowBytes > MAX_WORKFLOW_SIZE) {
		throw new Error(
			`Generated workflow ${workflowBytes} bytes exceeds MAX_WORKFLOW_SIZE ${MAX_WORKFLOW_SIZE}`,
		);
	}

	return {
		workflow: workflowResult,
		triggerName: TRIGGER_NAME,
		midDepthNodeName: flowNames[Math.floor(flowNames.length / 2)],
		sampleNodeNames: pickSampleNames(flowNames, 5),
		pinnedDataBytes,
	};
}
