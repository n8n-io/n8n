import { NodeTypes } from './helpers';
import { ExpressionError } from '../src/errors/expression.error';
import type { IExecuteData, INode, IWorkflowBase, IRun, IConnections } from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';
import { Workflow } from '../src/workflow';
import { WorkflowDataProxy } from '../src/workflow-data-proxy';

describe('Paired Item Path Detection', () => {
	/**
	 * Helper to create a minimal workflow for testing
	 */
	const createWorkflow = (nodes: INode[], connections: IConnections = {}): IWorkflowBase => ({
		id: '1',
		name: 'test-workflow',
		nodes,
		connections,
		active: false,
		settings: {},
		isArchived: false,
		updatedAt: new Date(),
		createdAt: new Date(),
	});

	/**
	 * Helper to create a WorkflowDataProxy for testing
	 */
	const createProxy = (
		workflow: IWorkflowBase,
		activeNodeName: string,
		run?: IRun | null,
		executeData?: IExecuteData,
	) => {
		const wf = new Workflow({
			id: workflow.id,
			name: workflow.name,
			nodes: workflow.nodes,
			connections: workflow.connections,
			active: workflow.active,
			nodeTypes: NodeTypes(),
			settings: workflow.settings,
		});

		return new WorkflowDataProxy(
			wf,
			run?.data ?? null,
			0, // runIndex
			0, // itemIndex
			activeNodeName,
			[], // connectionInputData
			{}, // siblingParameters
			'manual', // mode
			{}, // additionalKeys
			executeData,
		).getDataProxy();
	};

	describe('AI/Tool Node Scenarios', () => {
		test('should detect path in bidirectional AI/tool node setup', () => {
			// Scenario: Code1 -> Vector Store <- Default Data Loader
			const nodes: INode[] = [
				{
					id: '1',
					name: 'Code1',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [100, 100],
					parameters: {},
				},
				{
					id: '2',
					name: 'Vector Store',
					type: 'n8n-nodes-langchain.vectorStore',
					typeVersion: 1,
					position: [300, 100],
					parameters: {},
				},
				{
					id: '3',
					name: 'Default Data Loader',
					type: 'n8n-nodes-langchain.documentDefaultDataLoader',
					typeVersion: 1,
					position: [100, 200],
					parameters: {},
				},
				{
					id: '4',
					name: 'Code2',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [500, 100],
					parameters: {
						jsCode: '// Reference Code1 using $()\nreturn $("Code1").all();',
					},
				},
			];

			const connections = {
				Code1: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Vector Store', type: NodeConnectionTypes.AiVectorStore, index: 0 }],
					],
				},
				'Default Data Loader': {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Vector Store', type: NodeConnectionTypes.AiDocument, index: 0 }],
					],
				},
				'Vector Store': {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Code2', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			const workflow = createWorkflow(nodes, connections);
			const wf = new Workflow({
				id: workflow.id,
				name: workflow.name,
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: workflow.active,
				nodeTypes: NodeTypes(),
				settings: workflow.settings,
			});

			// Test bidirectional path detection
			expect(wf.hasPath('Code1', 'Code2')).toBe(true);
			expect(wf.hasPath('Default Data Loader', 'Code2')).toBe(true);
			expect(wf.hasPath('Code1', 'Default Data Loader')).toBe(true); // Via Vector Store

			// Test that unconnected nodes return false
			const unconnectedNode: INode = {
				id: '5',
				name: 'Unconnected',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [700, 100],
				parameters: {},
			};
			const workflowWithUnconnected = createWorkflow([...nodes, unconnectedNode], connections);
			const wfWithUnconnected = new Workflow({
				id: workflowWithUnconnected.id,
				name: workflowWithUnconnected.name,
				nodes: workflowWithUnconnected.nodes,
				connections: workflowWithUnconnected.connections,
				active: workflowWithUnconnected.active,
				nodeTypes: NodeTypes(),
				settings: workflowWithUnconnected.settings,
			});

			expect(wfWithUnconnected.hasPath('Code1', 'Unconnected')).toBe(false);
		});

		test('should handle complex AI tool connection patterns', () => {
			// More complex AI scenario with multiple connection types
			const nodes: INode[] = [
				{
					id: '1',
					name: 'Agent',
					type: 'n8n-nodes-langchain.agent',
					typeVersion: 1,
					position: [300, 300],
					parameters: {},
				},
				{
					id: '2',
					name: 'Tool1',
					type: 'n8n-nodes-langchain.toolHttpRequest',
					typeVersion: 1,
					position: [100, 200],
					parameters: {},
				},
				{
					id: '3',
					name: 'Tool2',
					type: 'n8n-nodes-langchain.toolCalculator',
					typeVersion: 1,
					position: [100, 400],
					parameters: {},
				},
				{
					id: '4',
					name: 'Memory',
					type: 'n8n-nodes-langchain.memoryBufferMemory',
					typeVersion: 1,
					position: [200, 100],
					parameters: {},
				},
			];

			const connections = {
				Tool1: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
				Tool2: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 1 }],
					],
				},
				Memory: {
					[NodeConnectionTypes.AiMemory]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiMemory, index: 0 }],
					],
				},
			};

			const workflow = createWorkflow(nodes, connections);
			const wf = new Workflow({
				id: workflow.id,
				name: workflow.name,
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: workflow.active,
				nodeTypes: NodeTypes(),
				settings: workflow.settings,
			});

			// Test all tools can reach the agent
			expect(wf.hasPath('Tool1', 'Agent')).toBe(true);
			expect(wf.hasPath('Tool2', 'Agent')).toBe(true);
			expect(wf.hasPath('Memory', 'Agent')).toBe(true);

			// Test bidirectional paths
			expect(wf.hasPath('Agent', 'Tool1')).toBe(true);
			expect(wf.hasPath('Agent', 'Tool2')).toBe(true);
			expect(wf.hasPath('Agent', 'Memory')).toBe(true);

			// Test indirect connections
			expect(wf.hasPath('Tool1', 'Tool2')).toBe(true); // Via Agent
			expect(wf.hasPath('Memory', 'Tool1')).toBe(true); // Via Agent
		});
	});

	describe('Manual Execution Node-Not-Found Scenarios', () => {
		test('should throw "No path back to referenced node" when node does not exist in trimmed workflow', () => {
			// Simulate manual execution scenario where node D is not in the trimmed workflow
			const nodes: INode[] = [
				{
					id: '1',
					name: 'A',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [100, 100],
					parameters: {},
				},
				{
					id: '2',
					name: 'B',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [300, 100],
					parameters: {
						jsCode: 'return $("D").all(); // Reference missing node D',
					},
				},
				{
					id: '3',
					name: 'C',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [500, 100],
					parameters: {},
				},
			];

			const connections = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				B: {
					[NodeConnectionTypes.Main]: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const workflow = createWorkflow(nodes, connections);
			const proxy = createProxy(workflow, 'B');

			// Should throw error when trying to access non-existent node D
			expect(() => proxy.$('D')).toThrowError(ExpressionError);
			expect(() => proxy.$('D')).toThrow(/Error finding the referenced node/);
		});

		test('should throw "No path back to referenced node" when node exists but has no path', () => {
			// Node D exists but is not connected
			const nodes: INode[] = [
				{
					id: '1',
					name: 'A',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [100, 100],
					parameters: {},
				},
				{
					id: '2',
					name: 'B',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [300, 100],
					parameters: {
						jsCode: 'return $("D").all(); // Reference unconnected node D',
					},
				},
				{
					id: '3',
					name: 'C',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [500, 100],
					parameters: {},
				},
				{
					id: '4',
					name: 'D',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [100, 300],
					parameters: {},
				},
			];

			const connections = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				B: {
					[NodeConnectionTypes.Main]: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				// D is not connected
			};

			const workflow = createWorkflow(nodes, connections);

			// Create executeData to simulate a real execution context
			const executeData: IExecuteData = {
				data: {
					main: [[]],
				},
				node: nodes.find((n) => n.name === 'B')!,
				source: {
					main: [
						{
							previousNode: 'A',
							previousNodeOutput: 0,
							previousNodeRun: 0,
						},
					],
				},
			};

			const proxy = createProxy(workflow, 'B', null, executeData);

			// Should throw error when trying to access paired item from unconnected node D
			let error: ExpressionError | undefined;
			try {
				proxy.$('D').item;
			} catch (e) {
				error = e as ExpressionError;
			}

			expect(error).toBeDefined();
			expect(error).toBeInstanceOf(ExpressionError);
			expect(error!.context.type).toBe('paired_item_no_connection');
			expect(error!.context.descriptionKey).toBe('pairedItemNoConnectionCodeNode');
		});
	});

	describe('Workflow.hasPath method', () => {
		test('should handle self-reference', () => {
			const nodes: INode[] = [
				{
					id: '1',
					name: 'A',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [100, 100],
					parameters: {},
				},
			];

			const workflow = createWorkflow(nodes, {});
			const wf = new Workflow({
				id: workflow.id,
				name: workflow.name,
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: workflow.active,
				nodeTypes: NodeTypes(),
				settings: workflow.settings,
			});

			expect(wf.hasPath('A', 'A')).toBe(true);
		});

		test('should respect maximum depth limit', () => {
			const nodes: INode[] = [
				{
					id: '1',
					name: 'A',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [100, 100],
					parameters: {},
				},
				{
					id: '2',
					name: 'B',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [300, 100],
					parameters: {},
				},
			];

			const connections = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const workflow = createWorkflow(nodes, connections);
			const wf = new Workflow({
				id: workflow.id,
				name: workflow.name,
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: workflow.active,
				nodeTypes: NodeTypes(),
				settings: workflow.settings,
			});

			// Should find path with sufficient depth
			expect(wf.hasPath('A', 'B', 10)).toBe(true);

			// Should not find path with insufficient depth
			expect(wf.hasPath('A', 'B', 0)).toBe(false);
		});

		test('should handle cycles without infinite loops', () => {
			const nodes: INode[] = [
				{
					id: '1',
					name: 'A',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [100, 100],
					parameters: {},
				},
				{
					id: '2',
					name: 'B',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [300, 100],
					parameters: {},
				},
				{
					id: '3',
					name: 'C',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [500, 100],
					parameters: {},
				},
			];

			// Create a cycle: A -> B -> C -> A
			const connections = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				B: {
					[NodeConnectionTypes.Main]: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				C: {
					[NodeConnectionTypes.Main]: [[{ node: 'A', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const workflow = createWorkflow(nodes, connections);
			const wf = new Workflow({
				id: workflow.id,
				name: workflow.name,
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: workflow.active,
				nodeTypes: NodeTypes(),
				settings: workflow.settings,
			});

			// Should handle cycles correctly
			expect(wf.hasPath('A', 'C')).toBe(true);
			expect(wf.hasPath('B', 'A')).toBe(true);
			expect(wf.hasPath('C', 'B')).toBe(true);
		});
	});

	describe('Actual workflow', () => {
		test('should show correct error message for disconnected nodes', () => {
			// Recreate the exact scenario from the user's workflow
			const nodes: INode[] = [
				{
					id: 'afc0fc26-d521-4464-9f90-3327559bd4a6',
					name: 'On form submission',
					type: 'n8n-nodes-base.formTrigger',
					typeVersion: 2.2,
					position: [0, 0],
					parameters: {
						formTitle: 'Submit BBS application',
					},
				},
				{
					id: 'c5861385-d513-4d74-8fe3-e5acbe08a90a',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [288, 432],
					parameters: {
						jsCode: "\nreturn $('On form submission').all();",
					},
				},
				{
					id: '523b019b-e456-4784-a50a-18558c858c3b',
					name: "When clicking 'Test workflow'",
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 288],
					parameters: {},
				},
				{
					id: '3057aebb-d87a-4142-8354-f298e41ab919',
					name: 'Edit Fields',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [288, 128],
					parameters: {
						assignments: {
							assignments: [
								{
									id: '9c260756-a7ce-41ba-ad9b-0eb1ceeaf02b',
									name: 'test',
									value: "={{ $('On form submission').item.json }}",
									type: 'string',
								},
							],
						},
					},
				},
			];

			const connections = {
				'On form submission': {
					[NodeConnectionTypes.Main]: [[]],
				},
				"When clicking 'Test workflow'": {
					[NodeConnectionTypes.Main]: [
						[
							{ node: 'Code', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'Edit Fields', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			};

			const workflow = createWorkflow(nodes, connections);
			const proxy = createProxy(workflow, 'Code');

			// Should throw the correct error when trying to access disconnected node
			let error: ExpressionError | undefined;
			try {
				proxy.$('On form submission').all();
			} catch (e) {
				error = e as ExpressionError;
			}

			expect(error).toBeDefined();
			expect(error).toBeInstanceOf(ExpressionError);
			expect(error!.context.type).toBe('paired_item_no_connection');
			expect(error!.context.descriptionKey).toBe('pairedItemNoConnection');
			expect(error!.message).toBe('Error finding the referenced node');
			expect(error!.context.messageTemplate).toBe(
				'Make sure the node you referenced is spelled correctly and is a parent of this node',
			);
		});

		test('should also show correct error for Edit Fields node', () => {
			// Test the Edit Fields node as well
			const nodes: INode[] = [
				{
					id: 'afc0fc26-d521-4464-9f90-3327559bd4a6',
					name: 'On form submission',
					type: 'n8n-nodes-base.formTrigger',
					typeVersion: 2.2,
					position: [0, 0],
					parameters: {
						formTitle: 'Submit BBS application',
					},
				},
				{
					id: 'c5861385-d513-4d74-8fe3-e5acbe08a90a',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [288, 432],
					parameters: {
						jsCode: "\nreturn $('On form submission').all();",
					},
				},
				{
					id: '523b019b-e456-4784-a50a-18558c858c3b',
					name: "When clicking 'Test workflow'",
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 288],
					parameters: {},
				},
				{
					id: '3057aebb-d87a-4142-8354-f298e41ab919',
					name: 'Edit Fields',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [288, 128],
					parameters: {
						assignments: {
							assignments: [
								{
									id: '9c260756-a7ce-41ba-ad9b-0eb1ceeaf02b',
									name: 'test',
									value: "={{ $('On form submission').item.json }}",
									type: 'string',
								},
							],
						},
					},
				},
			];

			const connections = {
				'On form submission': {
					[NodeConnectionTypes.Main]: [[]],
				},
				"When clicking 'Test workflow'": {
					[NodeConnectionTypes.Main]: [
						[
							{ node: 'Code', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'Edit Fields', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			};

			const workflow = createWorkflow(nodes, connections);
			const proxy = createProxy(workflow, 'Edit Fields');

			// Should throw the correct error when trying to access disconnected node
			let error: ExpressionError | undefined;
			try {
				proxy.$('On form submission').item;
			} catch (e) {
				error = e as ExpressionError;
			}

			expect(error).toBeDefined();
			expect(error).toBeInstanceOf(ExpressionError);
			expect(error!.context.type).toBe('paired_item_no_connection');
			expect(error!.context.descriptionKey).toBe('pairedItemNoConnection');
			expect(error!.message).toBe('Error finding the referenced node');
			expect(error!.context.messageTemplate).toBe(
				'Make sure the node you referenced is spelled correctly and is a parent of this node',
			);
		});

		test('should show correct error in runtime execution context', () => {
			// Test with execution data to simulate real runtime
			const nodes: INode[] = [
				{
					id: 'afc0fc26-d521-4464-9f90-3327559bd4a6',
					name: 'On form submission',
					type: 'n8n-nodes-base.formTrigger',
					typeVersion: 2.2,
					position: [0, 0],
					parameters: {
						formTitle: 'Submit BBS application',
					},
				},
				{
					id: 'c5861385-d513-4d74-8fe3-e5acbe08a90a',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [288, 432],
					parameters: {
						jsCode: "\nreturn $('On form submission').all();",
					},
				},
				{
					id: '523b019b-e456-4784-a50a-18558c858c3b',
					name: "When clicking 'Test workflow'",
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 288],
					parameters: {},
				},
			];

			const connections = {
				'On form submission': {
					[NodeConnectionTypes.Main]: [[]],
				},
				"When clicking 'Test workflow'": {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Code', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			const workflow = createWorkflow(nodes, connections);

			// Create execution data to simulate real workflow execution
			const executeData: IExecuteData = {
				data: {
					main: [[]],
				},
				node: nodes.find((n) => n.name === 'Code')!,
				source: {
					main: [
						{
							previousNode: "When clicking 'Test workflow'",
							previousNodeOutput: 0,
							previousNodeRun: 0,
						},
					],
				},
			};

			const proxy = createProxy(workflow, 'Code', null, executeData);

			// Should throw the correct error when trying to access disconnected node during execution
			let error: ExpressionError | undefined;
			try {
				proxy.$('On form submission').all();
			} catch (e) {
				error = e as ExpressionError;
			}

			expect(error).toBeDefined();
			expect(error).toBeInstanceOf(ExpressionError);
			expect(error!.context.type).toBe('paired_item_no_connection');
			expect(error!.message).toBe('Error finding the referenced node');
			expect(error!.context.messageTemplate).toBe(
				'Make sure the node you referenced is spelled correctly and is a parent of this node',
			);
		});
	});
});
