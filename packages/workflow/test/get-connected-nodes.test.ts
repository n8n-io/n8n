// NOTE: Diagrams in this file have been created with https://asciiflow.com/#/
// If you update the tests, please update the diagrams as well.
// If you add a test, please create a new diagram.
// ────► denotes a `main` connection from source to destination.

import { connectionsFromMap, diamondChain, reachableWithinDepth } from './graph/graph-fixtures';
import { getChildNodes } from '../src/common/get-child-nodes';
import { getConnectedNodes } from '../src/common/get-connected-nodes';
import { getParentNodes } from '../src/common/get-parent-nodes';
import { mapConnectionsByDestination } from '../src/common/map-connections-by-destination';
import type { IConnections } from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';

const Main = NodeConnectionTypes.Main;

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
			const { proxy, reads } = countReads(diamondChain(diamonds));

			const result = getChildNodes(proxy, 'start');

			expect(result).toHaveLength(nodeCount);
			expect(reads()).toBeLessThan(nodeCount * 20);
		});

		it('should complete on a graph with exponentially many paths', () => {
			const diamonds = 30; // 2^30 ≈ 1e9 paths
			const result = getChildNodes(diamondChain(diamonds), 'start');

			expect(result).toHaveLength(diamonds * 3);
			expect(new Set(result).size).toBe(result.length);
		});
	});

	describe('cycles', () => {
		it('should return all reachable nodes and terminate on a multi-node cycle', () => {
			// C -> A closes a cycle; C -> D leaves it. Reachable from A: B, C, D; not A.
			//
			//  ┌───┐     ┌───┐     ┌───┐     ┌───┐
			//  │ A ├────►│ B ├────►│ C ├────►│ D │
			//  └─▲─┘     └───┘     └─┬─┘     └───┘
			//    │                   │
			//    └───────────────────┘
			const cyclic = connectionsFromMap({ A: ['B'], B: ['C'], C: ['A', 'D'] });

			const result = getConnectedNodes(cyclic, 'A');

			expect(new Set(result)).toEqual(new Set(['B', 'C', 'D']));
			expect(result).not.toContain('A');
		});

		it('should exclude the start node on a self-loop', () => {
			//   ┌──┐
			//   │  ▼
			//  ┌┴───┐     ┌───┐
			//  │ A  ├────►│ B │
			//  └────┘     └───┘
			const selfLoop = connectionsFromMap({ A: ['A', 'B'] });

			expect(getChildNodes(selfLoop, 'A')).toEqual(['B']);
		});
	});

	describe('result ordering', () => {
		it('should order a diamond deepest-first with the shared node listed once', () => {
			//  ┌────┐     ┌──────┐
			//  │root├────►│ mid1 ├────┐
			//  └──┬─┘     └──────┘    │   ┌──────┐
			//     │                   ├──►│ leaf │
			//     │       ┌──────┐    │   └──────┘
			//     └──────►│ mid2 ├────┘
			//             └──────┘
			const diamond = connectionsFromMap({
				root: ['mid1', 'mid2'],
				mid1: ['leaf'],
				mid2: ['leaf'],
			});

			expect(getChildNodes(diamond, 'root')).toEqual(['leaf', 'mid2', 'mid1']);
			expect(getParentNodes(mapConnectionsByDestination(diamond), 'leaf')).toEqual([
				'root',
				'mid2',
				'mid1',
			]);
		});

		it('should order a shortcut diamond consistently when a node is both a direct child and a descendant', () => {
			// `leaf` is both a direct child of `root` and a descendant via `mid`.
			//
			//  ┌────┐     ┌─────┐     ┌──────┐
			//  │root├────►│ mid ├────►│ leaf │
			//  └──┬─┘     └─────┘     └───▲──┘
			//     │                       │
			//     └───────────────────────┘
			const shortcut = connectionsFromMap({ root: ['mid', 'leaf'], mid: ['leaf'] });

			expect(getChildNodes(shortcut, 'root')).toEqual(['leaf', 'mid']);
			expect(getParentNodes(mapConnectionsByDestination(shortcut), 'leaf')).toEqual([
				'root',
				'mid',
			]);
		});

		it('should keep ordering correct when an internal node is shared across sibling branches', () => {
			//  ┌────┐     ┌───┐
			//  │root├────►│ x ├────┐
			//  └──┬─┘     └───┘    │   ┌────────┐     ┌──────┐
			//     │                ├──►│ shared ├────►│ leaf │
			//     │       ┌───┐    │   └────────┘     └──────┘
			//     └──────►│ y ├────┘
			//             └───┘
			// `shared` has a child, so it enters the traversal's path tracking during
			// expansion. If a node were left in that tracking after being expanded,
			// sibling `y` would skip `shared` as a phantom ancestor and reorder the result.
			const graph = connectionsFromMap({
				root: ['x', 'y'],
				x: ['shared'],
				y: ['shared'],
				shared: ['leaf'],
			});

			expect(getChildNodes(graph, 'root')).toEqual(['leaf', 'shared', 'y', 'x']);
		});
	});

	describe('depth limit', () => {
		// leaf is reachable via a 1-hop and a 3-hop path:
		//
		//  ┌────┐     ┌────┐     ┌────┐
		//  │root├────►│ m1 ├────►│ m2 │
		//  └──┬─┘     └────┘     └─┬──┘
		//     │                    │
		//     │       ┌──────┐     │
		//     └──────►│ leaf │◄────┘
		//             └──────┘
		const graph = connectionsFromMap({ root: ['leaf', 'm1'], m1: ['m2'], m2: ['leaf'] });

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
		// The traversal memoizes node expansions internally and the returned array
		// is a memo entry. The memo is per-call, so mutating one call's result must
		// never affect a later call. Guards against a future regression that caches
		// the memo across calls and hands back the raw cached array by reference.
		it('should not leak mutations of the returned array into later calls', () => {
			const diamond = connectionsFromMap({
				root: ['mid1', 'mid2'],
				mid1: ['leaf'],
				mid2: ['leaf'],
			});

			const first = getChildNodes(diamond, 'root');
			first.push('INJECTED');
			first.length = 0;

			expect(getChildNodes(diamond, 'root')).toEqual(['leaf', 'mid2', 'mid1']);
		});
	});
});
