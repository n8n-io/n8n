import type { INode, INodes, INodeType } from './interfaces';

export interface INodeTypesGetter {
	getByNameAndVersion(nodeType: string, version?: number): INodeType | undefined;
}

/**
 * Validates that a workflow has at least one trigger-like node (trigger, webhook, or polling node).
 * A workflow can only be activated if it has a node that can start the workflow execution.
 *
 * @param nodes - The workflow nodes to validate
 * @param nodeTypes - Node types getter to retrieve node definitions
 * @param ignoreNodeTypes - Optional array of node types to ignore (e.g., manual trigger, start node)
 * @returns Object with isValid flag and error message if invalid
 */
export function validateWorkflowHasTriggerLikeNode(
	nodes: INodes,
	nodeTypes: INodeTypesGetter,
	ignoreNodeTypes?: string[],
): { isValid: boolean; error?: string } {
	let node: INode;
	let nodeType: INodeType | undefined;

	for (const nodeName of Object.keys(nodes)) {
		node = nodes[nodeName];

		// Skip disabled nodes - they cannot trigger a run
		if (node.disabled === true) {
			continue;
		}

		// Skip ignored node types (e.g., manual trigger, start node)
		if (ignoreNodeTypes?.includes(node.type)) {
			continue;
		}

		nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		if (nodeType === undefined) {
			// Type is not known, skip validation
			continue;
		}

		if (
			nodeType.poll !== undefined ||
			nodeType.trigger !== undefined ||
			nodeType.webhook !== undefined
		) {
			// Is a trigger node. So workflow can be activated.
			return { isValid: true };
		}
	}

	return {
		isValid: false,
		error:
			'Workflow cannot be activated because it has no trigger node. At least one trigger, webhook, or polling node is required.',
	};
}
