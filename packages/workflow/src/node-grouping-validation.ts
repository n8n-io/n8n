import { STICKY_NODE_TYPE } from './constants';
import {
	buildAdjacencyList,
	parseExtractableSubgraphSelection,
	type ExtractableErrorResult,
	type ExtractableSubgraphData,
	type IConnectionAdjacencyList,
} from './graph/graph-utils';
import {
	NodeConnectionTypes,
	type IConnections,
	type INode,
	type INodeInputConfiguration,
	type INodeOutputConfiguration,
	type INodeTypeDescription,
	type IWorkflowGroup,
	type NodeConnectionType,
} from './interfaces';
import { isTriggerNode } from './node-helpers';

type NodeIo = NodeConnectionType | INodeInputConfiguration | INodeOutputConfiguration;
type IODirection = 'inputs' | 'outputs';

/** Character cap on a node group description; keeps it within 3 lines in the collapsed panel. */
export const GROUP_DESCRIPTION_MAX_LENGTH = 145;

/**
 * Drops non-string values, caps to the max length, and treats empty as "no description".
 */
export function normalizeGroupDescription(description: unknown): string | undefined {
	if (typeof description !== 'string') return undefined;
	const capped = description.slice(0, GROUP_DESCRIPTION_MAX_LENGTH);
	return capped.length > 0 ? capped : undefined;
}

export type NodeGroupingValidationInput<TNode extends INode = INode> = {
	nodes: TNode[];
	connectionsBySourceNode: IConnections;
	getNodeType: (node: TNode) => INodeTypeDescription | null | undefined;
	existingNodeGroups?: IWorkflowGroup[];
	getNodeInputs?: (
		node: TNode,
		nodeType: INodeTypeDescription,
	) => Array<NodeConnectionType | INodeInputConfiguration>;
	getNodeOutputs?: (
		node: TNode,
		nodeType: INodeTypeDescription,
	) => Array<NodeConnectionType | INodeOutputConfiguration>;
};

export type NodeSelectionValidationResult<TNode extends INode = INode> =
	| { valid: true; subGraph: TNode[]; subGraphData: ExtractableSubgraphData }
	| { valid: false; reason: 'trigger-selected'; triggers: string[] }
	| { valid: false; reason: 'invalid-subgraph'; errors: ExtractableErrorResult[] }
	| { valid: false; reason: 'multiple-input-branches'; node: string }
	| { valid: false; reason: 'multiple-output-branches'; node: string };

export type NodeGroupValidationResult<TNode extends INode = INode> =
	| NodeSelectionValidationResult<TNode>
	| { valid: false; reason: 'node-already-grouped'; nodeIds: string[] }
	| {
			valid: false;
			reason: 'non-main-boundary';
			connection: { source: string; target: string; type: string };
	  };

export function validateNodeSelectionForExtraction<TNode extends INode>(
	input: NodeGroupingValidationInput<TNode>,
): NodeSelectionValidationResult<TNode> {
	const subgraphResult = validateNodeSelectionSubgraph(input);
	if (!subgraphResult.valid) return subgraphResult;

	const { nodes, getNodeType, getNodeInputs, getNodeOutputs } = input;
	const { start, end } = subgraphResult.subGraphData;
	const nodesByName = new Map(nodes.map((node) => [node.name, node]));

	if (
		start &&
		!hasSingleMainIO(start, 'inputs', nodesByName, getNodeType, getNodeInputs, getNodeOutputs)
	) {
		return { valid: false, reason: 'multiple-input-branches', node: start };
	}

	if (
		end &&
		!hasSingleMainIO(end, 'outputs', nodesByName, getNodeType, getNodeInputs, getNodeOutputs)
	) {
		return { valid: false, reason: 'multiple-output-branches', node: end };
	}

	return subgraphResult;
}

