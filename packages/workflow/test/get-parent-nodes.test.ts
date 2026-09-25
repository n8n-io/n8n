import { getParentNodes } from '../src/common/get-parent-nodes';
import type { IConnections } from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';

// `getParentNodes` is a thin wrapper around `getConnectedNodes` operating on
// destination-indexed connections. To pin its observable contract (and kill
// the small but high-leverage set of Stryker mutants on this file — block
// removal, default-value tampering on `type` and `depth`, argument passthrough),
// we exercise every default explicitly and assert on identity, ordering and
// depth boundaries rather than length alone.

describe('getParentNodes', () => {
	// A → B → C → D, indexed by destination so each node lists its incoming.
	const linearMainChain: IConnections = {
		D: {
			[NodeConnectionTypes.Main]: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]],
		},
		C: {
			[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
		},
		B: {
			[NodeConnectionTypes.Main]: [[{ node: 'A', type: NodeConnectionTypes.Main, index: 0 }]],
		},
	};

	it('returns an array', () => {
		// Kills BlockStatement mutation that removes the body and makes the
		// function implicitly return undefined.
		const result = getParentNodes(linearMainChain, 'D');

		expect(Array.isArray(result)).toBe(true);
	});

	it('uses NodeConnectionTypes.Main as the default type', () => {
		// If the default were anything other than 'main' (the Main enum value),
		// MainParent would not be returned because it is wired through Main.
		const mixedTypes: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'MainParent', type: NodeConnectionTypes.Main, index: 0 }],
				],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'ToolParent', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		};

		const result = getParentNodes(mixedTypes, 'Root');

		expect(result).toEqual(['MainParent']);
		expect(result).not.toContain('ToolParent');
	});

	it('uses unlimited depth (-1) by default and traverses the full chain', () => {
		// Pins the default for `depth`: a mutation that flips `-1` to `+1`
		// or `0` would only return direct parents (or none), so we assert the
		// full chain back to the root.
		const result = getParentNodes(linearMainChain, 'D');

		expect(result).toEqual(['A', 'B', 'C']);
	});

	it('returns direct parents (depth boundary) when depth is 1', () => {
		const result = getParentNodes(linearMainChain, 'D', NodeConnectionTypes.Main, 1);

		expect(result).toEqual(['C']);
	});

	it('returns parents up to depth 2', () => {
		const result = getParentNodes(linearMainChain, 'D', NodeConnectionTypes.Main, 2);

		expect(result).toEqual(['B', 'C']);
	});

	it('returns an empty array when depth is 0', () => {
		const result = getParentNodes(linearMainChain, 'D', NodeConnectionTypes.Main, 0);

		expect(result).toEqual([]);
	});

	it('returns an empty array when the destination node has no incoming connections', () => {
		const result = getParentNodes(linearMainChain, 'A');

		expect(result).toEqual([]);
	});

	it('returns an empty array when the destination node is absent from the connections map', () => {
		const result = getParentNodes(linearMainChain, 'NotAnyNodeInTheGraph');

		expect(result).toEqual([]);
	});

	it('filters by an explicit non-main connection type', () => {
		const mixedTypes: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'MainParent', type: NodeConnectionTypes.Main, index: 0 }],
				],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'ToolParent', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		};

		const result = getParentNodes(mixedTypes, 'Root', NodeConnectionTypes.AiTool);

		expect(result).toEqual(['ToolParent']);
		expect(result).not.toContain('MainParent');
	});

	it('returns parents across all types when type is "ALL"', () => {
		const mixedTypes: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'MainParent', type: NodeConnectionTypes.Main, index: 0 }],
				],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'ToolParent', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		};

		const result = getParentNodes(mixedTypes, 'Root', 'ALL');

		expect(result).toEqual(expect.arrayContaining(['MainParent', 'ToolParent']));
		expect(result).toHaveLength(2);
	});

	it('returns only non-main parents when type is "ALL_NON_MAIN"', () => {
		const mixedTypes: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'MainParent', type: NodeConnectionTypes.Main, index: 0 }],
				],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'ToolParent', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		};

		const result = getParentNodes(mixedTypes, 'Root', 'ALL_NON_MAIN');

		expect(result).toEqual(['ToolParent']);
		expect(result).not.toContain('MainParent');
	});

	it('passes the nodeName argument through (different names yield different parents)', () => {
		// Pins the `nodeName` argument-passthrough: if the call site dropped
		// or swapped this argument the per-node parents would not match.
		const branched: IConnections = {
			Leaf1: {
				[NodeConnectionTypes.Main]: [[{ node: 'Mid1', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			Leaf2: {
				[NodeConnectionTypes.Main]: [[{ node: 'Mid2', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			Mid1: {
				[NodeConnectionTypes.Main]: [[{ node: 'Root', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			Mid2: {
				[NodeConnectionTypes.Main]: [[{ node: 'Root', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		};

		expect(getParentNodes(branched, 'Leaf1')).toEqual(['Root', 'Mid1']);
		expect(getParentNodes(branched, 'Leaf2')).toEqual(['Root', 'Mid2']);
	});

	it('handles diamond ancestors without duplicating shared parents', () => {
		//        Root
		//        /  \
		//      Mid1 Mid2
		//        \  /
		//        Leaf
		const diamond: IConnections = {
			Leaf: {
				[NodeConnectionTypes.Main]: [
					[
						{ node: 'Mid1', type: NodeConnectionTypes.Main, index: 0 },
						{ node: 'Mid2', type: NodeConnectionTypes.Main, index: 0 },
					],
				],
			},
			Mid1: {
				[NodeConnectionTypes.Main]: [[{ node: 'Root', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			Mid2: {
				[NodeConnectionTypes.Main]: [[{ node: 'Root', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		};

		const result = getParentNodes(diamond, 'Leaf');

		expect(result).toHaveLength(3);
		expect(result).toEqual(expect.arrayContaining(['Root', 'Mid1', 'Mid2']));
		// Shared ancestor is listed exactly once.
		expect(result.filter((n) => n === 'Root')).toHaveLength(1);
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

		const result = getParentNodes(cycle, 'A');

		expect(result).toEqual(['B']);
	});

	it('does not mutate the input connections map', () => {
		const before = JSON.stringify(linearMainChain);

		getParentNodes(linearMainChain, 'D');

		expect(JSON.stringify(linearMainChain)).toBe(before);
	});

	it('treats an unknown explicit connection type as having no parents', () => {
		const result = getParentNodes(
			linearMainChain,
			'D',
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

		expect(getParentNodes(aiToolChain, 'Z', NodeConnectionTypes.AiTool)).toEqual(['W', 'X', 'Y']);
		expect(getParentNodes(aiToolChain, 'Z', NodeConnectionTypes.AiTool, 1)).toEqual(['Y']);
	});
});
