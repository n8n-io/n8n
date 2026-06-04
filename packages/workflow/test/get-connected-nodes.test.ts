import { getConnectedNodes } from '../src/common/get-connected-nodes';
import type { IConnections } from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';

// Direct tests for `getConnectedNodes`. The two public wrappers
// (`getChildNodes`, `getParentNodes`) cover almost all of its behaviour, but
// a handful of mutants are only reachable when the function is exercised
// directly:
//
//   * Line 15 — default value of `depth`. Both wrappers pass `depth`
//     through, so the function's own default is never used via them.
//   * Line 18 / 54 / 78 — `checkedNodesIncoming` is internal-only and not
//     exposed by either wrapper; we must call the function directly to
//     prime it.
//   * Line 52 — the empty-array literal in the `checkedNodesIncoming
//     ? [...] : []` branch is only observable when a node name collides
//     with Stryker's sentinel string ("Stryker was here").
//   * Line 62 — the `connectionsByIndex?.forEach(...)` optional chain is
//     only exercised when an input/output slot is genuinely `null` /
//     `undefined`, which the wrapper tests don't construct.

describe('getConnectedNodes', () => {
	// A -> B -> C -> D, indexed by source.
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

	describe('defaults', () => {
		it('uses NodeConnectionTypes.Main as the default connection type', () => {
			// If the default were anything but 'main', `MainChild` (wired via
			// Main) would not be returned and `ToolChild` would.
			const mixed: IConnections = {
				Root: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'MainChild', type: NodeConnectionTypes.Main, index: 0 }],
					],
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'ToolChild', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
			};

			expect(getConnectedNodes(mixed, 'Root')).toEqual(['MainChild']);
		});

		it('uses unlimited depth (-1) as the default and walks the entire chain', () => {
			// Pins the function's *own* depth default (`depth = -1`), which the
			// wrappers do not exercise because they always pass their own
			// `depth` through. A mutation flipping the default to `+1`, `0` or
			// any other finite value would truncate the chain and lose nodes.
			const result = getConnectedNodes(linearMainChain, 'A');

			expect(result).toEqual(['D', 'C', 'B']);
		});

		it('treats an explicit depth of -1 as equivalent to omitting depth', () => {
			// Cross-checks that the sentinel value -1 reaches the same
			// terminal state as the default. If `depth - 1` were ever applied
			// to -1 (the `depth === -1 ? depth : depth - 1` guard) the chain
			// would still terminate but stops behaving as "unlimited"
			// against larger graphs; locking parity with the default keeps
			// the contract honest.
			expect(getConnectedNodes(linearMainChain, 'A', NodeConnectionTypes.Main, -1)).toEqual(
				getConnectedNodes(linearMainChain, 'A'),
			);
		});
	});

	describe('depth boundary', () => {
		it('returns an empty array at depth 0 before reading connections', () => {
			expect(getConnectedNodes(linearMainChain, 'A', NodeConnectionTypes.Main, 0)).toEqual([]);
		});

		it('returns only direct neighbours at depth 1', () => {
			expect(getConnectedNodes(linearMainChain, 'A', NodeConnectionTypes.Main, 1)).toEqual(['B']);
		});

		it('decrements depth by exactly one on each recursive step (depth 2)', () => {
			// A -> B -> C; depth 2 must include C, depth 1 must not.
			expect(getConnectedNodes(linearMainChain, 'A', NodeConnectionTypes.Main, 2)).toEqual([
				'C',
				'B',
			]);
		});

		it('depth N+1 is a superset of depth N (monotonic in depth)', () => {
			// Property: extending depth can only add nodes, never lose them.
			// Locks the `depth - 1` arithmetic against arithmetic-operator
			// mutations that would corrupt the recursion budget.
			const seen: string[][] = [];
			for (let d = 0; d <= 4; d++) {
				seen.push(getConnectedNodes(linearMainChain, 'A', NodeConnectionTypes.Main, d));
			}

			for (let d = 0; d < seen.length - 1; d++) {
				for (const node of seen[d]) {
					expect(seen[d + 1]).toContain(node);
				}
			}
			expect(seen[4]).toEqual(['D', 'C', 'B']);
		});
	});

	describe('membership tracking via checkedNodesIncoming', () => {
		it('returns early when the start node is already in checkedNodesIncoming', () => {
			// Pins the line-54 cycle short-circuit. Without that guard the
			// traversal would push the duplicate `nodeName`, walk its
			// children and return them, so testing for an empty result is
			// what kills both the ConditionalExpression and the BlockStatement
			// mutants on that branch.
			const result = getConnectedNodes(linearMainChain, 'A', NodeConnectionTypes.Main, -1, ['A']);

			expect(result).toEqual([]);
		});

		it('treats an empty checkedNodesIncoming the same as omitting it', () => {
			// Empty array is truthy in JS, so the ternary takes the
			// spread-clone branch — this pins that branch's behaviour and
			// keeps an accidental swap (`[]` vs `[...incoming]`) honest.
			expect(getConnectedNodes(linearMainChain, 'A', NodeConnectionTypes.Main, -1, [])).toEqual(
				getConnectedNodes(linearMainChain, 'A'),
			);
		});

		it('honours checkedNodesIncoming on recursion (pre-visited node prunes a branch)', () => {
			//        Root
			//        /  \
			//      Mid1  Mid2
			//        \  /
			//        Leaf
			// Pre-marking Mid1 as visited must drop the Mid1 branch (and the
			// path to Leaf through Mid1), but the Mid2 branch (and its Leaf)
			// must still be reported.
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
					[NodeConnectionTypes.Main]: [
						[{ node: 'Leaf', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				Mid2: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Leaf', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			const result = getConnectedNodes(diamond, 'Root', NodeConnectionTypes.Main, -1, ['Mid1']);

			expect(result).not.toContain('Mid1');
			expect(result).toEqual(expect.arrayContaining(['Mid2', 'Leaf']));
			expect(result).toHaveLength(2);
		});

		it('does not mutate the caller-provided checkedNodesIncoming array', () => {
			// The implementation clones via `[...checkedNodesIncoming]`; a
			// mutation removing the spread would mutate the caller's array.
			const incoming = ['Sentinel'];
			const before = [...incoming];

			getConnectedNodes(linearMainChain, 'A', NodeConnectionTypes.Main, -1, incoming);

			expect(incoming).toEqual(before);
		});
	});

	describe('Stryker sentinel node name', () => {
		// Pins the `[...incoming] : []` empty-array literal on line 52.
		// Stryker mutates the empty array to `["Stryker was here"]`; that
		// mutation is only observable when a node literally bearing that
		// name is in the graph, because the mutant array seeds the cycle
		// tracker with that sentinel and the traversal then skips it.
		it('still traverses a node named exactly "Stryker was here"', () => {
			const graph: IConnections = {
				Root: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Stryker was here', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				'Stryker was here': {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Leaf', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			const result = getConnectedNodes(graph, 'Root');

			expect(result).toEqual(['Leaf', 'Stryker was here']);
		});
	});

	describe('sparse / undefined connection slots', () => {
		// Pins the `connectionsByIndex?.forEach(...)` optional chain on
		// line 62. n8n permits an input/output slot index to be missing
		// (sparse arrays from disconnected ports), so the traversal must
		// tolerate `undefined` entries rather than throw.
		it('tolerates an undefined connection slot at the start of the array', () => {
			const graph: IConnections = {
				Root: {
					[NodeConnectionTypes.Main]: [
						undefined as unknown as Array<{ node: string; type: string; index: number }>,
						[{ node: 'Child', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			expect(() => getConnectedNodes(graph, 'Root')).not.toThrow();
			expect(getConnectedNodes(graph, 'Root')).toEqual(['Child']);
		});

		it('tolerates an undefined slot in the middle of the connections array', () => {
			const graph: IConnections = {
				Root: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'ChildA', type: NodeConnectionTypes.Main, index: 0 }],
						undefined as unknown as Array<{ node: string; type: string; index: number }>,
						[{ node: 'ChildB', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			const result = getConnectedNodes(graph, 'Root');

			expect(result).toEqual(expect.arrayContaining(['ChildA', 'ChildB']));
			expect(result).toHaveLength(2);
		});
	});

	describe('connection type filtering', () => {
		const mixed: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'MainChild', type: NodeConnectionTypes.Main, index: 0 }],
				],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'ToolChild', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
				[NodeConnectionTypes.AiMemory]: [
					[{ node: 'MemoryChild', type: NodeConnectionTypes.AiMemory, index: 0 }],
				],
			},
		};

		it('returns only the requested explicit connection type', () => {
			expect(getConnectedNodes(mixed, 'Root', NodeConnectionTypes.AiTool)).toEqual(['ToolChild']);
		});

		it('returns nothing when the requested type is absent from the node', () => {
			// Locks the `connections[nodeName].hasOwnProperty(type)` guard at
			// line 47 — a flipped guard would either throw on
			// `connections[nodeName][type]` being undefined or skip valid
			// types.
			expect(getConnectedNodes(linearMainChain, 'A', NodeConnectionTypes.AiTool)).toEqual([]);
		});

		it('returns all children for "ALL" across multiple types', () => {
			const result = getConnectedNodes(mixed, 'Root', 'ALL');

			expect(result).toEqual(expect.arrayContaining(['MainChild', 'ToolChild', 'MemoryChild']));
			expect(result).toHaveLength(3);
		});

		it('excludes main connections under "ALL_NON_MAIN"', () => {
			const result = getConnectedNodes(mixed, 'Root', 'ALL_NON_MAIN');

			expect(result).toEqual(expect.arrayContaining(['ToolChild', 'MemoryChild']));
			expect(result).not.toContain('MainChild');
			expect(result).toHaveLength(2);
		});

		it('"ALL_NON_MAIN" returns empty when the node only has main connections', () => {
			// Locks the `filter((type) => type !== 'main')` guard at line 33
			// — a flipped guard would either return Main children or
			// nothing at all.
			expect(getConnectedNodes(linearMainChain, 'A', 'ALL_NON_MAIN')).toEqual([]);
		});
	});

	describe('absent / leaf nodes', () => {
		it('returns an empty array when the node has no outgoing connections', () => {
			// `D` is a leaf in linearMainChain (no entry of its own).
			expect(getConnectedNodes(linearMainChain, 'D')).toEqual([]);
		});

		it('returns an empty array when the node is absent from the connections map', () => {
			expect(getConnectedNodes(linearMainChain, 'Ghost')).toEqual([]);
		});
	});

	describe('ordering and deduplication', () => {
		it('lists a shared descendant exactly once in diamonds', () => {
			//        Root
			//        /  \
			//      Mid1  Mid2
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
					[NodeConnectionTypes.Main]: [
						[{ node: 'Leaf', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				Mid2: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Leaf', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			const result = getConnectedNodes(diamond, 'Root');

			expect(result.filter((n) => n === 'Leaf')).toHaveLength(1);
			expect(result).toHaveLength(3);
			expect(result).toEqual(expect.arrayContaining(['Mid1', 'Mid2', 'Leaf']));
		});

		it('places deeper descendants ahead of nearer ones (terminal node first)', () => {
			// Pins the `unshift` ordering against block-removal /
			// statement-removal mutations: in the linear chain A->B->C->D
			// the leaf D must come first and the direct child B must
			// come last.
			const result = getConnectedNodes(linearMainChain, 'A');

			expect(result[0]).toBe('D');
			expect(result[result.length - 1]).toBe('B');
		});

		it('returns no duplicates across any traversal (uniqueness property)', () => {
			// Property: every entry in the output is unique. This is a
			// global invariant of the dedup loop on lines 78-92 — a
			// mutation that skips removing the prior occurrence would
			// surface duplicates.
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
					[NodeConnectionTypes.Main]: [
						[{ node: 'Leaf', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				Mid2: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Leaf', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			const result = getConnectedNodes(diamond, 'Root');

			expect(new Set(result).size).toBe(result.length);
		});

		it('preserves child order from a single connection slot (first child stays first)', () => {
			// When two children share a parent under the same input slot,
			// `unshift`-ing them in declaration order puts the second
			// declared child ahead of the first in the final array. This
			// pins the iteration order of the inner `forEach`.
			const fanOut: IConnections = {
				Root: {
					[NodeConnectionTypes.Main]: [
						[
							{ node: 'A', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'B', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			};

			const result = getConnectedNodes(fanOut, 'Root');

			// Children pushed via unshift in declaration order →
			// last-declared lands at the front.
			expect(result).toEqual(['B', 'A']);
		});

		it('does not include the start node itself in the result', () => {
			// Invariant: traversal output never lists the seed node, even
			// when a cycle would technically reach it. Pins both
			// cycle-protection guards (lines 54 and 63).
			const cycle: IConnections = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				B: {
					[NodeConnectionTypes.Main]: [[{ node: 'A', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			expect(getConnectedNodes(cycle, 'A')).not.toContain('A');
		});
	});

	describe('cycles and self-loops', () => {
		it('terminates on a two-node cycle', () => {
			const cycle: IConnections = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				B: {
					[NodeConnectionTypes.Main]: [[{ node: 'A', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			expect(getConnectedNodes(cycle, 'A')).toEqual(['B']);
		});

		it('terminates on a self-loop without listing the start node', () => {
			const selfLoop: IConnections = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'A', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			expect(getConnectedNodes(selfLoop, 'A')).toEqual([]);
		});

		it('terminates on a longer cycle (A->B->C->A) and reports each node exactly once', () => {
			const cycle: IConnections = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				B: {
					[NodeConnectionTypes.Main]: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				C: {
					[NodeConnectionTypes.Main]: [[{ node: 'A', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const result = getConnectedNodes(cycle, 'A');

			expect(result).toEqual(expect.arrayContaining(['B', 'C']));
			expect(result).toHaveLength(2);
			expect(result).not.toContain('A');
		});
	});

	describe('immutability', () => {
		it('does not mutate the input connections map', () => {
			const snapshot = JSON.stringify(linearMainChain);

			getConnectedNodes(linearMainChain, 'A');
			getConnectedNodes(linearMainChain, 'A', 'ALL');
			getConnectedNodes(linearMainChain, 'A', 'ALL_NON_MAIN');
			getConnectedNodes(linearMainChain, 'A', NodeConnectionTypes.Main, 1);

			expect(JSON.stringify(linearMainChain)).toBe(snapshot);
		});
	});
});