export function validateNodeSelectionForGrouping<TNode extends INode>(
	input: NodeGroupingValidationInput<TNode>,
): NodeGroupValidationResult<TNode> {
	const alreadyGroupedNodeIds = findAlreadyGroupedNodeIds(
		input.nodes.map((node) => node.id),
		input.existingNodeGroups ?? [],
	);
	if (alreadyGroupedNodeIds.length > 0) {
		return { valid: false, reason: 'node-already-grouped', nodeIds: alreadyGroupedNodeIds };
	}

	// Sticky notes have no connections, so the subgraph/connectivity rules
	// below are checked against connectable nodes only — stickies ride along
	// as plain members. A sticky-only group is valid *data* (a group can
	// degenerate to one when its last connectable node is deleted); stricter
	// rules live with the callers: creation surfaces require at least one
	// connectable node (see `resolveGroupableNodeIds` in the editor) and
	// persistence rejects memberless groups (see `validateWorkflowNodeGroups`
	// in the CLI), which also keeps empty selections out of this fast path.
	const connectableNodes = input.nodes.filter((node) => node.type !== STICKY_NODE_TYPE);
	if (connectableNodes.length === 0) {
		return {
			valid: true,
			subGraph: input.nodes,
			subGraphData: { start: undefined, end: undefined },
		};
	}

	const subgraphResult = validateNodeSelectionSubgraph({ ...input, nodes: connectableNodes });
	if (!subgraphResult.valid) return subgraphResult;

	const nodeNames = new Set(subgraphResult.subGraph.map((node) => node.name));
	const boundaryConnection = findNonMainBoundaryConnection(
		nodeNames,
		input.connectionsBySourceNode,
	);

	if (boundaryConnection) {
		return { valid: false, reason: 'non-main-boundary', connection: boundaryConnection };
	}

	// Report the full selection (stickies included) as the resulting subgraph.
	return { ...subgraphResult, subGraph: input.nodes };
}

export type WorkflowGroupViolationCode =
	| 'duplicate-group-id'
	| 'duplicate-group-name'
	| 'empty-group'
	| 'unknown-node-id'
	| 'node-in-multiple-groups'
	| Extract<NodeGroupValidationResult, { valid: false }>['reason'];

export type WorkflowGroupViolation = {
	groupId: string;
	groupName: string;
	code: WorkflowGroupViolationCode;
	/** Actionable, user-facing description; identical to the save-path rejection message. */
	message: string;
};

export type WorkflowGroupsValidationInput<TNode extends INode = INode> = {
	nodes: TNode[];
	connectionsBySourceNode?: IConnections;
	nodeGroups?: IWorkflowGroup[];
	/**
	 * Resolves a node to its type description (used to detect trigger nodes), or
	 * `undefined`/`null` for unknown node types so validation degrades gracefully.
	 * Pass `null` to run basic checks only.
	 */
	getNodeType: ((node: TNode) => INodeTypeDescription | null | undefined) | null;
};

export type WorkflowGroupsValidationResult =
	| { valid: true }
	| { valid: false; violations: [WorkflowGroupViolation, ...WorkflowGroupViolation[]] };

/**
 * Validates a workflow's `nodeGroups` without throwing, collecting all violations.
 * Single source of truth for group rules: persistence (CLI save path) rejects with
 * the first violation's message, and validate-time surfaces (e.g. the MCP
 * `validate_workflow` tool) report all of them as errors.
 *
 * Basic checks (always run): unique group IDs, unique group names, at least one
 * member, all referenced node IDs exist, and each node belongs to at most one group.
 *
 * Full checks (run only when `getNodeType` is non-null, and skipped for groups that
 * already have a basic violation): each group must satisfy the same grouping rules
 * the canvas enforces — no triggers, a single connected subgraph, and no non-main
 * connection crossing the group boundary — validated against the other groups as
 * existing groups. Pass the `getNodeType` callback to run the full checks (on
 * create, and on an update that changed the graph or the groups); pass `null` to
 * run basic checks only (e.g. a git import, so legacy-invalid groups don't block
 * the import).
 *
 * Violations are collected in the same order the save path checks them, so
 * `violations[0]` is always the error a save would reject with.
 *
 * Note: must be called after node IDs are assigned (see `addNodeIds` in the CLI),
 * since nodes created via the API may not have IDs until that step assigns them.
 */
