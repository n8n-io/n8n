import type {
	INode,
	INodeType,
	INodeInputConfiguration,
	INodeTypeDescription,
	IConnections,
} from './interfaces';
import { displayParameter, getNodeInputs } from './node-helpers';
import type { Workflow } from './workflow';

export interface NodeValidationIssue {
	credential?: string;
	parameter?: string;
}

export interface NodeCredentialIssue {
	type: 'missing' | 'not-configured';
	displayName: string;
	credentialName: string;
}

/** A `Pick` so both the editor's snapshot accessor and the engine's `Workflow` fit. */
export type WorkflowForInputValidation = Pick<
	Workflow,
	'expression' | 'getNode' | 'getParentNodes'
>;

/**
 * Inputs a node declares as required with nothing enabled connected to them.
 *
 * Inputs can be conditional, so they are resolved against the node's current
 * parameters first. A disabled source counts as absent, matching the runtime
 * ("must be connected and enabled").
 *
 * Shared so the editor warning and the publish check agree; callers format their
 * own message.
 */
export function getUnconnectedRequiredInputs(
	workflow: WorkflowForInputValidation,
	node: INode,
	nodeTypeDescription: INodeTypeDescription,
	options: { throwOnExpressionError?: boolean } = {},
): INodeInputConfiguration[] {
	const unconnected: INodeInputConfiguration[] = [];

	for (const input of getNodeInputs(workflow, node, nodeTypeDescription, options)) {
		if (typeof input === 'string' || input.required !== true) continue;

		const parents = workflow.getParentNodes(node.name, input.type, 1);
		const hasEnabledParent = parents.some((name) => {
			const parent = workflow.getNode(name);
			return parent ? !parent.disabled : false;
		});

		if (!hasEnabledParent) unconnected.push(input);
	}

	return unconnected;
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

		if (!nodeCredential.id && !nodeCredential.__aiGatewayManaged) {
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
