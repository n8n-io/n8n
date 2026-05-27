import { MAX_PINNED_DATA_SIZE, MAX_WORKFLOW_SIZE } from '@n8n/api-types';
import type { IConnections, INode, INodeParameters, IPinData, IWorkflowBase } from 'n8n-workflow';

import { buildPinDataForWorkflow, type PinScenario } from './pinned-payloads';

export type Tier = 'S' | 'M' | 'L';

// Tiers are intentionally conservative. We started with S/M/L/XL = 40/150/400/800
// but canvas-execution at 400+ nodes crashes the Chromium renderer (V8 capped at
// 4 GB by pointer compression, non-V8 memory pressure from run-data fan-out
// compounds it). Until the frontend optimization that lifts that ceiling lands,
// L = 200 is the largest workflow every spec can run on without skips.
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

const COLS_PER_ROW = 10;
const COL_SPACING = 260;
const ROW_SPACING = 220;
const ORIGIN_X = 240;
const ORIGIN_Y = 240;
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

function uuidFromIndex(index: number): string {
	// Deterministic UUID-v4-shaped string keyed off the node index so the same
	// tier always produces the same workflow JSON byte-for-byte.
	const hex = (index + 1).toString(16).padStart(8, '0');
	return `${hex}-0000-4000-8000-${hex}${hex.slice(0, 4)}`;
}

function gridPosition(index: number): [number, number] {
	const col = index % COLS_PER_ROW;
	const row = Math.floor(index / COLS_PER_ROW);
	return [ORIGIN_X + col * COL_SPACING, ORIGIN_Y + row * ROW_SPACING];
}

function nodeNameFor(index: number, type: string): string {
	// Suffix the type so the canvas labels remain readable in screenshots / NDV titles.
	const shortType = type.split('.').pop() ?? type;
	return `${shortType[0].toUpperCase()}${shortType.slice(1)} ${index}`;
}