export function validateWorkflowGroups<TNode extends INode>({
	nodes,
	connectionsBySourceNode,
	nodeGroups,
	getNodeType,
}: WorkflowGroupsValidationInput<TNode>): WorkflowGroupsValidationResult {
	if (!nodeGroups || nodeGroups.length === 0) return { valid: true };

	const violations: WorkflowGroupViolation[] = [];
	// Tracked by object identity: duplicate IDs/names make `group.id` ambiguous.
	const groupsWithBasicViolations = new Set<IWorkflowGroup>();
	const addViolation = (
		group: IWorkflowGroup,
		code: WorkflowGroupViolationCode,
		message: string,
	) => {
		violations.push({ groupId: group.id, groupName: group.name, code, message });
	};

	const nodeById = new Map(nodes.filter((node) => Boolean(node.id)).map((node) => [node.id, node]));
	// Node names are how users and agents identify nodes, so messages use them;
	// the id is only a fallback for members without a resolvable name.
	const nodeLabel = (nodeId: string) => nodeById.get(nodeId)?.name || nodeId;
	const seenGroupIds = new Set<string>();
	const seenGroupNames = new Set<string>();
	const nodeToGroup = new Map<string, string>();

	for (const group of nodeGroups) {
		const addBasicViolation = (code: WorkflowGroupViolationCode, message: string) => {
			addViolation(group, code, message);
			groupsWithBasicViolations.add(group);
		};

		// Unique group IDs
		if (seenGroupIds.has(group.id)) {
			addBasicViolation('duplicate-group-id', `Duplicate node group ID "${group.id}".`);
		}
		seenGroupIds.add(group.id);

		// Unique group names
		if (seenGroupNames.has(group.name)) {
			addBasicViolation('duplicate-group-name', `Duplicate node group name "${group.name}".`);
		}
		seenGroupNames.add(group.name);

		if (group.nodeIds.length === 0) {
			addBasicViolation('empty-group', `Group "${group.name}" has no members.`);
		}

		for (const nodeId of group.nodeIds) {
			// All referenced nodes must exist
			if (!nodeById.has(nodeId)) {
				addBasicViolation(
					'unknown-node-id',
					`Group "${group.name}" references node ID "${nodeId}" that does not exist in the workflow.`,
				);
				continue;
			}
			// A node can only belong to one group
			const existingGroup = nodeToGroup.get(nodeId);
			if (existingGroup) {
				addBasicViolation(
					'node-in-multiple-groups',
					`Node "${nodeLabel(nodeId)}" belongs to multiple groups: "${existingGroup}" and "${group.name}".`,
				);
			} else {
				nodeToGroup.set(nodeId, group.name);
			}
		}
	}

	if (getNodeType) {
		const connections = connectionsBySourceNode ?? {};

		for (const group of nodeGroups) {
			// A basic violation makes the group's member set unreliable, so the
			// graph rules would only produce misleading follow-up violations.
			if (groupsWithBasicViolations.has(group)) continue;

			const groupNodes = group.nodeIds.flatMap((id) => nodeById.get(id) ?? []);
			const result = validateNodeSelectionForGrouping({
				nodes: groupNodes,
				connectionsBySourceNode: connections,
				getNodeType,
				existingNodeGroups: nodeGroups.filter((other) => other.id !== group.id),
			});
			if (!result.valid) {
				addViolation(group, result.reason, groupRuleViolationMessage(group, result, nodeLabel));
			}
		}
	}

	const [firstViolation, ...restViolations] = violations;
	if (!firstViolation) return { valid: true };
	return { valid: false, violations: [firstViolation, ...restViolations] };
}

/**
 * Maps a failed `validateNodeSelectionForGrouping` result to an actionable message
 * that names the offending group and the rule it broke. These strings are the
 * public save-rejection messages — change them only deliberately.
 */
function groupRuleViolationMessage(
	group: IWorkflowGroup,
	result: Extract<NodeGroupValidationResult, { valid: false }>,
	nodeLabel: (nodeId: string) => string,
): string {
	const label = `Node group "${group.name}" (${group.id})`;
	switch (result.reason) {
		case 'trigger-selected':
			return `${label} cannot contain trigger nodes: ${result.triggers.join(', ')}.`;
		case 'invalid-subgraph':
			return `${label} must form a single connected subgraph with a single entry and exit.`;
		case 'multiple-input-branches':
			return `${label} has multiple input branches at node "${result.node}".`;
		case 'multiple-output-branches':
			return `${label} has multiple output branches at node "${result.node}".`;
		case 'node-already-grouped':
			return `${label} contains nodes that already belong to another group: ${result.nodeIds.map(nodeLabel).join(', ')}.`;
		case 'non-main-boundary':
			return `${label} cannot cross the "${result.connection.type}" connection between "${result.connection.source}" and "${result.connection.target}".`;
	}
}

function validateNodeSelectionSubgraph<TNode extends INode>({
	nodes,
	connectionsBySourceNode,
	getNodeType,
}: NodeGroupingValidationInput<TNode>): NodeSelectionValidationResult<TNode> {
	const triggers = nodes.filter((node) => {
		const nodeType = getNodeType(node);
		return nodeType ? isTriggerNode(nodeType) : false;
	});
	if (triggers.length > 0) {
		return {
			valid: false,
			reason: 'trigger-selected',
			triggers: triggers.map((node) => node.name),
		};
	}

	const adjacencyList = buildAdjacencyList(connectionsBySourceNode);
	const selectedNodeNames = new Set(nodes.map((node) => node.name));
	const selection = parseExtractableSubgraphSelection(selectedNodeNames, adjacencyList);

	if (Array.isArray(selection)) {
		return { valid: false, reason: 'invalid-subgraph', errors: selection };
	}

	const disconnectedSelectionError = findDisconnectedSelectionError(
		selectedNodeNames,
		adjacencyList,
	);
	if (disconnectedSelectionError) {
		return { valid: false, reason: 'invalid-subgraph', errors: [disconnectedSelectionError] };
	}

	return { valid: true, subGraph: nodes, subGraphData: selection };
}

