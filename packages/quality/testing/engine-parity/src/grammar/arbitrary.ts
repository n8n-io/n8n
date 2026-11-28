import fc from 'fast-check';

import { compile } from '../compile/to-sdk';
import { allowedEntries } from './catalog';
import type { CatalogEntry, GenContext } from './catalog';
import { blockSize, connect, lowerBlock, newLowerState } from './combinators';
import type { Block, LowerState, NodeDraft, PlacedNode } from './combinators';
import { triggerItemsArb } from './data';
import type { IrEdge, IrItem, IrNode, IrWorkflow, ParityCase } from './ir';
import { resolveDraft } from './resolve';
import type { ParityRules } from './rules';

/** What fast-check generates and shrinks. `toIr` turns it into the IR. */
export interface GeneratedCase {
	main: Block;
	items: IrItem[];
	/** More triggers. Each one has its own branch, or connects into a node of the main flow. */
	extraTriggers: Array<{ block: Block | null; attach: number | null }>;
	/** Which trigger fires, modulo the count of triggers. 0 is the main trigger. */
	fired: number;
}

const MAIN_TRIGGER = 'Trigger';
const SUB_TRIGGER = 'Sub Trigger';

const pick = fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true });

function draftArb(entries: CatalogEntry[], ctx: GenContext): fc.Arbitrary<NodeDraft> {
	return fc.oneof(
		...entries.map((entry) => entry.params(ctx).map((params) => ({ catalogId: entry.id, params }))),
	);
}

export function blockArb(rules: ParityRules): fc.Arbitrary<Block> {
	const ctx: GenContext = { rules };
	const has = (id: ParityRules['combinators'][number]) => rules.combinators.includes(id);
	const { width, depth } = rules.limits;

	const plain = allowedEntries(rules.nodes, 'plain');
	if (plain.length === 0) throw new Error(`Rule set "${rules.name}" allows no plain nodes`);
	const ifs = allowedEntries(rules.nodes, 'if');
	const switches = allowedEntries(rules.nodes, 'switch');
	const merges = allowedEntries(rules.nodes, 'merge');
	const loops = allowedEntries(rules.nodes, 'loop');
	const calls = allowedEntries(rules.nodes, 'subWorkflow');

	const plainDraft = draftArb(plain, ctx);
	const nodeBlock: fc.Arbitrary<Block> = plainDraft.map((node) => ({ kind: 'node', node }));

	const { block } = fc.letrec<{ block: Block }>((tie) => {
		const sub = tie('block');
		const optional = fc.option(sub, { nil: null, freq: 3 });
		const options: Array<fc.Arbitrary<Block>> = [nodeBlock];

		if (has('chain')) {
			options.push(
				fc
					.array(sub, { minLength: 2, maxLength: width })
					.map((blocks) => ({ kind: 'chain' as const, blocks })),
			);
		}
		if (has('branch') && ifs.length > 0) {
			options.push(
				fc.record({
					kind: fc.constant('branch' as const),
					node: draftArb(ifs, ctx),
					onTrue: optional,
					onFalse: optional,
				}),
			);
		}
		if (has('switch') && switches.length > 0) {
			options.push(
				fc.record({
					kind: fc.constant('switch' as const),
					node: draftArb(switches, ctx),
					cases: fc.array(optional, { maxLength: width + 1 }),
				}),
			);
		}
		if (has('fanOut')) {
			options.push(
				fc
					.array(sub, { minLength: 2, maxLength: width })
					.map((targets) => ({ kind: 'fanOut' as const, targets })),
			);
		}
		if (has('merge') && merges.length > 0) {
			options.push(
				fc.record({
					kind: fc.constant('merge' as const),
					node: draftArb(merges, ctx),
					left: optional,
					right: optional,
				}),
			);
		}
		if (has('loop') && rules.features.loops && loops.length > 0) {
			// The body is a chain of plain nodes. Engine v2 refuses nested loops, and
			// a body that branches has more than one way back.
			const body = fc
				.array(nodeBlock, { minLength: 1, maxLength: width })
				.map((blocks): Block => ({ kind: 'chain', blocks }));
			options.push(
				fc.record({
					kind: fc.constant('loop' as const),
					node: draftArb(loops, ctx),
					body: fc.option(body, { nil: null, freq: 4 }),
				}),
			);
		}
		if (has('errorOutput') && rules.features.errorOutputs) {
			options.push(
				fc.record({
					kind: fc.constant('errorOutput' as const),
					node: plainDraft,
					handler: optional,
				}),
			);
		}
		if (has('subWorkflow') && calls.length > 0) {
			options.push(
				fc.record({
					kind: fc.constant('subWorkflow' as const),
					node: draftArb(calls, ctx),
					body: sub,
				}),
			);
		}

		return {
			// The first option is the leaf: past the maximum depth, only leaves remain.
			block: fc.oneof({ maxDepth: depth, depthSize: 'small', withCrossShrink: true }, ...options),
		};
	});

	return block;
}

