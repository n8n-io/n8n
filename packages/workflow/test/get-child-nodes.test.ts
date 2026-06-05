import { getChildNodes } from '../src/common/get-child-nodes';
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