function findAlreadyGroupedNodeIds(
	selectionNodeIds: string[],
	existingNodeGroups: IWorkflowGroup[],
): string[] {
	const groupedNodeIds = new Set(existingNodeGroups.flatMap((group) => group.nodeIds));
	return selectionNodeIds.filter((nodeId) => groupedNodeIds.has(nodeId));
}

function hasSingleMainIO<TNode extends INode>(
	nodeName: string,
	direction: IODirection,
	nodesByName: Map<string, TNode>,
	getNodeType: (node: TNode) => INodeTypeDescription | null | undefined,
	getNodeInputs?: (
		node: TNode,
		nodeType: INodeTypeDescription,
	) => Array<NodeConnectionType | INodeInputConfiguration>,
	getNodeOutputs?: (
		node: TNode,
		nodeType: INodeTypeDescription,
	) => Array<NodeConnectionType | INodeOutputConfiguration>,
): boolean {
	const node = nodesByName.get(nodeName);
	if (!node) return true;
	const nodeType = getNodeType(node);
	if (!nodeType) return true;

	const ios =
		direction === 'inputs'
			? (getNodeInputs?.(node, nodeType) ?? nodeType.inputs)
			: (getNodeOutputs?.(node, nodeType) ?? nodeType.outputs);
	if (!Array.isArray(ios)) return true;
	return ios.filter(isMainIo).length <= 1;
}

function isMainIo(io: NodeIo): boolean {
	return typeof io === 'string'
		? io === NodeConnectionTypes.Main
		: io.type === NodeConnectionTypes.Main;
}

function findDisconnectedSelectionError(
	nodeNames: Set<string>,
	currentAdjacencyList: IConnectionAdjacencyList,
): ExtractableErrorResult | null {
	if (nodeNames.size <= 1) return null;

	const neighborsByNodeName = new Map<string, Set<string>>();
	for (const nodeName of nodeNames) {
		neighborsByNodeName.set(nodeName, new Set());
	}

	for (const [sourceNodeName, connections] of currentAdjacencyList.entries()) {
		if (!nodeNames.has(sourceNodeName)) continue;

		const sourceNeighbors = neighborsByNodeName.get(sourceNodeName);
		if (!sourceNeighbors) continue;

		for (const connection of connections) {
			const targetNodeName = connection.node;
			if (!nodeNames.has(targetNodeName) || targetNodeName === sourceNodeName) continue;

			sourceNeighbors.add(targetNodeName);
			neighborsByNodeName.get(targetNodeName)?.add(sourceNodeName);
		}
	}

	const firstNodeName = nodeNames.values().next().value;
	if (!firstNodeName) return null;

	const visited = new Set<string>([firstNodeName]);
	const queue = [firstNodeName];
	while (queue.length > 0) {
		const currentNodeName = queue.shift();
		if (!currentNodeName) continue;

		for (const neighborNodeName of neighborsByNodeName.get(currentNodeName) ?? []) {
			if (visited.has(neighborNodeName)) continue;

			visited.add(neighborNodeName);
			queue.push(neighborNodeName);
		}
	}

	if (visited.size === nodeNames.size) return null;

	const disconnectedNodeName = Array.from(nodeNames).find((nodeName) => !visited.has(nodeName));
	if (!disconnectedNodeName) return null;

	return {
		errorCode: 'No Continuous Path From Root To Leaf In Selection',
		start: firstNodeName,
		end: disconnectedNodeName,
	};
}

function findNonMainBoundaryConnection(
	nodeNames: Set<string>,
	connectionsBySourceNode: IConnections,
): { source: string; target: string; type: string } | null {
	for (const [sourceNodeName, sourceConnections] of Object.entries(connectionsBySourceNode)) {
		const sourceInside = nodeNames.has(sourceNodeName);

		for (const [type, connectionsByOutputIndex] of Object.entries(sourceConnections)) {
			if (type === NodeConnectionTypes.Main) continue;

			for (const connections of connectionsByOutputIndex) {
				for (const connection of connections ?? []) {
					if (sourceInside === nodeNames.has(connection.node)) continue;

					return { source: sourceNodeName, target: connection.node, type };
				}
			}
		}
	}

	return null;
}
