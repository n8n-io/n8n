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

	describe('AI/Tool Node Path Detection Fix', () => {
		test('should properly detect paths in complex Telegram workflow scenario', () => {
			// Recreate the exact workflow structure from the reported issue
			const nodes: INode[] = [
				{
					id: 'cb00be8d-004b-4d3d-986e-60386516c67a',
					name: 'Telegram Trigger',
					type: 'n8n-nodes-base.telegramTrigger',
					typeVersion: 1.2,
					position: [0, 0],
					parameters: {
						updates: ['message'],
						additionalFields: { download: true },
					},
				},
				{
					id: 'c5bf285a-d6a5-4767-b369-a48ef504a38e',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2.1,
					position: [208, 0],
					parameters: {
						promptType: 'define',
						text: '={{ $json.message.text }}',
						options: {},
					},
				},
				{
					id: 'eab6fbe5-1998-46f8-9804-8f04147f9624',
					name: 'Anthropic Chat Model',
					type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
					typeVersion: 1.3,
					position: [32, 368],
					parameters: {
						model: {
							__rl: true,
							mode: 'list',
							value: 'claude-sonnet-4-20250514',
						},
						options: {},
					},
				},
				{
					id: '1923ef8d-d459-4d4b-a6bb-0317ab54c2be',
					name: 'Zep',
					type: '@n8n/n8n-nodes-langchain.memoryZep',
					typeVersion: 1.3,
					position: [192, 384],
					parameters: {
						sessionIdType: 'customKey',
						sessionKey: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
					},
				},
				{
					id: '8015fce3-73e2-443b-8dfa-26e6effdc596',
					name: 'AI Agent Tool',
					type: '@n8n/n8n-nodes-langchain.agentTool',
					typeVersion: 2.2,
					position: [368, 208],
					parameters: {
						toolDescription:
							'AI Agent that can call get emails from Gmail and create drafts in Gmail',
						text: "={{ $fromAI('Prompt__User_Message_', ``, 'string') }}",
						options: {},
					},
				},
				{
					id: '201385a6-8adb-4946-92d5-8d46267750b5',
					name: 'Send a text message',
					type: 'n8n-nodes-base.telegram',
					typeVersion: 1.2,
					position: [576, 0],
					parameters: {
						chatId: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
						text: '={{ $json.output }}',
						additionalFields: { appendAttribution: false },
					},
				},
			];

			const connections = {
				'Telegram Trigger': {
					[NodeConnectionTypes.Main]: [
						[{ node: 'AI Agent', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				'AI Agent': {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Send a text message', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				'Anthropic Chat Model': {
					[NodeConnectionTypes.AiLanguageModel]: [
						[
							{ node: 'AI Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
							{ node: 'AI Agent Tool', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
						],
					],
				},
				Zep: {
					[NodeConnectionTypes.AiMemory]: [
						[
							{ node: 'AI Agent', type: NodeConnectionTypes.AiMemory, index: 0 },
							{ node: 'AI Agent Tool', type: NodeConnectionTypes.AiMemory, index: 0 },
						],
					],
				},
				'AI Agent Tool': {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'AI Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
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

			// Test the key path detections that were failing before the fix
			expect(wf.hasPath('Telegram Trigger', 'Zep')).toBe(true);
			expect(wf.hasPath('Telegram Trigger', 'AI Agent')).toBe(true);
			expect(wf.hasPath('Telegram Trigger', 'Send a text message')).toBe(true);
			expect(wf.hasPath('Telegram Trigger', 'AI Agent Tool')).toBe(true);
			expect(wf.hasPath('Telegram Trigger', 'Anthropic Chat Model')).toBe(true);

			// Test reverse paths (bidirectional)
			expect(wf.hasPath('Zep', 'Telegram Trigger')).toBe(true);
			expect(wf.hasPath('AI Agent', 'Telegram Trigger')).toBe(true);
			expect(wf.hasPath('Send a text message', 'Telegram Trigger')).toBe(true);
			expect(wf.hasPath('AI Agent Tool', 'AI Agent')).toBe(true);
			expect(wf.hasPath('Anthropic Chat Model', 'AI Agent')).toBe(true);

			// Test getParentMainInputNode for AI/tool nodes
			const zepNode = wf.getNode('Zep');
			const zepParent = wf.getParentMainInputNode(zepNode);
			expect(zepParent?.name).toBe('AI Agent');

			const toolNode = wf.getNode('AI Agent Tool');
			const toolParent = wf.getParentMainInputNode(toolNode);
			expect(toolParent?.name).toBe('AI Agent');

			const modelNode = wf.getNode('Anthropic Chat Model');
			const modelParent = wf.getParentMainInputNode(modelNode);
			expect(modelParent?.name).toBe('AI Agent');
		});

		test('should handle getParentMainInputNode with cycle detection', () => {
			// Create a scenario where AI/tool nodes could create cycles
			const nodes: INode[] = [
				{
					id: '1',
					name: 'Agent1',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2.1,
					position: [100, 100],
					parameters: {},
				},
				{
					id: '2',
					name: 'Agent2',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2.1,
					position: [300, 100],
					parameters: {},
				},
				{
					id: '3',
					name: 'Tool1',
					type: '@n8n/n8n-nodes-langchain.toolCalculator',
					typeVersion: 1,
					position: [200, 200],
					parameters: {},
				},
			];

			// Create connections that could form a cycle
			const connections = {
				Agent1: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent2', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
				Agent2: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Tool1', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
				Tool1: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent1', type: NodeConnectionTypes.AiTool, index: 0 }],
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

			// This should not cause infinite recursion due to cycle detection
			const agent1Node = wf.getNode('Agent1');
			const agent1Parent = wf.getParentMainInputNode(agent1Node);
			expect(agent1Parent?.name).toBe('Agent1'); // Returns self due to cycle detection

			const tool1Node = wf.getNode('Tool1');
			const tool1Parent = wf.getParentMainInputNode(tool1Node);
			expect(tool1Parent?.name).toBe('Tool1'); // Returns self due to cycle detection
		});

		test('should correctly identify parent main input nodes in complex AI scenarios', () => {
			// Test complex scenario with multiple connection types
			const nodes: INode[] = [
				{
					id: '1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'MainAgent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2.1,
					position: [200, 0],
					parameters: {},
				},
				{
					id: '3',
					name: 'Memory',
					type: '@n8n/n8n-nodes-langchain.memoryBufferMemory',
					typeVersion: 1,
					position: [100, 200],
					parameters: {},
				},
				{
					id: '4',
					name: 'ChatModel',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1,
					position: [300, 200],
					parameters: {},
				},
			];

			const connections = {
				Trigger: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'MainAgent', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				Memory: {
					[NodeConnectionTypes.AiMemory]: [
						[{ node: 'MainAgent', type: NodeConnectionTypes.AiMemory, index: 0 }],
					],
				},
				ChatModel: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'MainAgent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
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

			// Memory node should trace back to MainAgent as its parent main input
			const memoryNode = wf.getNode('Memory');
			const memoryParent = wf.getParentMainInputNode(memoryNode);
			expect(memoryParent?.name).toBe('MainAgent');

			// ChatModel node should trace back to MainAgent as its parent main input
			const chatModelNode = wf.getNode('ChatModel');
			const chatModelParent = wf.getParentMainInputNode(chatModelNode);
			expect(chatModelParent?.name).toBe('MainAgent');

			// MainAgent should trace back to itself (no further parent main input)
			const mainAgentNode = wf.getNode('MainAgent');
			const mainAgentParent = wf.getParentMainInputNode(mainAgentNode);
			expect(mainAgentParent?.name).toBe('MainAgent');
		});

		test('should handle workflow with multiple AI connections', () => {
			const nodes: INode[] = [
				{
					id: '85056f63-f461-4b64-a8ca-807b019b30da',
					name: 'Telegram Trigger',
					type: 'n8n-nodes-base.telegramTrigger',
					typeVersion: 1.2,
					position: [-272, 16],
					parameters: {},
				},
				{
					id: '9670cb60-8926-40d0-bcba-efab28b477ee',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2.1,
					position: [1056, 0],
					parameters: {},
				},
				{
					id: '7fe1aa70-3418-4ad7-940d-af0b7f9b6fb2',
					name: 'Anthropic Chat Model',
					type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
					typeVersion: 1.3,
					position: [1072, 224],
					parameters: {},
				},
				{
					id: 'e7820a46-6f6e-48b2-8dfe-744d3515af79',
					name: 'Zep',
					type: '@n8n/n8n-nodes-langchain.memoryZep',
					typeVersion: 1.3,
					position: [1200, 224],
					parameters: {},
				},
				{
					id: 'f259429d-3a70-4746-945e-c8056160408c',
					name: 'Send a text message',
					type: 'n8n-nodes-base.telegram',
					typeVersion: 1.2,
					position: [1696, 0],
					parameters: {},
				},
				{
					id: '92756ecf-546f-454c-9423-ae273f07a2f2',
					name: 'AI Agent Tool',
					type: '@n8n/n8n-nodes-langchain.agentTool',
					typeVersion: 2.2,
					position: [1536, 272],
					parameters: {},
				},
				{
					id: '193c4482-8477-4a72-9bdb-cc8dc46fe34c',
					name: 'Anthropic Chat Model1',
					type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
					typeVersion: 1.3,
					position: [1424, 480],
					parameters: {},
				},
				{
					id: '141264f6-dcfa-4a50-9212-a4fbc76fead6',
					name: 'Switch',
					type: 'n8n-nodes-base.switch',
					typeVersion: 3.2,
					position: [160, 16],
					parameters: {},
				},
				{
					id: 'b9498c03-f517-43e8-830b-7b694be1199f',
					name: 'Edit Fields',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [368, 112],
					parameters: {},
				},
				{
					id: '564bfeaf-85a6-46f7-bc00-b6ed4e305c8f',
					name: 'Typing ...',
					type: 'n8n-nodes-base.telegram',
					typeVersion: 1.2,
					position: [-64, 16],
					parameters: {},
				},
			];

			const connections = {
				'Telegram Trigger': {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Typing ...', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				'AI Agent': {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Send a text message', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				'Anthropic Chat Model': {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'AI Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
					],
				},
				Zep: {
					[NodeConnectionTypes.AiMemory]: [
						[{ node: 'AI Agent', type: NodeConnectionTypes.AiMemory, index: 0 }],
					],
				},
				'Anthropic Chat Model1': {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'AI Agent Tool', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
					],
				},
				'AI Agent Tool': {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'AI Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
				Switch: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Edit Fields', type: NodeConnectionTypes.Main, index: 1 }],
					],
				},
				'Edit Fields': {
					[NodeConnectionTypes.Main]: [
						[{ node: 'AI Agent', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				'Typing ...': {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Switch', type: NodeConnectionTypes.Main, index: 0 }],
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

			// Test bidirectional path detection for the complex workflow
			// Main flow: Telegram Trigger -> Typing ... -> Switch -> Edit Fields -> AI Agent -> Send a text message
			expect(wf.hasPath('Telegram Trigger', 'Send a text message')).toBe(true);
			expect(wf.hasPath('Typing ...', 'AI Agent')).toBe(true);
			expect(wf.hasPath('Switch', 'AI Agent')).toBe(true);
			expect(wf.hasPath('Edit Fields', 'AI Agent')).toBe(true);

			// Test AI connections that should be reachable via bidirectional path detection
			expect(wf.hasPath('Zep', 'Send a text message')).toBe(true); // ai_memory -> AI Agent -> Send a text message
			expect(wf.hasPath('Anthropic Chat Model', 'Send a text message')).toBe(true); // ai_languageModel -> AI Agent -> Send a text message
			expect(wf.hasPath('AI Agent Tool', 'Send a text message')).toBe(true); // ai_tool -> AI Agent -> Send a text message
			expect(wf.hasPath('Anthropic Chat Model1', 'Send a text message')).toBe(true); // ai_languageModel -> AI Agent Tool -> AI Agent -> Send a text message

			// Test WorkflowDataProxy access from 'Send a text message' to all other nodes
			const proxy = createProxy(workflow, 'Send a text message');

			// These should all work without throwing path detection errors
			expect(() => proxy.$('Telegram Trigger')).not.toThrow();
			expect(() => proxy.$('Typing ...')).not.toThrow();
			expect(() => proxy.$('Switch')).not.toThrow();
			expect(() => proxy.$('Edit Fields')).not.toThrow();
			expect(() => proxy.$('AI Agent')).not.toThrow();
			expect(() => proxy.$('Zep')).not.toThrow();
			expect(() => proxy.$('Anthropic Chat Model')).not.toThrow();
			expect(() => proxy.$('AI Agent Tool')).not.toThrow();
			expect(() => proxy.$('Anthropic Chat Model1')).not.toThrow();
		});
	});
});
