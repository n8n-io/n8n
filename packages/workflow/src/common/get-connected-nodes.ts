import { NodeConnectionTypes } from '../interfaces';
import type { IConnections, NodeConnectionType } from '../interfaces';

/**
 * Gets all the nodes which are connected nodes starting from
 * the given one
 *
 * @param {NodeConnectionType} [type='main']
 * @param {*} [depth=-1]
 */
export function getConnectedNodes(
	connections: IConnections,
	nodeName: string,
	connectionType: NodeConnectionType | 'ALL' | 'ALL_NON_MAIN' = NodeConnectionTypes.Main,
	depth = -1,
	checkedNodesIncoming?: string[],
): string[] {
	const newDepth = depth === -1 ? depth : depth - 1;
	if (depth === 0) {
		// Reached max depth
		return [];
	}

	if (!connections.hasOwnProperty(nodeName)) {
		// Node does not have incoming connections
		return [];
	}

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

	types.forEach((type) => {
		if (!connections[nodeName].hasOwnProperty(type)) {
			// Node does not have incoming connections of given type
			return;
		}

		const checkedNodes = checkedNodesIncoming ? [...checkedNodesIncoming] : [];

		if (checkedNodes.includes(nodeName)) {
			// Node got checked already before
			return;
		}

		checkedNodes.push(nodeName);

		connections[nodeName][type].forEach((connectionsByIndex) => {
			connectionsByIndex?.forEach((connection) => {
				if (checkedNodes.includes(connection.node)) {
					// Node got checked already before
					return;
				}

				returnNodes.unshift(connection.node);

				addNodes = getConnectedNodes(
					connections,
					connection.node,
					connectionType,
					newDepth,
					checkedNodes,
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

	return returnNodes;
}
