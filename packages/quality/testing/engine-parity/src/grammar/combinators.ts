import { getEntry, outputCount } from './catalog';
import type { ParamDraft } from './catalog';
import type { CombinatorId, IrEdge } from './ir';

/**
 * The structure tree that fast-check generates and shrinks. It holds only
 * decisions. `lowerBlock` turns it into nodes and edges, so every shape is
 * valid by construction: the SDK does not detect bad port indexes or cycles.
 *
 * Every block has one way in and one way out. Other branches end where they
 * stop. Only `merge` joins branches again, on two different inputs. So by
 * default no input gets more than one connection, which engine v2 refuses.
 * `fanInPlain` breaks this rule on purpose.
 */
export type NodeDraft = { catalogId: string; params: ParamDraft };

export type Block =
	| { kind: 'node'; node: NodeDraft }
	| { kind: 'chain'; blocks: Block[] }
	/** If: output 0 (true) continues, output 1 (false) ends. */
	| { kind: 'branch'; node: NodeDraft; onTrue: Block | null; onFalse: Block | null }
	/** Switch: output 0 continues, the other outputs end. */
	| { kind: 'switch'; node: NodeDraft; cases: Array<Block | null> }
	/** One output into many blocks. The first block continues. */
	| { kind: 'fanOut'; targets: Block[] }
	/** Two branches into the two inputs of a Merge node. */
	| { kind: 'merge'; node: NodeDraft; left: Block | null; right: Block | null }
	/** Many branches into input 0 of one node. Engine v2 refuses this today. */
	| { kind: 'fanInPlain'; sources: Block[]; target: NodeDraft }
	/** Split In Batches: output 1 runs the body, which returns to input 0. Output 0 continues. */
	| { kind: 'loop'; node: NodeDraft; body: Block | null }
	/** A node with `onError: continueErrorOutput`. Its error output goes to the handler. */
	| { kind: 'errorOutput'; node: NodeDraft; handler: Block | null }
	/** Execute Workflow, which calls a sub-workflow made from `body`. */
	| { kind: 'subWorkflow'; node: NodeDraft; body: Block };

export type End = { from: string; out: number };

/** Where the flow is: the open ends, and the nodes that ran before them, oldest first. */
export type Flow = { ends: End[]; upstream: string[] };

export interface PlacedNode {
	key: string;
	catalogId: string;
	draft: ParamDraft;
	via: CombinatorId;
	onError?: 'continueErrorOutput';
	/** The nodes that ran before this node. */
	upstream: string[];
	/** For Execute Workflow nodes: the ID of the sub-workflow that the node calls. */
	subWorkflowId?: string;
}

export interface LowerState {
	nodes: PlacedNode[];
	edges: IrEdge[];
	/** Sub-workflow bodies, by workflow ID. */
	subWorkflows: Map<string, Block>;
	/** Shared with the sub-workflows, so that names and IDs stay unique. */
	counter: { value: number };
}

export function newLowerState(counter = { value: 0 }): LowerState {
	return { nodes: [], edges: [], subWorkflows: new Map(), counter };
}

function shortName(catalogId: string): string {
	const type = getEntry(catalogId).type;
	const name = type.slice(type.lastIndexOf('.') + 1);
	return name.charAt(0).toUpperCase() + name.slice(1);
}

function union(...lists: string[][]): string[] {
	return [...new Set(lists.flat())];
}

export function connect(state: LowerState, ends: End[], to: string, input: number): void {
	for (const end of ends) state.edges.push({ from: end.from, out: end.out, to, in: input });
}

function place(
	state: LowerState,
	node: NodeDraft,
	via: CombinatorId,
	upstream: string[],
	extra: Partial<PlacedNode> = {},
): string {
	state.counter.value += 1;
	const key = `${shortName(node.catalogId)}${state.counter.value}`;
	state.nodes.push({
		key,
		catalogId: node.catalogId,
		draft: node.params,
		via,
		upstream,
		...extra,
	});
	return key;
}

function after(key: string, out: number, upstream: string[]): Flow {
	return { ends: [{ from: key, out }], upstream: [...upstream, key] };
}

