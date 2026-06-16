import { getChildNodes } from '../src/common/get-child-nodes';
import { getConnectedNodes } from '../src/common/get-connected-nodes';
import { getParentNodes } from '../src/common/get-parent-nodes';
import { mapConnectionsByDestination } from '../src/common/map-connections-by-destination';
import type { IConnections } from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';

const Main = NodeConnectionTypes.Main;

/** Build source-indexed main connections from a {from: [to, ...]} description. */
function conns(map: Record<string, string[]>): IConnections {
	const out: IConnections = {};
	for (const [from, tos] of Object.entries(map)) {
		out[from] = { [Main]: [tos.map((node) => ({ node, type: Main, index: 0 }))] };
	}
	return out;
}

/**
 * A chain of diamonds: start -> {aN, bN} -> mN -> {aN+1, bN+1} -> ...
 * Each fan-out/fan-in doubles the number of distinct paths to the next merge
 * node, so the last node is reachable by 2^diamonds paths.
 */
function buildDiamondChain(diamonds: number): IConnections {
	const conn: IConnections = {};
	const link = (from: string, to: string) => {
		conn[from] = conn[from] ?? { [Main]: [[]] };
		conn[from][Main][0]!.push({ node: to, type: Main, index: 0 });
	};
	let cur = 'start';
	for (let i = 0; i < diamonds; i++) {
		const a = `a${i}`;
		const b = `b${i}`;
		const next = `m${i}`;
		link(cur, a);
		link(cur, b);
		link(a, next);
		link(b, next);
		cur = next;
	}
	return conn;
}

/** Reference reachability: main-reachable nodes from `start` within `depth` hops
 * (-1 = unlimited), excluding `start`. Independent of the code under test. */
function reachableWithinDepth(conn: IConnections, start: string, depth: number): Set<string> {
	const seen = new Set<string>();
	let frontier = [start];
	let remaining = depth;
	while (frontier.length && remaining !== 0) {
		const nextFrontier: string[] = [];
		for (const node of frontier) {
			for (const output of conn[node]?.[Main] ?? []) {
				for (const connection of output ?? []) {
					if (connection.node !== start && !seen.has(connection.node)) {
						seen.add(connection.node);
						nextFrontier.push(connection.node);
					}
				}
			}
		}
		frontier = nextFrontier;
		if (remaining > 0) remaining -= 1;
	}
	return seen;
}

describe('getConnectedNodes', () => {
	describe('traversal cost', () => {
		// Counts reads of the connections map: the traversal touches it O(V + E)
		// times. An implementation that re-expands nodes once per path reads it
		// exponentially more often, never near this bound.
		function countReads(conn: IConnections): { proxy: IConnections; reads: () => number } {
			let reads = 0;
			const proxy = new Proxy(conn, {
				get(target, prop, receiver) {
					reads += 1;
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- trap forwards the raw property value
					return Reflect.get(target, prop, receiver);
				},
			});
			return { proxy, reads: () => reads };
		}

		it('should read the connections map a linear number of times on a branching graph', () => {
			const diamonds = 20; // last node reachable by 2^20 ≈ 1e6 paths
			const nodeCount = diamonds * 3;
			const { proxy, reads } = countReads(buildDiamondChain(diamonds));

			const result = getChildNodes(proxy, 'start');

			expect(result).toHaveLength(nodeCount);
			expect(reads()).toBeLessThan(nodeCount * 20);
		});

		it('should complete on a graph with exponentially many paths', () => {
			const diamonds = 30; // 2^30 ≈ 1e9 paths
			const result = getChildNodes(buildDiamondChain(diamonds), 'start');

			expect(result).toHaveLength(diamonds * 3);
			expect(new Set(result).size).toBe(result.length);
		});
	});

	describe('reachable set', () => {
		it('should list each reachable node once across overlapping diamonds', () => {
			const result = getChildNodes(buildDiamondChain(4), 'start');

			expect(new Set(result).size).toBe(result.length);
			expect(result).not.toContain('start');
			expect(new Set(result)).toEqual(
				new Set(['a0', 'b0', 'm0', 'a1', 'b1', 'm1', 'a2', 'b2', 'm2', 'a3', 'b3', 'm3']),
			);
		});

		it('should return all reachable nodes and terminate on a multi-node cycle', () => {
			// A -> B -> C -> A, plus C -> D. Reachable from A: B, C, D; not A.
			const cyclic = conns({ A: ['B'], B: ['C'], C: ['A', 'D'] });

			const result = getConnectedNodes(cyclic, 'A');

			expect(new Set(result)).toEqual(new Set(['B', 'C', 'D']));
			expect(result).not.toContain('A');
		});

		it('should exclude the start node on a self-loop', () => {
			const selfLoop = conns({ A: ['A', 'B'] });

			expect(getChildNodes(selfLoop, 'A')).toEqual(['B']);
		});
	});

	describe('result ordering', () => {
		it('should order a diamond deepest-first with the shared node listed once', () => {
			//   root -> {mid1, mid2} -> leaf
			const diamond = conns({ root: ['mid1', 'mid2'], mid1: ['leaf'], mid2: ['leaf'] });

			expect(getChildNodes(diamond, 'root')).toEqual(['leaf', 'mid2', 'mid1']);
			expect(getParentNodes(mapConnectionsByDestination(diamond), 'leaf')).toEqual([
				'root',
				'mid2',
				'mid1',
			]);
		});

		it('should order a shortcut diamond consistently when a node is both a direct child and a descendant', () => {
			// root -> leaf  AND  root -> mid -> leaf
			const shortcut = conns({ root: ['mid', 'leaf'], mid: ['leaf'] });

			expect(getChildNodes(shortcut, 'root')).toEqual(['leaf', 'mid']);
			expect(getParentNodes(mapConnectionsByDestination(shortcut), 'leaf')).toEqual([
				'root',
				'mid',
			]);
		});
	});

	describe('depth limit', () => {
		// leaf is reachable via a 1-hop and a 3-hop path:
		//   root -> leaf            and  root -> m1 -> m2 -> leaf
		const graph = conns({ root: ['leaf', 'm1'], m1: ['m2'], m2: ['leaf'] });

		it.each([1, 2, 3, 4, -1])('should return the nodes reachable within depth %s', (depth) => {
			const result = getChildNodes(graph, 'root', Main, depth);

			expect(new Set(result)).toEqual(reachableWithinDepth(graph, 'root', depth));
		});

		it('should order results deepest-first across depth boundaries', () => {
			expect(getChildNodes(graph, 'root', Main, 1)).toEqual(['m1', 'leaf']);
			expect(getChildNodes(graph, 'root', Main, 2)).toEqual(['m2', 'm1', 'leaf']);
			expect(getChildNodes(graph, 'root', Main, 3)).toEqual(['leaf', 'm2', 'm1']);
			expect(getChildNodes(graph, 'root')).toEqual(['leaf', 'm2', 'm1']);
		});
	});

	describe('return value', () => {
		it('should not leak mutations of the returned array into later calls', () => {
			const diamond = conns({ root: ['mid1', 'mid2'], mid1: ['leaf'], mid2: ['leaf'] });

			const first = getChildNodes(diamond, 'root');
			first.push('INJECTED');
			first.length = 0;

			expect(getChildNodes(diamond, 'root')).toEqual(['leaf', 'mid2', 'mid1']);
		});
	});
});
