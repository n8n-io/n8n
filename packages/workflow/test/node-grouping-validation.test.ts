import {
	dropInvalidWorkflowGroups,
	GROUP_DESCRIPTION_MAX_LENGTH,
	makeGetNodeTypeForGrouping,
	normalizeGroupDescription,
	validateNodeSelectionForExtraction,
	validateNodeSelectionForGrouping,
	validateWorkflowGroups,
} from '../src/node-grouping-validation';
import {
	NodeConnectionTypes,
	STICKY_NODE_TYPE,
	type IConnections,
	type INode,
	type INodeTypeDescription,
	type INodeTypes,
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

function makeStickyNode(overrides: Partial<INode> = {}): INode {
	return makeNode({
		id: overrides.id ?? 'sticky',
		name: overrides.name ?? 'Sticky',
		type: STICKY_NODE_TYPE,
		parameters: { content: '', width: 240, height: 160 },
		...overrides,
	});
}

const stickyNodeType = makeNodeType({
	name: STICKY_NODE_TYPE,
	group: ['input'],
	inputs: [],
	outputs: [],
});

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

	it('returns valid for a single-node extraction selection', () => {
		const graph = makeLinearGraph();

		const result = validateNodeSelectionForExtraction({
			nodes: [graph.nodes[0]],
			connectionsBySourceNode: graph.connections,
			getNodeType: (node) => makeNodeType({ name: node.type }),
		});

		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.subGraph.map((node) => node.name)).toEqual(['A']);
		}
	});

	it('returns node-already-grouped when a selection id belongs to an existing group', () => {
		const graph = makeLinearGraph();

		const result = validateNodeSelectionForGrouping({
			nodes: [graph.nodes[0], graph.nodes[1]],
			connectionsBySourceNode: graph.connections,
			getNodeType: (node) => makeNodeType({ name: node.type }),
			existingNodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['a', 'c'] }],
		});

		expect(result).toEqual({ valid: false, reason: 'node-already-grouped', nodeIds: ['a'] });
	});

	it('allows grouping when existingNodeGroups is empty or omitted', () => {
		const graph = makeLinearGraph();

		expect(
			validateNodeSelectionForGrouping({
				nodes: [graph.nodes[0], graph.nodes[1]],
				connectionsBySourceNode: graph.connections,
				getNodeType: (node) => makeNodeType({ name: node.type }),
				existingNodeGroups: [],
			}).valid,
		).toBe(true);

		expect(
			validateGrouping({
				nodes: [graph.nodes[0], graph.nodes[1]],
				connectionsBySourceNode: graph.connections,
			}).valid,
		).toBe(true);
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

	it('returns invalid-subgraph for extraction when selected nodes skip an intermediate node', () => {
		const graph = makeLinearGraph();

		const result = validateNodeSelectionForExtraction({
			getNodeType: () => makeNodeType(),
			nodes: [graph.nodes[0], graph.nodes[2]],
			connectionsBySourceNode: graph.connections,
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('invalid-subgraph');
		}
	});

	it('returns invalid-subgraph for extraction when selected nodes are disconnected', () => {
		const nodes = [makeNode({ id: 'a', name: 'A' }), makeNode({ id: 'b', name: 'B' })];

		const result = validateNodeSelectionForExtraction({
			getNodeType: () => makeNodeType(),
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
		// Adds an ai_languageModel edge crossing the {A, B} boundary, which groups
		// still reject — so the result must differ from the base connections.
		const candidateConnections: IConnections = {
			...graph.connections,
			Model: {
				[NodeConnectionTypes.AiLanguageModel]: [
					[{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
				],
			},
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
			expect(result.reason).toBe('non-main-boundary');
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

	it('allows grouping a start node with multiple main inputs', () => {
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

		expect(result.valid).toBe(true);
	});

	it('returns multiple-input-branches for extraction when the start node has multiple main inputs', () => {
		const graph = makeLinearGraph();
		graph.nodes[1].type = 'n8n-nodes-base.merge';

		const result = validateNodeSelectionForExtraction({
			nodes: [graph.nodes[1], graph.nodes[2]],
			connectionsBySourceNode: graph.connections,
			getNodeType: (node) =>
				node.type === 'n8n-nodes-base.merge'
					? makeNodeType({
							name: 'n8n-nodes-base.merge',
							inputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
						})
					: makeNodeType(),
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('multiple-input-branches');
		}
	});

	it('uses resolved inputs when checking start node branch count for extraction', () => {
		const graph = makeLinearGraph();
		graph.nodes[1].type = 'n8n-nodes-base.merge';

		const result = validateNodeSelectionForExtraction({
			nodes: [graph.nodes[1], graph.nodes[2]],
			connectionsBySourceNode: graph.connections,
			getNodeType: (node) =>
				node.type === 'n8n-nodes-base.merge'
					? makeNodeType({
							name: 'n8n-nodes-base.merge',
							inputs: '={{ $parameter.numberInputs }}',
						})
					: makeNodeType(),
			getNodeInputs: () => [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('multiple-input-branches');
		}
	});

	it('allows grouping an end node with multiple main outputs', () => {
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

		expect(result.valid).toBe(true);
	});

	it('returns multiple-output-branches for extraction when the end node has multiple main outputs', () => {
		const graph = makeLinearGraph();
		graph.nodes[1].type = 'n8n-nodes-base.if';

		const result = validateNodeSelectionForExtraction({
			nodes: [graph.nodes[0], graph.nodes[1]],
			connectionsBySourceNode: graph.connections,
			getNodeType: (node) =>
				node.type === 'n8n-nodes-base.if'
					? makeNodeType({
							name: 'n8n-nodes-base.if',
							outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
						})
					: makeNodeType(),
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('multiple-output-branches');
		}
	});

	it('uses resolved outputs when checking end node branch count for extraction', () => {
		const graph = makeLinearGraph();
		graph.nodes[1].type = 'n8n-nodes-base.switch';

		const result = validateNodeSelectionForExtraction({
			nodes: [graph.nodes[0], graph.nodes[1]],
			connectionsBySourceNode: graph.connections,
			getNodeType: (node) =>
				node.type === 'n8n-nodes-base.switch'
					? makeNodeType({
							name: 'n8n-nodes-base.switch',
							outputs: '={{ $parameter.rules }}',
						})
					: makeNodeType(),
			getNodeOutputs: () => [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('multiple-output-branches');
		}
	});

	describe('sticky notes', () => {
		const stickyNodeTypes: Record<string, INodeTypeDescription> = {
			'n8n-nodes-base.set': makeNodeType(),
			[STICKY_NODE_TYPE]: stickyNodeType,
		};

		it('allows grouping a sticky together with a connected selection', () => {
			const graph = makeLinearGraph();
			const sticky = makeStickyNode();

			const result = validateGrouping({
				nodes: [graph.nodes[0], graph.nodes[1], sticky],
				connectionsBySourceNode: graph.connections,
				nodeTypes: stickyNodeTypes,
			});

			expect(result.valid).toBe(true);
			if (result.valid) {
				expect(result.subGraph.map((node) => node.name)).toEqual(['A', 'B', 'Sticky']);
			}
		});

		it('allows grouping a sticky with a single connectable node', () => {
			const graph = makeLinearGraph();
			const stickies = [makeStickyNode(), makeStickyNode({ id: 'sticky2', name: 'Sticky2' })];

			const result = validateGrouping({
				nodes: [graph.nodes[1], ...stickies],
				connectionsBySourceNode: graph.connections,
				nodeTypes: stickyNodeTypes,
			});

			expect(result.valid).toBe(true);
		});

		it('accepts unconnected connectable nodes when a sticky is present', () => {
			// Groups no longer require connected members; the sticky rides along.
			const graph = makeLinearGraph();

			const result = validateGrouping({
				nodes: [graph.nodes[0], graph.nodes[2], makeStickyNode()],
				connectionsBySourceNode: graph.connections,
				nodeTypes: stickyNodeTypes,
			});

			expect(result.valid).toBe(true);
		});

		it('treats sticky-only selections as valid group data', () => {
			// Sticky-only groups can come to exist when a group's last connectable
			// node is deleted, so they must validate (creation surfaces enforce at
			// least one connectable node separately).
			for (const nodes of [
				[makeStickyNode()],
				[makeStickyNode(), makeStickyNode({ id: 'sticky2', name: 'Sticky2' })],
			]) {
				const result = validateGrouping({
					nodes,
					connectionsBySourceNode: {},
					nodeTypes: stickyNodeTypes,
				});

				expect(result.valid).toBe(true);
				if (result.valid) {
					expect(result.subGraph).toEqual(nodes);
					expect(result.subGraphData).toEqual({ start: undefined, end: undefined });
				}
			}
		});

		it('returns node-already-grouped when the sticky belongs to another group', () => {
			const graph = makeLinearGraph();
			const sticky = makeStickyNode();

			const result = validateNodeSelectionForGrouping({
				nodes: [graph.nodes[0], graph.nodes[1], sticky],
				connectionsBySourceNode: graph.connections,
				getNodeType: (node) => stickyNodeTypes[node.type],
				existingNodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['sticky'] }],
			});

			expect(result).toEqual({
				valid: false,
				reason: 'node-already-grouped',
				nodeIds: ['sticky'],
			});
		});

		it('returns trigger-selected when a trigger accompanies the sticky', () => {
			const graph = makeLinearGraph();
			graph.nodes[0].type = 'n8n-nodes-base.manualTrigger';

			const result = validateGrouping({
				nodes: [graph.nodes[0], graph.nodes[1], makeStickyNode()],
				connectionsBySourceNode: graph.connections,
				nodeTypes: {
					...stickyNodeTypes,
					'n8n-nodes-base.manualTrigger': makeNodeType({
						name: 'n8n-nodes-base.manualTrigger',
						group: ['trigger'],
					}),
				},
			});

			expect(result).toEqual({ valid: false, reason: 'trigger-selected', triggers: ['A'] });
		});

		it('still rejects non-main boundary connections when a sticky is present', () => {
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
				nodes: [graph.nodes[0], graph.nodes[1], model, makeStickyNode()],
				connectionsBySourceNode,
				nodeTypes: stickyNodeTypes,
			});

			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.reason).toBe('non-main-boundary');
			}
		});

		it('keeps rejecting stickies in extraction selections', () => {
			const graph = makeLinearGraph();

			const result = validateNodeSelectionForExtraction({
				nodes: [graph.nodes[0], graph.nodes[1], makeStickyNode()],
				connectionsBySourceNode: graph.connections,
				getNodeType: (node) => stickyNodeTypes[node.type],
			});

			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.reason).toBe('invalid-subgraph');
			}
		});
	});
});

describe('normalizeGroupDescription', () => {
	test('keeps a description within the cap unchanged', () => {
		expect(normalizeGroupDescription('short')).toBe('short');
	});

	test('caps an over-long description to the max length', () => {
		const result = normalizeGroupDescription('x'.repeat(GROUP_DESCRIPTION_MAX_LENGTH + 50));
		expect(result).toHaveLength(GROUP_DESCRIPTION_MAX_LENGTH);
	});

	test('treats an empty string as no description', () => {
		expect(normalizeGroupDescription('')).toBeUndefined();
	});

	test.each([
		['undefined', undefined],
		['a number', 42],
		['an object', { a: 1 }],
		['an array', [1, 2, 3]],
		['null', null],
	])('drops a non-string value (%s)', (_label, value) => {
		expect(normalizeGroupDescription(value)).toBeUndefined();
	});
});

describe('validateWorkflowGroups', () => {
	const nodeTypesByName: Record<string, INodeTypeDescription> = {
		'n8n-nodes-base.set': makeNodeType(),
		'n8n-nodes-base.manualTrigger': makeNodeType({
			name: 'n8n-nodes-base.manualTrigger',
			group: ['trigger'],
		}),
	};
	const getNodeType = (node: INode) => nodeTypesByName[node.type] ?? null;

	const expectViolations = (
		result: ReturnType<typeof validateWorkflowGroups>,
		violations: Array<
			Partial<{ groupId: string; groupName: string; code: string; message: string }>
		>,
	) => {
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.violations).toEqual(violations.map((v) => expect.objectContaining(v)));
		}
	};

	it('returns valid when nodeGroups is missing or empty', () => {
		const graph = makeLinearGraph();

		expect(
			validateWorkflowGroups({
				nodes: graph.nodes,
				connectionsBySourceNode: graph.connections,
				getNodeType,
			}),
		).toEqual({ valid: true });

		expect(
			validateWorkflowGroups({
				nodes: graph.nodes,
				connectionsBySourceNode: graph.connections,
				nodeGroups: [],
				getNodeType,
			}),
		).toEqual({ valid: true });
	});

	it('returns valid for a well-formed group', () => {
		const graph = makeLinearGraph();

		const result = validateWorkflowGroups({
			nodes: graph.nodes,
			connectionsBySourceNode: graph.connections,
			nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }],
			getNodeType,
		});

		expect(result).toEqual({ valid: true });
	});

	it('reports a duplicate group ID', () => {
		const graph = makeLinearGraph();

		const result = validateWorkflowGroups({
			nodes: graph.nodes,
			connectionsBySourceNode: graph.connections,
			nodeGroups: [
				{ id: 'g1', name: 'First', nodeIds: ['a'] },
				{ id: 'g1', name: 'Second', nodeIds: ['b'] },
			],
			getNodeType,
		});

		expectViolations(result, [
			{
				groupId: 'g1',
				groupName: 'Second',
				code: 'duplicate-group-id',
				message: 'Duplicate node group ID "g1".',
			},
		]);
	});

	it('reports a duplicate group name', () => {
		const graph = makeLinearGraph();

		const result = validateWorkflowGroups({
			nodes: graph.nodes,
			connectionsBySourceNode: graph.connections,
			nodeGroups: [
				{ id: 'g1', name: 'Group', nodeIds: ['a'] },
				{ id: 'g2', name: 'Group', nodeIds: ['b'] },
			],
			getNodeType,
		});

		expectViolations(result, [
			{
				groupId: 'g2',
				code: 'duplicate-group-name',
				message: 'Duplicate node group name "Group".',
			},
		]);
	});

	it('reports a memberless group', () => {
		const graph = makeLinearGraph();

		const result = validateWorkflowGroups({
			nodes: graph.nodes,
			connectionsBySourceNode: graph.connections,
			nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: [] }],
			getNodeType,
		});

		expectViolations(result, [{ code: 'empty-group', message: 'Group "Group" has no members.' }]);
	});

	it('reports a group member that does not exist in the workflow', () => {
		const graph = makeLinearGraph();

		const result = validateWorkflowGroups({
			nodes: graph.nodes,
			connectionsBySourceNode: graph.connections,
			nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['a', 'missing'] }],
			getNodeType,
		});

		expectViolations(result, [
			{
				code: 'unknown-node-id',
				message: 'Group "Group" references node ID "missing" that does not exist in the workflow.',
			},
		]);
	});

	it('reports a node that belongs to multiple groups', () => {
		const graph = makeLinearGraph();

		const result = validateWorkflowGroups({
			nodes: graph.nodes,
			connectionsBySourceNode: graph.connections,
			nodeGroups: [
				{ id: 'g1', name: 'First', nodeIds: ['a'] },
				{ id: 'g2', name: 'Second', nodeIds: ['a'] },
			],
			getNodeType,
		});

		expectViolations(result, [
			{
				groupId: 'g2',
				code: 'node-in-multiple-groups',
				message: 'Node "A" belongs to multiple groups: "First" and "Second".',
			},
			// The clean first group still fails its graph rules against the second.
			{
				groupId: 'g1',
				code: 'node-already-grouped',
				message: 'Node group "First" contains nodes that already belong to another group: A.',
			},
		]);
	});

	it('falls back to the node id in messages when the node has no name', () => {
		const unnamed = makeNode({ id: 'node-id-1', name: '' });

		const result = validateWorkflowGroups({
			nodes: [unnamed],
			connectionsBySourceNode: {},
			nodeGroups: [
				{ id: 'g1', name: 'First', nodeIds: ['node-id-1'] },
				{ id: 'g2', name: 'Second', nodeIds: ['node-id-1'] },
			],
			getNodeType: null,
		});

		expectViolations(result, [
			{
				code: 'node-in-multiple-groups',
				message: 'Node "node-id-1" belongs to multiple groups: "First" and "Second".',
			},
		]);
	});

	it('reports a group containing a trigger node', () => {
		const graph = makeLinearGraph();
		const trigger = makeNode({
			id: 'trigger',
			name: 'Trigger',
			type: 'n8n-nodes-base.manualTrigger',
		});
		const connections: IConnections = {
			Trigger: { main: [[{ node: 'A', type: NodeConnectionTypes.Main, index: 0 }]] },
			...graph.connections,
		};

		const result = validateWorkflowGroups({
			nodes: [...graph.nodes, trigger],
			connectionsBySourceNode: connections,
			nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['trigger', 'a'] }],
			getNodeType,
		});

		expectViolations(result, [
			{
				code: 'trigger-selected',
				message: 'Node group "Group" cannot contain trigger nodes: Trigger.',
			},
		]);
	});

	it('reports a group crossing a non-main connection boundary', () => {
		const graph = makeLinearGraph();
		const model = makeNode({ id: 'model', name: 'Model' });
		const connections: IConnections = {
			...graph.connections,
			Model: {
				[NodeConnectionTypes.AiLanguageModel]: [
					[{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
				],
			},
		};

		const result = validateWorkflowGroups({
			nodes: [...graph.nodes, model],
			connectionsBySourceNode: connections,
			nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }],
			getNodeType,
		});

		expectViolations(result, [
			{
				code: 'non-main-boundary',
				message:
					'Node group "Group" cannot cross the "ai_languageModel" connection between "Model" and "B".',
			},
		]);
	});

	it('reports a trigger in a group as a rule violation', () => {
		const graph = makeLinearGraph();
		const trigger = makeNode({
			id: 'trigger',
			name: 'Trigger',
			type: 'n8n-nodes-base.manualTrigger',
		});

		const result = validateWorkflowGroups({
			nodes: [...graph.nodes, trigger],
			connectionsBySourceNode: graph.connections,
			nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['trigger', 'a'] }],
			getNodeType,
		});

		expectViolations(result, [
			{
				code: 'trigger-selected',
				message: 'Node group "Group" cannot contain trigger nodes: Trigger.',
			},
		]);
	});

	it('identifies the group by name only, keeping the id on the structured violation', () => {
		// The id is deliberately absent from the message: a group that fails these
		// rules may never have been persisted. Consumers use `groupId` instead.
		const graph = makeLinearGraph();
		const trigger = makeNode({
			id: 'trigger',
			name: 'Trigger',
			type: 'n8n-nodes-base.manualTrigger',
		});

		const result = validateWorkflowGroups({
			nodes: [...graph.nodes, trigger],
			connectionsBySourceNode: graph.connections,
			nodeGroups: [{ id: 'group-uuid-1', name: 'Group', nodeIds: ['trigger', 'a'] }],
			getNodeType,
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.violations[0].groupId).toBe('group-uuid-1');
			expect(result.violations[0].message).not.toContain('group-uuid-1');
		}
	});

	it('skips graph rules for a group that already has a basic violation', () => {
		const graph = makeLinearGraph();

		// Without the skip, the trigger member would additionally report
		// trigger-selected on top of the unknown-node-id basic violation.
		const trigger = makeNode({
			id: 'trigger',
			name: 'Trigger',
			type: 'n8n-nodes-base.manualTrigger',
		});
		const result = validateWorkflowGroups({
			nodes: [...graph.nodes, trigger],
			connectionsBySourceNode: graph.connections,
			nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['trigger', 'a', 'missing'] }],
			getNodeType,
		});

		expectViolations(result, [{ code: 'unknown-node-id' }]);
	});

	it('runs basic checks only when getNodeType is null', () => {
		const graph = makeLinearGraph();
		const trigger = makeNode({
			id: 'trigger',
			name: 'Trigger',
			type: 'n8n-nodes-base.manualTrigger',
		});

		// A trigger-containing group passes basic-only validation…
		expect(
			validateWorkflowGroups({
				nodes: [...graph.nodes, trigger],
				connectionsBySourceNode: graph.connections,
				nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['trigger', 'a'] }],
				getNodeType: null,
			}),
		).toEqual({ valid: true });

		// …but basic violations are still reported.
		const result = validateWorkflowGroups({
			nodes: graph.nodes,
			connectionsBySourceNode: graph.connections,
			nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: [] }],
			getNodeType: null,
		});
		expectViolations(result, [{ code: 'empty-group' }]);
	});

	it('collects all violations, basic checks first', () => {
		const graph = makeLinearGraph();
		const trigger = makeNode({
			id: 'trigger',
			name: 'Trigger',
			type: 'n8n-nodes-base.manualTrigger',
		});

		const result = validateWorkflowGroups({
			nodes: [...graph.nodes, trigger],
			connectionsBySourceNode: graph.connections,
			nodeGroups: [
				{ id: 'g1', name: 'Broken', nodeIds: [] },
				{ id: 'g2', name: 'HasTrigger', nodeIds: ['trigger', 'a'] },
			],
			getNodeType,
		});

		expectViolations(result, [
			{ groupId: 'g1', code: 'empty-group' },
			{ groupId: 'g2', code: 'trigger-selected' },
		]);
	});
});

