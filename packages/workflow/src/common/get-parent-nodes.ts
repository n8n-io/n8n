import { NodeConnectionTypes } from '../interfaces';
import type { IConnections, NodeConnectionType } from '../interfaces';
import { getConnectedNodes } from './get-connected-nodes';

/**
 * Returns all the nodes before the given one
 *
 * @param {NodeConnectionType} [type='main']
 * @param {*} [depth=-1]
 */
export function getParentNodes(
	connectionsByDestinationNode: IConnections,
	nodeName: string,
	type: NodeConnectionType | 'ALL' | 'ALL_NON_MAIN' = NodeConnectionTypes.Main,
	depth = -1,
): string[] {
	return getConnectedNodes(connectionsByDestinationNode, nodeName, type, depth);
}