/** Places the block after the flow, and returns the flow that continues. */
export function lowerBlock(block: Block, flow: Flow, state: LowerState): Flow {
	switch (block.kind) {
		case 'node': {
			const key = place(state, block.node, 'chain', flow.upstream);
			connect(state, flow.ends, key, 0);
			return after(key, 0, flow.upstream);
		}

		case 'chain':
			return block.blocks.reduce((current, next) => lowerBlock(next, current, state), flow);

		case 'branch': {
			const key = place(state, block.node, 'branch', flow.upstream);
			connect(state, flow.ends, key, 0);
			const onTrue = after(key, 0, flow.upstream);
			const onFalse = after(key, 1, flow.upstream);
			if (block.onFalse) lowerBlock(block.onFalse, onFalse, state);
			return block.onTrue ? lowerBlock(block.onTrue, onTrue, state) : onTrue;
		}

		case 'switch': {
			const key = place(state, block.node, 'switch', flow.upstream);
			connect(state, flow.ends, key, 0);
			const outputs = outputCount(getEntry(block.node.catalogId), block.node.params);
			let continued = after(key, 0, flow.upstream);
			for (let out = 0; out < outputs; out++) {
				const arm = block.cases[out];
				if (!arm) continue;
				const result = lowerBlock(arm, after(key, out, flow.upstream), state);
				if (out === 0) continued = result;
			}
			return continued;
		}

		case 'fanOut': {
			const results = block.targets.map((target) => lowerBlock(target, flow, state));
			return results[0] ?? flow;
		}

		case 'merge': {
			const left = block.left ? lowerBlock(block.left, flow, state) : flow;
			const right = block.right ? lowerBlock(block.right, flow, state) : flow;
			const upstream = union(left.upstream, right.upstream);
			const key = place(state, block.node, 'merge', upstream);
			connect(state, left.ends, key, 0);
			connect(state, right.ends, key, 1);
			return after(key, 0, upstream);
		}

		case 'fanInPlain': {
			const sources = block.sources.map((source) => lowerBlock(source, flow, state));
			const upstream = union(...sources.map((source) => source.upstream));
			const key = place(state, block.target, 'fanInPlain', upstream);
			for (const source of sources) connect(state, source.ends, key, 0);
			return after(key, 0, upstream);
		}

		case 'loop': {
			const key = place(state, block.node, 'loop', flow.upstream);
			connect(state, flow.ends, key, 0);
			const passStart = after(key, 1, flow.upstream);
			const passEnd = block.body ? lowerBlock(block.body, passStart, state) : passStart;
			// The back edge: each pass returns to the batch node.
			connect(state, passEnd.ends, key, 0);
			return { ends: [{ from: key, out: 0 }], upstream: passEnd.upstream };
		}

		case 'errorOutput': {
			const key = place(state, block.node, 'errorOutput', flow.upstream, {
				onError: 'continueErrorOutput',
			});
			connect(state, flow.ends, key, 0);
			// The error output comes after the regular outputs.
			const errorOut = outputCount(getEntry(block.node.catalogId), block.node.params);
			if (block.handler) lowerBlock(block.handler, after(key, errorOut, flow.upstream), state);
			return after(key, 0, flow.upstream);
		}

		case 'subWorkflow': {
			const subWorkflowId = `sub-${state.counter.value + 1}`;
			const key = place(state, block.node, 'subWorkflow', flow.upstream, { subWorkflowId });
			connect(state, flow.ends, key, 0);
			state.subWorkflows.set(subWorkflowId, block.body);
			return after(key, 0, flow.upstream);
		}
	}
}

/** The count of nodes that the block places, sub-workflows included. */
export function blockSize(block: Block): number {
	switch (block.kind) {
		case 'node':
			return 1;
		case 'chain':
			return block.blocks.reduce((sum, next) => sum + blockSize(next), 0);
		case 'branch':
			return 1 + sizeOf(block.onTrue) + sizeOf(block.onFalse);
		case 'switch':
			return 1 + block.cases.reduce((sum, arm) => sum + sizeOf(arm), 0);
		case 'fanOut':
			return block.targets.reduce((sum, target) => sum + blockSize(target), 0);
		case 'merge':
			return 1 + sizeOf(block.left) + sizeOf(block.right);
		case 'fanInPlain':
			return 1 + block.sources.reduce((sum, source) => sum + blockSize(source), 0);
		case 'loop':
			return 1 + sizeOf(block.body);
		case 'errorOutput':
			return 1 + sizeOf(block.handler);
		case 'subWorkflow':
			// The sub-workflow trigger counts too.
			return 2 + blockSize(block.body);
	}
}

function sizeOf(block: Block | null): number {
	return block ? blockSize(block) : 0;
}