describe('makeGetNodeTypeForGrouping', () => {
	it('returns the description for a known type and null for an unknown one', () => {
		const description = makeNodeType({ name: 'known.node' });
		const nodeTypes = {
			getByNameAndVersion(nodeType: string) {
				if (nodeType === 'known.node') return { description };
				throw new Error('Unknown node type');
			},
		} as INodeTypes;

		const getNodeType = makeGetNodeTypeForGrouping(nodeTypes);

		expect(getNodeType(makeNode({ type: 'known.node' }))).toBe(description);
		expect(getNodeType(makeNode({ type: 'unknown.node' }))).toBeNull();
	});
});

describe('dropInvalidWorkflowGroups', () => {
	it('leaves a valid workflow untouched and reports nothing', () => {
		const graph = makeLinearGraph();
		const workflow = {
			nodes: graph.nodes,
			connections: graph.connections,
			nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }],
		};

		expect(dropInvalidWorkflowGroups(workflow, null)).toEqual([]);
		expect(workflow.nodeGroups).toEqual([{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }]);
	});

	it('drops every violating group and keeps the valid ones', () => {
		const graph = makeLinearGraph();
		const workflow = {
			nodes: graph.nodes,
			connections: graph.connections,
			nodeGroups: [
				{ id: 'g1', name: 'Valid', nodeIds: ['a', 'b'] },
				{ id: 'g2', name: 'Unknown member', nodeIds: ['missing'] },
			],
		};

		const violations = dropInvalidWorkflowGroups(workflow, null);

		expect(violations).toHaveLength(1);
		expect(violations[0]).toMatchObject({ groupId: 'g2', code: 'unknown-node-id' });
		expect(workflow.nodeGroups).toEqual([{ id: 'g1', name: 'Valid', nodeIds: ['a', 'b'] }]);
	});

	it('returns every violation for dropped groups while dropping each group once', () => {
		const graph = makeLinearGraph();
		const workflow = {
			nodes: graph.nodes,
			connections: graph.connections,
			nodeGroups: [
				{ id: 'g1', name: 'Duplicate', nodeIds: ['a'] },
				{ id: 'g2', name: 'Duplicate', nodeIds: [] },
			],
		};

		const violations = dropInvalidWorkflowGroups(workflow, null);

		expect(violations).toEqual([
			expect.objectContaining({
				groupId: 'g2',
				groupName: 'Duplicate',
				code: 'duplicate-group-name',
			}),
			expect.objectContaining({
				groupId: 'g2',
				groupName: 'Duplicate',
				code: 'empty-group',
			}),
		]);
		expect(workflow.nodeGroups).toEqual([{ id: 'g1', name: 'Duplicate', nodeIds: ['a'] }]);
	});

	it('drops only the reported group when duplicate IDs make groupId ambiguous', () => {
		const graph = makeLinearGraph();
		const workflow = {
			nodes: graph.nodes,
			connections: graph.connections,
			nodeGroups: [
				{ id: 'dup', name: 'First', nodeIds: ['a'] },
				{ id: 'dup', name: 'Second', nodeIds: ['b'] },
			],
		};

		const violations = dropInvalidWorkflowGroups(workflow, null);

		expect(violations).toEqual([
			expect.objectContaining({
				groupId: 'dup',
				groupName: 'Second',
				code: 'duplicate-group-id',
			}),
		]);
		expect(workflow.nodeGroups).toEqual([{ id: 'dup', name: 'First', nodeIds: ['a'] }]);
	});

	describe('with a shouldDrop predicate', () => {
		// Two groups sharing A: the second is flagged for the overlap, and the
		// first for holding a node that now belongs elsewhere. A caller that can
		// only blame one of them must be able to drop just that one.
		const buildOverlapping = () => {
			const graph = makeLinearGraph();
			return {
				nodes: graph.nodes,
				connections: graph.connections,
				nodeGroups: [
					{ id: 'g1', name: 'First', nodeIds: ['a', 'b'] },
					{ id: 'g2', name: 'Second', nodeIds: ['a'] },
				],
			};
		};

		it('drops only the matching groups and reports only those', () => {
			const workflow = buildOverlapping();

			const violations = dropInvalidWorkflowGroups(
				workflow,
				() => makeNodeType(),
				(violation) => violation.groupId === 'g2',
			);

			expect(violations).toHaveLength(1);
			expect(violations[0].groupId).toBe('g2');
			expect(workflow.nodeGroups).toEqual([{ id: 'g1', name: 'First', nodeIds: ['a', 'b'] }]);
		});

		it('clears the collateral violation once the culprit is gone', () => {
			const workflow = buildOverlapping();
			dropInvalidWorkflowGroups(
				workflow,
				() => makeNodeType(),
				(violation) => violation.groupId === 'g2',
			);

			// Second pass: "First" only ever failed because "Second" overlapped it.
			expect(dropInvalidWorkflowGroups(workflow, () => makeNodeType())).toEqual([]);
			expect(workflow.nodeGroups).toHaveLength(1);
		});

		it('keeps the workflow untouched when nothing matches', () => {
			const workflow = buildOverlapping();

			expect(
				dropInvalidWorkflowGroups(
					workflow,
					() => makeNodeType(),
					() => false,
				),
			).toEqual([]);
			expect(workflow.nodeGroups).toHaveLength(2);
		});
	});
});

