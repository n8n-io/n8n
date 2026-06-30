/**
 * Workflow graph traversal benchmarks.
 *
 * `getChildNodes` / `getParentNodes` (via `getConnectedNodes`) run on every
 * execution through `checkReadyForExecution`, and in several other places.
 * On branching graphs the traversal must stay linear in the graph size, so a node
 * reachable through many paths must be expanded once, not once per path.
 */
import { bench, describe } from 'vitest';
import { getChildNodes, getParentNodes, mapConnectionsByDestination } from 'n8n-workflow';
import type { IConnections } from 'n8n-workflow';

const MAIN = 'main';

function link(conn: IConnections, from: string, to: string): void {
	conn[from] = conn[from] ?? { [MAIN]: [[]] };
	conn[from][MAIN][0]!.push({ node: to, type: MAIN, index: 0 });
}

/** A -> B -> C -> ... single path, `length` nodes after the start. */
function linearChain(length: number): IConnections {
	const conn: IConnections = {};
	for (let i = 0; i < length; i++) link(conn, `n${i}`, `n${i + 1}`);
	return conn;
}

/** start -> {aN, bN} -> mN -> {aN+1, bN+1} -> ... : 2^diamonds paths to the last node. */
function diamondChain(diamonds: number): IConnections {
	const conn: IConnections = {};
	let cur = 'start';
	for (let i = 0; i < diamonds; i++) {
		const a = `a${i}`;
		const b = `b${i}`;
		const next = `m${i}`;
		link(conn, cur, a);
		link(conn, cur, b);
		link(conn, a, next);
		link(conn, b, next);
		cur = next;
	}
	return conn;
}

/** A trigger fanning out to `width` parallel branches that each rejoin a sink. */
function wideFanOut(width: number): IConnections {
	const conn: IConnections = {};
	for (let i = 0; i < width; i++) {
		link(conn, 'trigger', `branch${i}`);
		link(conn, `branch${i}`, 'sink');
	}
	return conn;
}

describe('Workflow graph traversal', () => {
	const linear = linearChain(500);
	bench('getChildNodes: linear chain (501 nodes)', () => {
		getChildNodes(linear, 'n0');
	});

	const wide = wideFanOut(184);
	bench('getChildNodes: wide fan-out (184 branches into one sink)', () => {
		getChildNodes(wide, 'trigger');
	});

	// exponential paths, must stay linear.
	const diamonds = diamondChain(14); // 2^14 ≈ 16k paths, 43 nodes
	bench('getChildNodes: diamond chain (14 diamonds, 43 nodes)', () => {
		getChildNodes(diamonds, 'start');
	});

	const diamondsByDestination = mapConnectionsByDestination(diamonds);
	bench('getParentNodes: diamond chain (14 diamonds, 43 nodes)', () => {
		getParentNodes(diamondsByDestination, 'm13');
	});
});
