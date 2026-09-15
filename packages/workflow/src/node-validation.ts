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
	'expression' | 'getNode' | 'connectionsByDestinationNode'
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
	// Required by the type on purpose. A missing map is not an empty graph: it
	// would read every required input as unconnected. Better a loud TypeError
	// here than a silent over-report from an accessor cast past the type.
	const arrivals = workflow.connectionsByDestinationNode[node.name];

	// A node can declare several inputs of one type — an agent's Chat Model and
	// Fallback Model are both `ai_languageModel` — and each is satisfied on its
	// own index. Counting position per type mirrors how the engine resolves them
	// (`validateInputConfiguration` filters by type, then indexes into the
	// type's connections), so one connected model cannot satisfy both.
	const indexByType = new Map<string, number>();

	for (const input of getNodeInputs(workflow, node, nodeTypeDescription, options)) {
		const type = typeof input === 'string' ? input : input.type;
		const inputIndex = indexByType.get(type) ?? 0;
		indexByType.set(type, inputIndex + 1);

		if (typeof input === 'string' || input.required !== true) continue;

		const sources = arrivals?.[type]?.[inputIndex] ?? [];
		const hasEnabledSource = sources.some((source) => {
			const parent = workflow.getNode(source.node);
			return parent ? !parent.disabled : false;
		});

		if (!hasEnabledSource) unconnected.push(input);
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