describe('multi-entry/exit groups', () => {
	const getNodeType = () => makeNodeType();

	// Outside -> B and Outside2 -> C, so the group {B, C, D} has two entries.
	// D -> Out1 and D -> Out2 give it two exits.
	const nodes = ['B', 'C', 'D'].map((name) => makeNode({ id: name, name }));
	const connections: IConnections = {
		Outside: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
		Outside2: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
		B: { main: [[{ node: 'D', type: NodeConnectionTypes.Main, index: 0 }]] },
		C: { main: [[{ node: 'D', type: NodeConnectionTypes.Main, index: 0 }]] },
		D: {
			main: [
				[
					{ node: 'Out1', type: NodeConnectionTypes.Main, index: 0 },
					{ node: 'Out2', type: NodeConnectionTypes.Main, index: 0 },
				],
			],
		},
	};

	it('accepts a connection into a mid-group member', () => {
		// Outside -> D, where D already receives from B inside the group.
		const result = validateNodeSelectionForGrouping({
			nodes,
			connectionsBySourceNode: {
				...connections,
				Outside3: { main: [[{ node: 'D', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
			getNodeType,
		});

		expect(result.valid).toBe(true);
	});

	it('accepts a connection out of a mid-group member', () => {
		// B -> Outside4, where B also feeds D inside the group.
		const result = validateNodeSelectionForGrouping({
			nodes,
			connectionsBySourceNode: {
				...connections,
				B: {
					main: [
						[
							{ node: 'D', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'Outside4', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			},
			getNodeType,
		});

		expect(result.valid).toBe(true);
	});

	it('accepts a multi-entry/exit selection', () => {
		const result = validateNodeSelectionForGrouping({
			nodes,
			connectionsBySourceNode: connections,
			getNodeType,
		});

		expect(result.valid).toBe(true);
		// Extraction endpoints do not apply to a group with several boundary edges.
		if (result.valid) {
			expect(result.subGraphData).toEqual({ start: undefined, end: undefined });
		}
	});

	it('accepts parallel members that do not connect to each other', () => {
		// Two branches framed together: each member links only to outside nodes.
		const parallel: IConnections = {
			In: {
				main: [
					[
						{ node: 'B', type: NodeConnectionTypes.Main, index: 0 },
						{ node: 'C', type: NodeConnectionTypes.Main, index: 0 },
					],
				],
			},
			B: { main: [[{ node: 'Out1', type: NodeConnectionTypes.Main, index: 0 }]] },
			C: { main: [[{ node: 'Out2', type: NodeConnectionTypes.Main, index: 0 }]] },
		};

		const result = validateNodeSelectionForGrouping({
			nodes: [makeNode({ id: 'B', name: 'B' }), makeNode({ id: 'C', name: 'C' })],
			connectionsBySourceNode: parallel,
			getNodeType,
		});

		expect(result.valid).toBe(true);
	});

	it('still rejects a disconnected selection for extraction', () => {
		const result = validateNodeSelectionForExtraction({
			nodes: [makeNode({ id: 'B', name: 'B' }), makeNode({ id: 'Z', name: 'Z' })],
			connectionsBySourceNode: connections,
			getNodeType,
		});

		expect(result.valid).toBe(false);
	});

	it('does not relax extraction, which needs a single entry and exit', () => {
		const result = validateNodeSelectionForExtraction({
			nodes,
			connectionsBySourceNode: connections,
			getNodeType,
		});

		expect(result.valid).toBe(false);
	});
});