function parametersFor(type: string): INodeParameters {
	switch (type) {
		case 'n8n-nodes-base.set':
			return { assignments: { assignments: [] }, options: {} };
		case 'n8n-nodes-base.httpRequest':
			return { url: 'https://example.invalid/benchmark', options: {} };
		case 'n8n-nodes-base.if':
			return {
				conditions: { options: { caseSensitive: true }, conditions: [], combinator: 'and' },
			};
		case 'n8n-nodes-base.switch':
			return { rules: { values: [] }, options: {} };
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

function stickyNoteAt(index: number, totalNodes: number): INode {
	// Drop stickies in the gutter between row groups so they don't overlap nodes.
	const stickyRow = Math.floor((index * Math.ceil(totalNodes / COLS_PER_ROW)) / 10);
	const stickyCol = (index * 3) % COLS_PER_ROW;
	return {
		id: `sticky-${uuidFromIndex(totalNodes + index)}`,
		name: `Sticky ${index}`,
		type: 'n8n-nodes-base.stickyNote',
		typeVersion: 1,
		position: [
			ORIGIN_X + stickyCol * COL_SPACING - 40,
			ORIGIN_Y + stickyRow * ROW_SPACING * 2 - 180,
		],
		parameters: {
			content: `## Benchmark section ${index}\n\nGenerated sticky covering ~${
				stickyCol + 1
			} nodes wide. Used to exercise sticky markdown rendering at scale.`,
			height: 160,
			width: 320,
		},
	};
}

function buildNodes(tier: Tier): INode[] {
	const { nodes: nodeCount, stickyNotes } = TIER_CONFIG[tier];
	const nodes: INode[] = [];

	nodes.push({
		id: uuidFromIndex(0),
		name: TRIGGER_NAME,
		type: 'n8n-nodes-base.manualTrigger',
		typeVersion: 1,
		position: gridPosition(0),
		parameters: {},
	});

	for (let index = 1; index < nodeCount; index++) {
		const cycle = NODE_TYPE_CYCLE[(index - 1) % NODE_TYPE_CYCLE.length];
		nodes.push({
			id: uuidFromIndex(index),
			name: nodeNameFor(index, cycle.type),
			type: cycle.type,
			typeVersion: cycle.typeVersion,
			position: gridPosition(index),
			parameters: parametersFor(cycle.type),
		});
	}

	for (let stickyIndex = 0; stickyIndex < stickyNotes; stickyIndex++) {
		nodes.push(stickyNoteAt(stickyIndex, nodeCount));
	}

	return nodes;
}

function buildConnections(nodes: INode[]): IConnections {
	const connections: IConnections = {};
	// Filter out stickies — they never participate in connections.
	const flowNodes = nodes.filter((node) => node.type !== 'n8n-nodes-base.stickyNote');

	for (let index = 0; index < flowNodes.length - 1; index++) {
		const source = flowNodes[index];
		const target = flowNodes[index + 1];
		connections[source.name] = {
			main: [[{ node: target.name, type: 'main', index: 0 }]],
		};
	}

	return connections;
}

function findMidDepthNode(nodes: INode[]): INode {
	const flowNodes = nodes.filter((node) => node.type !== 'n8n-nodes-base.stickyNote');
	return flowNodes[Math.floor(flowNodes.length / 2)];
}

function pickSampleNodes(nodes: INode[], count: number): INode[] {
	const flowNodes = nodes.filter((node) => node.type !== 'n8n-nodes-base.stickyNote');
	const step = Math.max(1, Math.floor(flowNodes.length / count));
	const picks: INode[] = [];
	for (let index = 0; index < count && index * step < flowNodes.length; index++) {
		picks.push(flowNodes[index * step]);
	}
	return picks;
}

function pinnableNodes(nodes: INode[]): INode[] {
	return nodes.filter((node) => {
		const definition = NODE_TYPE_CYCLE.find((entry) => entry.type === node.type);
		// Allow the trigger to be pinned too — it has no entry in the cycle but is safe.
		if (node.name === TRIGGER_NAME) return true;
		return definition?.pinnable ?? false;
	});
}

function jsonSize(value: unknown): number {
	return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

export function buildCanvasBenchmarkWorkflow(options: BuildOptions): GeneratedWorkflow {
	const { tier, pinScenario = 'none' } = options;
	const nodes = buildNodes(tier);
	const connections = buildConnections(nodes);

	let pinData: IPinData | undefined;
	let pinnedDataBytes = 0;
	if (pinScenario !== 'none') {
		const eligible = pinnableNodes(nodes).map((node) => node.name);
		pinData = buildPinDataForWorkflow(eligible, pinScenario, HEAVY_BUDGET_BY_TIER[tier]);
		pinnedDataBytes = jsonSize(pinData);
		if (pinnedDataBytes > MAX_PINNED_DATA_SIZE) {
			throw new Error(
				`Generated pinned data ${pinnedDataBytes} bytes exceeds MAX_PINNED_DATA_SIZE ${MAX_PINNED_DATA_SIZE}`,
			);
		}
	}

	const workflow: Partial<IWorkflowBase> = {
		name: options.name ?? `Canvas Benchmark ${tier}`,
		nodes,
		connections,
		settings: { executionOrder: 'v1' },
		active: false,
		...(pinData && { pinData }),
	};

	const workflowBytes = jsonSize(workflow);
	if (workflowBytes > MAX_WORKFLOW_SIZE) {
		throw new Error(
			`Generated workflow ${workflowBytes} bytes exceeds MAX_WORKFLOW_SIZE ${MAX_WORKFLOW_SIZE}`,
		);
	}

	return {
		workflow,
		triggerName: TRIGGER_NAME,
		midDepthNodeName: findMidDepthNode(nodes).name,
		sampleNodeNames: pickSampleNodes(nodes, 5).map((node) => node.name),
		pinnedDataBytes,
	};
}
