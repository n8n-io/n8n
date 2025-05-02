type MultipleInputNodesError = {
	errorCode: 'Multiple Input Nodes';
	nodes: Set<string>;
};

type MultipleOutputNodesError = {
	errorCode: 'Multiple Output Nodes';
	nodes: Set<string>;
};

type InputEdgeToNonRootNode = {
	errorCode: 'Input Edge To Non-Root Node';
	node: string;
};

type OutputEdgeFromNonLeafNode = {
	errorCode: 'Output Edge From Non-Leaf Node';
	node: string;
};

type NoContinuousPathFromRootToLeaf = {
	errorCode: 'No Continuous Path From Root To Leaf In Selection';
	start: string;
	end: string;
};

export type ExtractableErrorResult =
	| MultipleInputNodesError
	| MultipleOutputNodesError
	| InputEdgeToNonRootNode
	| OutputEdgeFromNonLeafNode
	| NoContinuousPathFromRootToLeaf;

type AdjacencyList = Map<string, Set<string>>;

/**
 * Find all edges leading into the graph described in `graphIds`.
 */
export function getInputEdges(
	graphIds: Set<string>,
	adjacencyList: AdjacencyList,
): Array<[string, string]> {
	const result: Array<[string, string]> = [];
	for (const [from, tos] of adjacencyList.entries()) {
		if (graphIds.has(from)) continue;

		for (const to of tos) {
			if (graphIds.has(to)) {
				result.push([from, to]);
			}
		}
	}

	return result;
}

/**
 * Find all edges leading out of the graph described in `graphIds`.
 */
export function getOutputEdges(
	graphIds: Set<string>,
	adjacencyList: AdjacencyList,
): Array<[string, string]> {
	const result: Array<[string, string]> = [];
	for (const [from, tos] of adjacencyList.entries()) {
		if (!graphIds.has(from)) continue;

		for (const to of tos) {
			if (!graphIds.has(to)) {
				result.push([from, to]);
			}
		}
	}

	return result;
}

function intersection<T>(a: Set<T>, b: Set<T>): Set<T> {
	const result = new Set<T>();
	for (const x of a) {
		if (b.has(x)) result.add(x);
	}
	return result;
}

function union<T>(a: Set<T>, b: Set<T>): Set<T> {
	const result = new Set<T>();
	for (const x of a) result.add(x);
	for (const x of b) result.add(x);
	return result;
}

function difference<T>(minuend: Set<T>, subtrahend: Set<T>): Set<T> {
	const result = new Set<T>(minuend.values());
	for (const x of subtrahend) {
		result.delete(x);
	}
	return result;
}

export function getRootNodes(graphIds: Set<string>, adjacencyList: AdjacencyList): Set<string> {
	// Inner nodes are all nodes with an incoming edge from another node in the graph
	let innerNodes = new Set<string>();
	for (const nodeId of graphIds) {
		innerNodes = union(innerNodes, adjacencyList.get(nodeId) ?? new Set());
	}

	return difference(graphIds, innerNodes);
}

export function getLeafNodes(graphIds: Set<string>, adjacencyList: AdjacencyList): Set<string> {
	const result = new Set<string>();
	for (const nodeId of graphIds) {
		if (intersection(adjacencyList.get(nodeId) ?? new Set(), graphIds).size === 0) {
			result.add(nodeId);
		}
	}
	return result;
}

export function hasPath(start: string, end: string, adjacencyList: AdjacencyList) {
	const seen = new Set<string>();
	const paths: string[] = [start];
	while (true) {
		const next = paths.pop();
		if (next === end) return true;
		if (next === undefined) return false;
		seen.add(next);

		paths.push(...difference(adjacencyList.get(next) ?? new Set<string>(), seen));
	}
}

export type ExtractableSubgraphData = {
	start?: string;
	end?: string;
};

/**
 * A subgraph is considered extractable if the following properties hold:
 * - 0-1 input nodes from outside the subgraph, to a root node
 * - 0-1 output nodes to outside the subgraph, from a leaf node
 * - continuous path between input and output nodes if they exist
 *
 * This also covers the requirement that all "inner" nodes between the root node
 * and the output node are selected, since this would otherwise create extra
 * input or output nodes.
 *
 * @returns An object containing optional start and end nodeIds
 *            indicating which nodes have outside connections, OR
 *          An array of errors if the selection is not valid.
 */
export function parseExtractableSubgraphSelection(
	graphIds: Set<string>,
	adjacencyList: AdjacencyList,
): ExtractableSubgraphData | ExtractableErrorResult[] {
	const errors: ExtractableErrorResult[] = [];

	// 0-1 Input nodes
	const inputEdges = getInputEdges(graphIds, adjacencyList);
	const inputNodes = new Set(inputEdges.map((x) => x[1]));
	const rootNodes = getRootNodes(graphIds, adjacencyList);
	for (const inputNode of difference(inputNodes, rootNodes).values()) {
		errors.push({
			errorCode: 'Input Edge To Non-Root Node',
			node: inputNode,
		});
	}
	const rootInputNodes = intersection(rootNodes, inputNodes);
	if (rootInputNodes.size > 1) {
		errors.push({
			errorCode: 'Multiple Input Nodes',
			nodes: rootInputNodes,
		});
	}

	// 0-1 Output nodes
	const outputEdges = getOutputEdges(graphIds, adjacencyList);
	const outputNodes = new Set(outputEdges.map((x) => x[0]));
	const leafNodes = getLeafNodes(graphIds, adjacencyList);
	for (const outputNode of difference(outputNodes, leafNodes).values()) {
		errors.push({
			errorCode: 'Output Edge From Non-Leaf Node',
			node: outputNode,
		});
	}

	const leafOutputNodes = intersection(leafNodes, outputNodes);
	if (leafOutputNodes.size > 1) {
		errors.push({
			errorCode: 'Multiple Output Nodes',
			nodes: leafOutputNodes,
		});
	}

	const start = rootInputNodes.values().next().value;
	const end = leafOutputNodes.values().next().value;

	if (start && end && !hasPath(start, end, adjacencyList)) {
		errors.push({
			errorCode: 'No Continuous Path From Root To Leaf In Selection',
			start,
			end,
		});
	}

	return errors.length > 0 ? errors : { start, end };
}
