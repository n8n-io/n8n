import {
	validateNodeSelectionForExtraction,
	validateNodeSelectionForGrouping,
} from '../src/common';
import {
	NodeConnectionTypes,
	type IConnections,
	type INode,
	type INodeTypeDescription,
} from '../src';

function makeNode(overrides: Partial<INode> = {}): INode {
	return {
		id: overrides.id ?? overrides.name ?? 'a',
		name: overrides.name ?? overrides.id ?? 'A',
		type: overrides.type ?? 'n8n-nodes-base.set',
		typeVersion: overrides.typeVersion ?? 1,
		position: overrides.position ?? [0, 0],
		parameters: overrides.parameters ?? {},
		...overrides,
	};
}

function makeNodeType(overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription {
	return {
		displayName: overrides.displayName ?? 'Set',
		name: overrides.name ?? 'n8n-nodes-base.set',
		group: overrides.group ?? ['transform'],
		version: overrides.version ?? 1,
		description: overrides.description ?? '',
		defaults: overrides.defaults ?? { name: 'Set' },
		inputs: overrides.inputs ?? [NodeConnectionTypes.Main],
		outputs: overrides.outputs ?? [NodeConnectionTypes.Main],
		properties: overrides.properties ?? [],
		...overrides,
	};
}

function makeLinearGraph() {
	const nodes = [
		makeNode({ id: 'a', name: 'A' }),
		makeNode({ id: 'b', name: 'B' }),
		makeNode({ id: 'c', name: 'C' }),
	];

	const connections: IConnections = {
		A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
		B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
	};

	return { nodes, connections };
}

function validateGrouping({
	nodes,
	connectionsBySourceNode,
	nodeTypes = { 'n8n-nodes-base.set': makeNodeType() },
}: {
	nodes: INode[];
	connectionsBySourceNode: IConnections;
	nodeTypes?: Record<string, INodeTypeDescription>;
}) {
	return validateNodeSelectionForGrouping({
		nodes,
		connectionsBySourceNode,
		getNodeType: (node) => nodeTypes[node.type],
	});
}

describe('node grouping validation', () => {
	it('returns valid for a connected non-trigger selection', () => {
		const graph = makeLinearGraph();

		const result = validateGrouping({
			nodes: [graph.nodes[0], graph.nodes[1]],
			connectionsBySourceNode: graph.connections,
		});

		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.subGraph.map((node) => node.name)).toEqual(['A', 'B']);
		}
	});

	it('returns too-few-nodes for a single-node selection', () => {
		const graph = makeLinearGraph();

		const result = validateGrouping({
			nodes: [graph.nodes[0]],
			connectionsBySourceNode: graph.connections,
		});

		expect(result).toEqual({ valid: false, reason: 'too-few-nodes' });
	});

	it('returns trigger-selected when the selection contains a trigger', () => {
		const graph = makeLinearGraph();
		graph.nodes[0].type = 'n8n-nodes-base.manualTrigger';

		const result = validateGrouping({
			nodes: [graph.nodes[0], graph.nodes[1]],
			connectionsBySourceNode: graph.connections,
			nodeTypes: {
				'n8n-nodes-base.manualTrigger': makeNodeType({
					name: 'n8n-nodes-base.manualTrigger',
					group: ['trigger'],
				}),
				'n8n-nodes-base.set': makeNodeType(),
			},
		});

		expect(result).toEqual({ valid: false, reason: 'trigger-selected', triggers: ['A'] });
	});

	it('returns invalid-subgraph when selected nodes skip an intermediate node', () => {
		const graph = makeLinearGraph();

		const result = validateGrouping({
			nodes: [graph.nodes[0], graph.nodes[2]],
			connectionsBySourceNode: graph.connections,
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('invalid-subgraph');
		}
	});

	it('returns invalid-subgraph when selected nodes are disconnected', () => {
		const nodes = [makeNode({ id: 'a', name: 'A' }), makeNode({ id: 'b', name: 'B' })];

		const result = validateGrouping({
			nodes,
			connectionsBySourceNode: {},
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('invalid-subgraph');
		}
	});

	it('validates against the provided candidate connections', () => {
		const graph = makeLinearGraph();
		const candidateConnections: IConnections = {
			...graph.connections,
			C: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
		};

		expect(
			validateGrouping({
				nodes: [graph.nodes[0], graph.nodes[1]],
				connectionsBySourceNode: graph.connections,
			}).valid,
		).toBe(true);

		const result = validateGrouping({
			nodes: [graph.nodes[0], graph.nodes[1]],
			connectionsBySourceNode: candidateConnections,
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('invalid-subgraph');
		}
	});

	it('rejects a non-main boundary connection for grouping but not extraction', () => {
		const graph = makeLinearGraph();
		const model = makeNode({ id: 'model', name: 'Model' });
		const connectionsBySourceNode: IConnections = {
			...graph.connections,
			Model: {
				[NodeConnectionTypes.AiLanguageModel]: [
					[
						{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
						{ node: 'C', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
					],
				],
			},
		};

		const baseInput = {
			nodes: [graph.nodes[0], graph.nodes[1], model],
			connectionsBySourceNode,
			getNodeType: () => makeNodeType(),
		};

		expect(validateNodeSelectionForExtraction(baseInput).valid).toBe(true);

		const result = validateNodeSelectionForGrouping(baseInput);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('non-main-boundary');
		}
	});

	it('allows a shared non-main node when every consumer is inside the group', () => {
		const graph = makeLinearGraph();
		const model = makeNode({ id: 'model', name: 'Model' });
		const connectionsBySourceNode: IConnections = {
			...graph.connections,
			Model: {
				[NodeConnectionTypes.AiLanguageModel]: [
					[
						{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
						{ node: 'C', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
					],
				],
			},
		};

		const result = validateGrouping({
			nodes: [...graph.nodes, model],
			connectionsBySourceNode,
		});

		expect(result.valid).toBe(true);
	});

	it('returns multiple-input-branches for a start node with multiple main inputs', () => {
		const graph = makeLinearGraph();
		graph.nodes[1].type = 'n8n-nodes-base.merge';

		const result = validateGrouping({
			nodes: [graph.nodes[1], graph.nodes[2]],
			connectionsBySourceNode: graph.connections,
			nodeTypes: {
				'n8n-nodes-base.merge': makeNodeType({
					name: 'n8n-nodes-base.merge',
					inputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
				}),
				'n8n-nodes-base.set': makeNodeType(),
			},
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('multiple-input-branches');
		}
	});

	it('returns multiple-output-branches for an end node with multiple main outputs', () => {
		const graph = makeLinearGraph();
		graph.nodes[1].type = 'n8n-nodes-base.if';

		const result = validateGrouping({
			nodes: [graph.nodes[0], graph.nodes[1]],
			connectionsBySourceNode: graph.connections,
			nodeTypes: {
				'n8n-nodes-base.if': makeNodeType({
					name: 'n8n-nodes-base.if',
					outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
				}),
				'n8n-nodes-base.set': makeNodeType(),
			},
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('multiple-output-branches');
		}
	});
});