export function generatedCaseArb(rules: ParityRules): fc.Arbitrary<GeneratedCase> {
	const block = blockArb(rules);
	const nodeChain = fc
		.array(
			draftArb(allowedEntries(rules.nodes, 'plain'), { rules }).map(
				(node): Block => ({ kind: 'node', node }),
			),
			{ minLength: 1, maxLength: 2 },
		)
		.map((blocks): Block => ({ kind: 'chain', blocks }));

	return fc.record({
		// The main trigger counts as one node.
		main: block.filter((main) => blockSize(main) <= rules.limits.nodes - 1),
		items: triggerItemsArb(rules.limits.items),
		extraTriggers: rules.features.multiTrigger
			? fc.array(
					fc.record({
						block: fc.option(nodeChain, { nil: null }),
						attach: fc.option(pick, { nil: null }),
					}),
					{ maxLength: 2 },
				)
			: fc.constant([]),
		fired: fc.nat({ max: 2 }),
	});
}

function pickFrom<T>(list: T[], fraction: number): T | undefined {
	if (list.length === 0) return undefined;
	return list[Math.min(list.length - 1, Math.floor(fraction * list.length))];
}

function descendants(key: string, edges: IrEdge[]): Set<string> {
	const found = new Set<string>();
	const queue = [key];
	while (queue.length > 0) {
		const current = queue.shift()!;
		for (const edge of edges) {
			if (edge.from === current && !found.has(edge.to)) {
				found.add(edge.to);
				queue.push(edge.to);
			}
		}
	}
	return found;
}

/**
 * Fills the parameter holes of every placed node, now that all nodes are known.
 *
 * A reference to a node that did not run names a node downstream, or a node
 * that does not exist. Not a node on a parallel branch: engine v1 runs
 * branches one after another, so whether that node ran depends on run order.
 */
function toIrNodes(placed: PlacedNode[], edges: IrEdge[]): IrNode[] {
	return placed.map((node) => {
		const upstream = new Set(node.upstream);
		const downstream = [...descendants(node.key, edges)].filter(
			(key) => key !== node.key && !upstream.has(key),
		);
		const params = resolveDraft(node.draft, {
			scope: { upstream: node.upstream, elsewhere: [...downstream, 'Ghost'] },
			subWorkflowId: node.subWorkflowId,
		});
		return {
			key: node.key,
			catalogId: node.catalogId,
			params: typeof params === 'object' && params !== null ? { ...params } : {},
			via: node.via,
			...(node.onError ? { flags: { onError: node.onError } } : {}),
		};
	});
}

function lowerSubWorkflows(state: LowerState): Record<string, IrWorkflow> {
	const result: Record<string, IrWorkflow> = {};
	const queue = [...state.subWorkflows.entries()];
	while (queue.length > 0) {
		const [id, body] = queue.shift()!;
		const sub = newLowerState(state.counter);
		lowerBlock(body, { ends: [{ from: SUB_TRIGGER, out: 0 }], upstream: [SUB_TRIGGER] }, sub);
		queue.push(...sub.subWorkflows.entries());
		result[id] = {
			triggers: [
				{ key: SUB_TRIGGER, catalogId: 'trigger.executeWorkflow', params: {}, via: 'trigger' },
			],
			nodes: toIrNodes(sub.nodes, sub.edges),
			edges: sub.edges,
			// The caller gives the items.
			triggerItems: [],
			firedTrigger: SUB_TRIGGER,
		};
	}
	return result;
}

export function toIr(generated: GeneratedCase): IrWorkflow {
	const state = newLowerState();
	lowerBlock(
		generated.main,
		{ ends: [{ from: MAIN_TRIGGER, out: 0 }], upstream: [MAIN_TRIGGER] },
		state,
	);
	const mainNodes = state.nodes.map((node) => node.key);

	const triggers: IrNode[] = [
		{ key: MAIN_TRIGGER, catalogId: 'trigger.manual', params: {}, via: 'trigger' },
	];
	generated.extraTriggers.forEach((extra, i) => {
		const key = `${MAIN_TRIGGER} ${i + 2}`;
		triggers.push({ key, catalogId: 'trigger.manual', params: {}, via: 'trigger' });
		const target = extra.attach === null ? undefined : pickFrom(mainNodes, extra.attach);
		if (target !== undefined) {
			connect(state, [{ from: key, out: 0 }], target, 0);
		} else if (extra.block) {
			lowerBlock(extra.block, { ends: [{ from: key, out: 0 }], upstream: [key] }, state);
		}
	});

	const triggerKeys = triggers.map((trigger) => trigger.key);
	const subWorkflows = lowerSubWorkflows(state);
	const { edges } = state;
	const nodes = toIrNodes(state.nodes, edges);

	return {
		triggers,
		nodes,
		edges,
		triggerItems: generated.items,
		firedTrigger: triggerKeys[generated.fired % triggerKeys.length],
		...(Object.keys(subWorkflows).length > 0 ? { subWorkflows } : {}),
	};
}

export function toParityCase(ir: IrWorkflow): ParityCase {
	const subWorkflows = Object.fromEntries(
		Object.entries(ir.subWorkflows ?? {}).map(([id, sub]) => [id, compile(sub, id)]),
	);
	return { ir, workflow: compile(ir), subWorkflows };
}

/** The arbitrary of whole cases: generate, lower to the IR, and compile with the SDK. */
export function parityCaseArb(rules: ParityRules): fc.Arbitrary<ParityCase> {
	return generatedCaseArb(rules).map((generated) => toParityCase(toIr(generated)));
}
