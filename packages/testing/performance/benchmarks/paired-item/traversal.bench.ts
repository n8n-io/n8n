/**
 * Paired item ancestry traversal benchmarks.
 *
 * `$('Node').item` / `.itemMatching()` walk an item's `pairedItem` chain back
 * through every ancestor, once per expression that uses them. Ancestry is a DAG,
 * so an item reachable through many paths must be expanded once, not once per path.
 *
 * Keep the chains short: `itemMatching` also runs a `getParentNodes` connection
 * check that is superlinear in the chain length and would otherwise dominate.
 */
import { bench, describe } from 'vitest';
import { Workflow, WorkflowDataProxy } from 'n8n-workflow';
import type {
	IConnections,
	IExecuteData,
	INode,
	INodeExecutionData,
	INodeTypes,
	IPairedItemData,
	IRunExecutionData,
	ITaskData,
} from 'n8n-workflow';

import { BENCH_OPTIONS } from '../bench-options';

const MAIN = 'main';

/** An unknown node type leaves the node as given; the traversal reads only run data and connections. */
const nodeTypes: INodeTypes = {
	getByName: () => undefined as never,
	getByNameAndVersion: () => undefined as never,
	getKnownTypes: () => ({}),
};

type ChainSpec = {
	/** Items in each node's output; its length is the chain length. */
	widths: number[];
	pairing: (d: number, i: number, widths: number[]) => IPairedItemData | IPairedItemData[];
};

/** A -> B -> C -> ... with run data attached to every node. */
function buildChain({ widths, pairing }: ChainSpec) {
	const nodes: INode[] = [];
	const connections: IConnections = {};
	const runData: IRunExecutionData['resultData']['runData'] = {};

	for (let d = 0; d < widths.length; d++) {
		const name = `n${d}`;
		nodes.push({
			id: name,
			name,
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [d * 100, 0],
			parameters: {},
		});

		if (d < widths.length - 1) {
			connections[name] = { [MAIN]: [[{ node: `n${d + 1}`, type: MAIN, index: 0 }]] };
		}

		const items: INodeExecutionData[] = [];
		for (let i = 0; i < widths[d]!; i++) {
			const item: INodeExecutionData = { json: { d, i } };
			if (d > 0) item.pairedItem = pairing(d, i, widths);
			items.push(item);
		}

		runData[name] = [
			{
				startTime: 0,
				executionTime: 0,
				executionIndex: d,
				source: d === 0 ? [] : [{ previousNode: `n${d - 1}`, previousNodeRun: 0 }],
				data: { [MAIN]: [items] },
			} satisfies ITaskData,
		];
	}

	return { nodes, connections, runData };
}

/** A proxy on the last node of the chain, ready to trace back to the first. */
function proxyForChain(spec: ChainSpec) {
	const { nodes, connections, runData } = buildChain(spec);
	const activeNode = `n${spec.widths.length - 1}`;
	const taskData = runData[activeNode]![0]!;
	const inputData = taskData.data![MAIN]![0]!;

	const executeData: IExecuteData = {
		data: taskData.data!,
		node: nodes[nodes.length - 1]!,
		source: { [MAIN]: taskData.source },
	};

	return new WorkflowDataProxy(
		new Workflow({ id: 'bench', name: 'bench', nodes, connections, active: false, nodeTypes }),
		{ resultData: { runData } } as IRunExecutionData,
		0,
		0,
		activeNode,
		inputData,
		{},
		'manual',
		{},
		executeData,
	).getDataProxy();
}

/** The last node's items carry a single paired item, the proxy's entry point into the walk. */
const isLastNode = (d: number, widths: number[]) => d === widths.length - 1;

/**
 * origin -> {bN, cN} -> mN -> {bN+1, cN+1} -> ... : 2^diamonds paths to the last
 * merge, where the chain shapes above reach a shared ancestor from one node.
 */
