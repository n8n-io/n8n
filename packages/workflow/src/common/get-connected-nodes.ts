import { NodeConnectionTypes } from '../interfaces';
import type { IConnections, NodeConnectionType } from '../interfaces';

/**
 * Returns the names of all nodes reachable from `nodeName` by following the
 * given connection type, excluding `nodeName` itself. Each node appears once,
 * ordered deepest-descendant first. Cycles are safe — a node is never listed as
 * its own descendant.
 *
 * @param {NodeConnectionType} [connectionType='main'] a specific type, or 'ALL' / 'ALL_NON_MAIN'
 * @param {number} [depth=-1] how many hops to follow; -1 for unlimited
 */
export function getConnectedNodes(
	connections: IConnections,
	nodeName: string,
	connectionType: NodeConnectionType | 'ALL' | 'ALL_NON_MAIN' = NodeConnectionTypes.Main,
	depth = -1,
): string[] {
	return collectConnectedNodes(
		connections,
		nodeName,
		connectionType,
		depth,
		new Set<string>(),
		new Map<string, string[]>(),
	);
}

function collectConnectedNodes(
	connections: IConnections,
	nodeName: string,
	connectionType: NodeConnectionType | 'ALL' | 'ALL_NON_MAIN',
	depth: number,
	currentPath: Set<string>,
	memo: Map<string, string[]>,
): string[] {
	if (depth === 0) {
		// Reached max depth
		return [];
	}

	if (!connections.hasOwnProperty(nodeName)) {
		// Node has no connections to follow
		return [];
	}

	// The expansion of a node depends only on the node and the remaining depth,
	// so cache by both. With unlimited depth (-1) the key is stable, so every
	// node is expanded exactly once.
	const memoKey = `${depth}:${nodeName}`;
	const cached = memo.get(memoKey);
	if (cached !== undefined) {
		return cached;
	}

	const newDepth = depth === -1 ? depth : depth - 1;

	let types: NodeConnectionType[];
	if (connectionType === 'ALL') {
		types = Object.keys(connections[nodeName]) as NodeConnectionType[];
	} else if (connectionType === 'ALL_NON_MAIN') {
		types = Object.keys(connections[nodeName]).filter(
			(type) => type !== 'main',
		) as NodeConnectionType[];
	} else {
		types = [connectionType];
	}

	let addNodes: string[];
	let nodeIndex: number;
	let i: number;
	let parentNodeName: string;
	const returnNodes: string[] = [];

	currentPath.add(nodeName);

	types.forEach((type) => {
		if (!connections[nodeName].hasOwnProperty(type)) {
			// Node does not have any connections of given type
			return;
		}

		connections[nodeName][type].forEach((connectionsByIndex) => {
			connectionsByIndex?.forEach((connection) => {
				if (currentPath.has(connection.node)) {
					// Node is an ancestor on the current path, so skip it
					return;
				}

				// A node can be both a direct connection and a transitive descendant
				// via another branch (a shortcut diamond). If it was already collected
				// through a sibling branch, move it to the front instead of adding a
				// duplicate — mirroring the dedup done for `addNodes` below.
				const existingIndex = returnNodes.indexOf(connection.node);
				if (existingIndex !== -1) {
					returnNodes.splice(existingIndex, 1);
				}
				returnNodes.unshift(connection.node);

				addNodes = collectConnectedNodes(
					connections,
					connection.node,
					connectionType,
					newDepth,
					currentPath,
					memo,
				);

				for (i = addNodes.length; i--; i > 0) {
					// Because nodes can have multiple parents it is possible that
					// parts of the tree is parent of both and to not add nodes
					// twice check first if they already got added before.
					parentNodeName = addNodes[i];
					nodeIndex = returnNodes.indexOf(parentNodeName);

					if (nodeIndex !== -1) {
						// Node got found before so remove it from current location
						// that node-order stays correct
						returnNodes.splice(nodeIndex, 1);
					}

					returnNodes.unshift(parentNodeName);
				}
			});
		});
	});

	currentPath.delete(nodeName);
	memo.set(memoKey, returnNodes);

	return returnNodes;
}
