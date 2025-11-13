import type { IDestinationNode } from '.';

export function getNodeName(destinationNode: IDestinationNode): string {
	return destinationNode.nodeName;
}

export function toDestinationNodeStruct(
	destinationNode: IDestinationNode | string | undefined,
): IDestinationNode | undefined {
	if (destinationNode === undefined) {
		return undefined;
	}
	if (typeof destinationNode === 'string') {
		// Handle legacy format from API
		return {
			nodeName: destinationNode,
			mode: 'inclusive',
		};
	}
	return destinationNode;
}
