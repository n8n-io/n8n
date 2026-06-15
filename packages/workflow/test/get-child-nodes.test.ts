import fc from 'fast-check';

import { getChildNodes } from '../src/common/get-child-nodes';
import { getParentNodes } from '../src/common/get-parent-nodes';
import { mapConnectionsByDestination } from '../src/common/map-connections-by-destination';
import type { IConnections } from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';

// `getChildNodes` is a thin wrapper around `getConnectedNodes` operating on
// source-indexed connections. To pin its observable contract (and kill the
// small but high-leverage set of Stryker mutants on this file — block removal,
// default-value tampering on `type` and `depth`, argument passthrough), we
// exercise every default explicitly and assert on identity, ordering and depth
// boundaries rather than length alone.

describe('getChildNodes', () => {
	// A → B → C → D, indexed by source so each node lists its outgoing.
	const linearMainChain: IConnections = {
		A: {
			[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
		},
		B: {
			[NodeConnectionTypes.Main]: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]],
		},
		C: {
			[NodeConnectionTypes.Main]: [[{ node: 'D', type: NodeConnectionTypes.Main, index: 0 }]],
		},
	};

	it('returns an array', () => {
		// Kills BlockStatement mutation that removes the body and makes the
		// function implicitly return undefined.
		const result = getChildNodes(linearMainChain, 'A');

		expect(Array.isArray(result)).toBe(true);
	});

	it('uses NodeConnectionTypes.Main as the default type', () => {
		// If the default were anything other than 'main' (the Main enum value),
		// MainChild would not be returned because it is wired through Main.
		const mixedTypes: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'MainChild', type: NodeConnectionTypes.Main, index: 0 }],
				],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'ToolChild', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		};

		const result = getChildNodes(mixedTypes, 'Root');

		expect(result).toEqual(['MainChild']);
		expect(result).not.toContain('ToolChild');
	});

	it('uses unlimited depth (-1) by default and traverses the full chain', () => {
		// Pins the default for `depth`: a mutation that flips `-1` to `+1`
		// or `0` would only return direct children (or none), so we assert the
		// full chain forward to the leaf.
		const result = getChildNodes(linearMainChain, 'A');

		expect(result).toEqual(['D', 'C', 'B']);
	});

	it('returns direct children (depth boundary) when depth is 1', () => {
		const result = getChildNodes(linearMainChain, 'A', NodeConnectionTypes.Main, 1);

		expect(result).toEqual(['B']);
	});

	it('returns children up to depth 2', () => {
		const result = getChildNodes(linearMainChain, 'A', NodeConnectionTypes.Main, 2);

		expect(result).toEqual(['C', 'B']);
	});

	it('returns an empty array when depth is 0', () => {
		const result = getChildNodes(linearMainChain, 'A', NodeConnectionTypes.Main, 0);

		expect(result).toEqual([]);
	});

	it('returns an empty array when the source node has no outgoing connections', () => {
		const result = getChildNodes(linearMainChain, 'D');

		expect(result).toEqual([]);
	});

	it('returns an empty array when the source node is absent from the connections map', () => {
		const result = getChildNodes(linearMainChain, 'NotAnyNodeInTheGraph');

		expect(result).toEqual([]);
	});

	it('filters by an explicit non-main connection type', () => {
		const mixedTypes: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'MainChild', type: NodeConnectionTypes.Main, index: 0 }],
				],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'ToolChild', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		};

		const result = getChildNodes(mixedTypes, 'Root', NodeConnectionTypes.AiTool);

		expect(result).toEqual(['ToolChild']);
		expect(result).not.toContain('MainChild');
	});

	it('returns children across all types when type is "ALL"', () => {
		const mixedTypes: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'MainChild', type: NodeConnectionTypes.Main, index: 0 }],
				],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'ToolChild', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		};

		const result = getChildNodes(mixedTypes, 'Root', 'ALL');

		expect(result).toEqual(expect.arrayContaining(['MainChild', 'ToolChild']));
		expect(result).toHaveLength(2);
	});

	it('returns only non-main children when type is "ALL_NON_MAIN"', () => {
		const mixedTypes: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'MainChild', type: NodeConnectionTypes.Main, index: 0 }],
				],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'ToolChild', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		};

		const result = getChildNodes(mixedTypes, 'Root', 'ALL_NON_MAIN');

		expect(result).toEqual(['ToolChild']);
		expect(result).not.toContain('MainChild');
	});

	it('passes the nodeName argument through (different names yield different children)', () => {
		// Pins the `nodeName` argument-passthrough: if the call site dropped
		// or swapped this argument the per-node children would not match.
		const branched: IConnections = {
			Root1: {
				[NodeConnectionTypes.Main]: [[{ node: 'Mid1', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			Root2: {
				[NodeConnectionTypes.Main]: [[{ node: 'Mid2', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			Mid1: {
				[NodeConnectionTypes.Main]: [[{ node: 'Leaf1', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			Mid2: {
				[NodeConnectionTypes.Main]: [[{ node: 'Leaf2', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		};

		expect(getChildNodes(branched, 'Root1')).toEqual(['Leaf1', 'Mid1']);
		expect(getChildNodes(branched, 'Root2')).toEqual(['Leaf2', 'Mid2']);
	});

	it('handles diamond descendants without duplicating shared children', () => {
		//        Root
		//        /  \
		//      Mid1 Mid2
		//        \  /
		//        Leaf
		const diamond: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [
					[
						{ node: 'Mid1', type: NodeConnectionTypes.Main, index: 0 },
						{ node: 'Mid2', type: NodeConnectionTypes.Main, index: 0 },
					],
				],
			},
			Mid1: {
				[NodeConnectionTypes.Main]: [[{ node: 'Leaf', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			Mid2: {
				[NodeConnectionTypes.Main]: [[{ node: 'Leaf', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		};

		const result = getChildNodes(diamond, 'Root');

		expect(result).toHaveLength(3);
		expect(result).toEqual(expect.arrayContaining(['Leaf', 'Mid1', 'Mid2']));
		// Shared descendant is listed exactly once.
		expect(result.filter((n) => n === 'Leaf')).toHaveLength(1);
	});

	it('terminates on cycles without revisiting nodes', () => {
		// A → B → A creates a cycle through main connections; the traversal
		// must stop rather than blow the stack and must not list duplicates.
		const cycle: IConnections = {
			A: {
				[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			B: {
				[NodeConnectionTypes.Main]: [[{ node: 'A', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		};

		const result = getChildNodes(cycle, 'A');

		expect(result).toEqual(['B']);
	});

	it('does not mutate the input connections map', () => {
		const before = JSON.stringify(linearMainChain);

		getChildNodes(linearMainChain, 'A');

		expect(JSON.stringify(linearMainChain)).toBe(before);
	});

	it('treats an unknown explicit connection type as having no children', () => {
		const result = getChildNodes(
			linearMainChain,
			'A',
			NodeConnectionTypes.AiTool /* no AiTool wired in this graph */,
		);

		expect(result).toEqual([]);
	});

	it('respects depth across a non-main connection type', () => {
		// Cross-checks that `type` and `depth` are both honoured when explicit:
		// a 3-hop AiTool chain should be fully traversed by default depth, and
		// truncated at depth 1.
		const aiToolChain: IConnections = {
			Z: {
				[NodeConnectionTypes.AiTool]: [[{ node: 'Y', type: NodeConnectionTypes.AiTool, index: 0 }]],
			},
			Y: {
				[NodeConnectionTypes.AiTool]: [[{ node: 'X', type: NodeConnectionTypes.AiTool, index: 0 }]],
			},
			X: {
				[NodeConnectionTypes.AiTool]: [[{ node: 'W', type: NodeConnectionTypes.AiTool, index: 0 }]],
			},
		};

		expect(getChildNodes(aiToolChain, 'Z', NodeConnectionTypes.AiTool)).toEqual(['W', 'X', 'Y']);
		expect(getChildNodes(aiToolChain, 'Z', NodeConnectionTypes.AiTool, 1)).toEqual(['Y']);
	});
});

// ─── Exemplar: property-based tests with fast-check (DEVP-373) ───────────────
// These complement the example tests above — properties generalise the contract
// across thousands of random graphs instead of a handful of hand-built ones.
// Pattern to copy for the other graph utilities (get-parent-nodes,
// get-connected-nodes, …):
//   1. a small, overlapping generator so edges collide → diamonds + cycles arise;
//   2. a hand-built MODEL ORACLE the output is checked against (here: plain
//      graph reachability);
//   3. one named invariant per `fc.assert(fc.property(...))`, plus a metamorphic
//      relation (here: child/parent duality under `mapConnectionsByDestination`).
describe('getChildNodes — properties (fast-check)', () => {
	const Main = NodeConnectionTypes.Main;

	/** Build source-indexed main connections from index-pair edges (all on output 0). */
	const buildConnections = (edges: Array<[number, number]>): IConnections => {
		const conns: IConnections = {};
		for (const [from, to] of edges) {
			const src = `n${from}`;
			if (!conns[src]) conns[src] = {};
			if (!conns[src][Main]) conns[src][Main] = [[]];
			conns[src][Main][0]!.push({ node: `n${to}`, type: Main, index: 0 });
		}
		return conns;
	};

	/** Model oracle: main-reachable nodes from `start`, excluding `start` itself. */
	const reachableMain = (conns: IConnections, start: string): Set<string> => {
		const seen = new Set<string>();
		const stack = [start];
		while (stack.length) {
			const node = stack.pop()!;
			for (const output of conns[node]?.[Main] ?? []) {
				for (const connection of output ?? []) {
					if (!seen.has(connection.node)) {
						seen.add(connection.node);
						stack.push(connection.node);
					}
				}
			}
		}
		seen.delete(start); // a node is never its own child, even via a cycle
		return seen;
	};

	// Deliberately tiny, overlapping domains so paths collide (diamonds & cycles).
	const graph = fc.integer({ min: 1, max: 5 }).chain((nodeCount) =>
		fc.record({
			nodeCount: fc.constant(nodeCount),
			// Distinct (source → dest) edges: real workflow connections never
			// duplicate an identical edge, and the traversal only de-dupes across
			// branches, not identical direct successors — so model the domain with
			// uniqueArray rather than asserting a guarantee the input never gives.
			edges: fc.uniqueArray(
				fc.tuple(
					fc.integer({ min: 0, max: nodeCount - 1 }),
					fc.integer({ min: 0, max: nodeCount - 1 }),
				),
				{ maxLength: 10, selector: ([from, to]) => `${from}->${to}` },
			),
			start: fc.integer({ min: 0, max: nodeCount - 1 }),
		}),
	);

	it('COMPLETE_AND_SOUND — result set equals the main-reachable set', () => {
		fc.assert(
			fc.property(graph, ({ edges, start }) => {
				const conns = buildConnections(edges);
				expect(new Set(getChildNodes(conns, `n${start}`))).toEqual(
					reachableMain(conns, `n${start}`),
				);
			}),
		);
	});

	it('NO_SELF_NO_DUPES — start is excluded and every node appears at most once', () => {
		fc.assert(
			fc.property(graph, ({ edges, start }) => {
				const result = getChildNodes(buildConnections(edges), `n${start}`);
				expect(result).not.toContain(`n${start}`);
				expect(new Set(result).size).toBe(result.length);
			}),
		);
	});

	it('DEPTH_1_IS_DIRECT — depth 1 returns exactly the direct successors', () => {
		fc.assert(
			fc.property(graph, ({ edges, start }) => {
				const conns = buildConnections(edges);
				const direct = new Set(
					(conns[`n${start}`]?.[Main] ?? []).flatMap((o) => (o ?? []).map((c) => c.node)),
				);
				direct.delete(`n${start}`);
				expect(new Set(getChildNodes(conns, `n${start}`, Main, 1))).toEqual(direct);
			}),
		);
	});

	it('DEPTH_MONOTONIC — a deeper traversal never drops a node', () => {
		fc.assert(
			fc.property(graph, fc.integer({ min: 1, max: 5 }), ({ edges, start }, k) => {
				const conns = buildConnections(edges);
				const deeper = new Set(getChildNodes(conns, `n${start}`, Main, k + 1));
				for (const node of getChildNodes(conns, `n${start}`, Main, k)) {
					expect(deeper.has(node)).toBe(true);
				}
			}),
		);
	});

	it('CHILD_PARENT_DUALITY — c is a child of s ⇔ s is a parent of c in the inverted graph', () => {
		fc.assert(
			fc.property(graph, ({ nodeCount, edges, start }) => {
				const conns = buildConnections(edges);
				const inverted = mapConnectionsByDestination(conns);
				const children = new Set(getChildNodes(conns, `n${start}`));
				for (let i = 0; i < nodeCount; i++) {
					expect(getParentNodes(inverted, `n${i}`).includes(`n${start}`)).toBe(
						children.has(`n${i}`),
					);
				}
			}),
		);
	});
});
