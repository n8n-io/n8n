import type { IConnections } from '../../src/interfaces';
import { NodeConnectionTypes } from '../../src/interfaces';

const Main = NodeConnectionTypes.Main;

/** Build source-indexed main connections from a `{ from: [to, ...] }` adjacency map. */
export function connectionsFromMap(map: Record<string, string[]>): IConnections {
	const out: IConnections = {};
	for (const [from, tos] of Object.entries(map)) {
		out[from] = { [Main]: [tos.map((node) => ({ node, type: Main, index: 0 }))] };
	}
	return out;
}

/** Build source-indexed main connections from `[from, to]` index pairs (nodes named `n<i>`). */
export function connectionsFromEdges(edges: Array<[number, number]>): IConnections {
	const out: IConnections = {};
	for (const [from, to] of edges) {
		const src = `n${from}`;
		out[src] ??= {};
		out[src][Main] ??= [[]];
		out[src][Main][0]!.push({ node: `n${to}`, type: Main, index: 0 });
	}
	return out;
}

/**
 * A chain of diamonds: start -> {aN, bN} -> mN -> {aN+1, bN+1} -> ...
 * Each fan-out/fan-in doubles the number of distinct paths to the next merge
 * node, so the last node is reachable by 2^diamonds paths.
 *
 *  ┌─────┐     ┌────┐
 *  │start├────►│ a0 ├────┐
 *  └──┬──┘     └────┘    │    ┌────┐
 *     │                  ├───►│ m0 ├───► (next diamond: m0 -> {a1, b1} -> m1 -> ...)
 *     │        ┌────┐    │    └────┘
 *     └───────►│ b0 ├────┘
 *              └────┘
 */
export function diamondChain(diamonds: number): IConnections {
	const conn: IConnections = {};
	const link = (from: string, to: string) => {
		conn[from] ??= { [Main]: [[]] };
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

/**
 * Reference oracle: main-reachable nodes from `start` within `depth` hops
 * (-1 = unlimited), excluding `start` itself. Independent of the code under test.
 */
export function reachableWithinDepth(
	conn: IConnections,
	start: string,
	depth: number,
): Set<string> {
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

/** All main-reachable nodes from `start`, excluding `start` itself. */
export function reachableMain(conn: IConnections, start: string): Set<string> {
	return reachableWithinDepth(conn, start, -1);
}