function diamondProxy(diamonds: number) {
	const nodes: INode[] = [];
	const connections: IConnections = {};
	const runData: IRunExecutionData['resultData']['runData'] = {};

	const addNode = (name: string) => {
		nodes.push({
			id: name,
			name,
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [nodes.length * 100, 0],
			parameters: {},
		});
	};
	const link = (from: string, to: string, index: number) => {
		connections[from] ??= { [MAIN]: [[]] };
		connections[from][MAIN][0]!.push({ node: to, type: MAIN, index });
	};
	const task = (
		source: ITaskData['source'],
		pairedItem: IPairedItemData | IPairedItemData[] | undefined,
	) =>
		[
			{
				startTime: 0,
				executionTime: 0,
				executionIndex: 0,
				source,
				data: { [MAIN]: [[{ json: {}, ...(pairedItem ? { pairedItem } : {}) }]] },
			} satisfies ITaskData,
		] as ITaskData[];

	addNode('origin');
	runData.origin = task([], undefined);

	let cur = 'origin';
	for (let i = 0; i < diamonds; i++) {
		const [b, c, m] = [`b${i}`, `c${i}`, `m${i}`];
		for (const branch of [b, c]) {
			addNode(branch);
			link(cur, branch, 0);
			runData[branch] = task([{ previousNode: cur, previousNodeRun: 0 }], { item: 0, input: 0 });
		}
		addNode(m);
		link(b, m, 0);
		link(c, m, 1);
		runData[m] = task(
			[
				{ previousNode: b, previousNodeRun: 0 },
				{ previousNode: c, previousNodeRun: 0 },
			],
			[
				{ item: 0, input: 0 },
				{ item: 0, input: 1 },
			],
		);
		cur = m;
	}

	addNode('end');
	link(cur, 'end', 0);
	runData.end = task([{ previousNode: cur, previousNodeRun: 0 }], { item: 0, input: 0 });

	const taskData = runData.end![0]!;
	return new WorkflowDataProxy(
		new Workflow({ id: 'bench', name: 'bench', nodes, connections, active: false, nodeTypes }),
		{ resultData: { runData } } as IRunExecutionData,
		0,
		0,
		'end',
		taskData.data![MAIN]![0]!,
		{},
		'manual',
		{},
		{
			data: taskData.data!,
			node: nodes[nodes.length - 1]!,
			source: { [MAIN]: taskData.source },
		},
	).getDataProxy();
}

describe('Paired item ancestry traversal', () => {
	// Every item pairs to the same ancestor twice: 2^depth paths over `depth`
	// distinct items. Exponential paths, must stay linear.
	const recombining = proxyForChain({
		widths: Array<number>(20).fill(1),
		pairing: (d, i, widths) =>
			isLastNode(d, widths)
				? { item: i, input: 0 }
				: [
						{ item: 0, input: 0 },
						{ item: 0, input: 0 },
					],
	});
	bench(
		'itemMatching: recombining chain (20 nodes, 2^20 paths)',
		() => {
			recombining.$('n0').itemMatching(0);
		},
		BENCH_OPTIONS,
	);

	// One item paired to 10k inputs that all trace to the same origin: no path is
	// walked twice, so every visit is new work.
	const FAN = 10_000;
	const fanIn = proxyForChain({
		widths: [1, FAN, 1, 1],
		pairing: (d, i, widths) => {
			if (isLastNode(d, widths)) return { item: i, input: 0 };
			if (d === 2) return Array.from({ length: FAN }, (_, k) => ({ item: k, input: 0 }));
			return { item: 0, input: 0 };
		},
	});
	bench(
		`itemMatching: fan-in (one item paired to ${FAN} ancestors)`,
		() => {
			fanIn.$('n0').itemMatching(0);
		},
		BENCH_OPTIONS,
	);

	// Branches converge from two separate parents, so a shared ancestor is reached
	// under one state from several routes. Exponential paths, must stay linear.
	const diamonds = diamondProxy(14);
	bench(
		'itemMatching: diamond chain (14 diamonds, 2^14 paths)',
		() => {
			diamonds.$('origin').itemMatching(0);
		},
		BENCH_OPTIONS,
	);
});
