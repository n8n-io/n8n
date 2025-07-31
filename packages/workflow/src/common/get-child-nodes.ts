import { NodeConnectionTypes } from '../interfaces';
import type { IConnections, NodeConnectionType } from '../interfaces';
import { getConnectedNodes } from './get-connected-nodes';

export function getChildNodes(
	connectionsBySourceNode: IConnections,
	nodeName: string,
	type: NodeConnectionType | 'ALL' | 'ALL_NON_MAIN' = NodeConnectionTypes.Main,
	depth = -1,
): string[] {
	return getConnectedNodes(connectionsBySourceNode, nodeName, type, depth);
}
