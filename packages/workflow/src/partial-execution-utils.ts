import type { IDestinationNode } from '.';

export function getNodeName(destinationNode: IDestinationNode | string): string {
	if (typeof destinationNode === 'string') {
		// Handle legacy format. This will be removed.
		return destinationNode;
	}
	return destinationNode.nodeName;
}

export function toDestinationNodeStruct(
	destinationNode: IDestinationNode | string | undefined,
): IDestinationNode | undefined {
	if (destinationNode === undefined) {
		return undefined;
	}
	if (typeof destinationNode === 'string') {
		// Handle legacy format. This will be removed.
		return {
			nodeName: destinationNode,
			mode: 'inclusive', // This was the default.
		};
	}
	return destinationNode;
}
