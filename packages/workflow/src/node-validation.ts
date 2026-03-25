import type { INode, INodeType, IConnections } from './interfaces';
import { displayParameter } from './node-helpers';

export interface NodeValidationIssue {
	credential?: string;
	parameter?: string;
}

export interface NodeCredentialIssue {
	type: 'missing' | 'not-configured';
	displayName: string;
	credentialName: string;
}

/**
 * Validates that all required credentials are set for a node.
 * Respects displayOptions to only validate credentials that should be shown.
 */
export function validateNodeCredentials(node: INode, nodeType: INodeType): NodeCredentialIssue[] {
	const issues: NodeCredentialIssue[] = [];
	const credentialDescriptions = nodeType.description?.credentials || [];

	for (const credDesc of credentialDescriptions) {
		if (!credDesc.required) continue;

		// Check if this credential should be displayed based on displayOptions
		const shouldDisplay = displayParameter(node.parameters, credDesc, node, nodeType.description);

		if (!shouldDisplay) continue;

		const credentialName = credDesc.name;
		const nodeCredential = node.credentials?.[credentialName];
		const displayName = credDesc.displayName ?? credentialName;

		if (!nodeCredential) {
			issues.push({
				type: 'missing',
				displayName,
				credentialName,
			});
			continue;
		}

		if (!nodeCredential.id) {
			issues.push({
				type: 'not-configured',
				displayName,
				credentialName,
			});
		}
	}

	return issues;
}

/**
 * Checks if a node has any incoming or outgoing connections.
 */
export function isNodeConnected(
	nodeName: string,
	connections: IConnections,
	connectionsByDestination: IConnections,
): boolean {
	// Check outgoing connections
	if (connections[nodeName] && Object.keys(connections[nodeName]).length > 0) {
		return true;
	}

	// Check incoming connections
	if (
		connectionsByDestination[nodeName] &&
		Object.keys(connectionsByDestination[nodeName]).length > 0
	) {
		return true;
	}

	return false;
}

/**
 * Checks if a node type is a trigger-like node (trigger, webhook, or poll).
 * These nodes are workflow entry points and should always be validated.
 */
export function isTriggerLikeNode(nodeType: INodeType): boolean {
	return (
		nodeType.trigger !== undefined || nodeType.webhook !== undefined || nodeType.poll !== undefined
	);
}
