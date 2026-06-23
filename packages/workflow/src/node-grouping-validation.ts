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

	const extractableResult = validateNodeSelectionSubgraph(input);
	if (!extractableResult.valid) return extractableResult;

	const nodeNames = new Set(extractableResult.subGraph.map((node) => node.name));
	const boundaryConnection = findNonMainBoundaryConnection(
		nodeNames,
		input.connectionsBySourceNode,
	);

	if (boundaryConnection) {
		return { valid: false, reason: 'non-main-boundary', connection: boundaryConnection };
	}

	return extractableResult;
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
