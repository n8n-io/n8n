// Using string literals for connection types to avoid import issues
import { Workflow } from '../src/workflow';
import { WorkflowDataProxy } from '../src/workflow-data-proxy';
import * as Helpers from './helpers';

describe('Workflow Pattern Impact - Demonstrating issues with reverted code', () => {
	describe('Multi-Agent AI Workflows', () => {
		test('should fail: Multiple AI agents cannot access each other via path traversal', () => {
			// Pattern: Agent A -> Tool -> Agent B workflow
			// Impact: Agent B cannot access Agent A's data via $fromAI

			const workflow = {
				id: 'multi-agent-test',
				name: 'Multi-Agent Pattern Test',
				nodes: [
					{
						parameters: {},
						id: 'agent-a',
						name: 'Agent A',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.8,
						position: [0, 0],
					},
					{
						parameters: {},
						id: 'shared-tool',
						name: 'Shared Tool',
						type: 'n8n-nodes-base.googleSheetsTool',
						typeVersion: 4.5,
						position: [200, 0],
					},
					{
						parameters: {},
						id: 'agent-b',
						name: 'Agent B',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.8,
						position: [400, 0],
					},
				],
				connections: {
					'Agent A': {
						main: [[{ node: 'Shared Tool', type: 'main', index: 0 }]],
					},
					'Shared Tool': {
						// AI tool connections that reverted code cannot traverse
						ai_tool: [
							[{ node: 'Agent A', type: 'ai_tool', index: 0 }],
							[{ node: 'Agent B', type: 'ai_tool', index: 0 }],
						],
						main: [[{ node: 'Agent B', type: 'main', index: 0 }]],
					},
				},
			};

			const wf = new Workflow({
				id: workflow.id,
				name: workflow.name,
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: false,
				nodeTypes: Helpers.NodeTypes(),
				settings: {},
			});

			// This should work but fails due to AI tool connection traversal bug
			const proxy = new WorkflowDataProxy(
				wf,
				null, // No execution data - forces path traversal
				0,
				0,
				'Agent B',
				[], // Empty connection data - triggers nodeDataGetter bug
				{},
				'manual',
				{},
				undefined,
				undefined,
				undefined,
				'ai_tool',
			).getDataProxy();

			// This demonstrates the bug: Agent B cannot find Agent A via tool connections
			expect(() => proxy.$('Agent A')).toThrow(/no connection to referenced node/);
		});

		test('should fail: AI agent memory cannot be accessed across tool boundaries', () => {
			// Pattern: Agent with Memory -> Tool -> Another context trying to access memory
			// Impact: Memory data is not accessible via path traversal in complex workflows

			const workflow = {
				nodes: [
					{
						id: 'memory-node',
						name: 'Agent Memory',
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						typeVersion: 1.3,
					},
					{
						id: 'agent-with-memory',
						name: 'Agent With Memory',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.8,
					},
					{
						id: 'tool-node',
						name: 'Tool Node',
						type: 'n8n-nodes-base.googleSheetsTool',
						typeVersion: 4.5,
					},
				],
				connections: {
					'Agent Memory': {
						['ai_memory']: [[{ node: 'Agent With Memory', type: 'ai_memory', index: 0 }]],
					},
					'Tool Node': {
						['ai_tool']: [[{ node: 'Agent With Memory', type: 'ai_tool', index: 0 }]],
					},
				},
			};

			const wf = new Workflow({
				id: 'memory-test',
				name: 'Memory Access Test',
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: false,
				nodeTypes: Helpers.NodeTypes(),
			});

			// Try to access memory from tool context - should fail
			const proxy = new WorkflowDataProxy(
				wf,
				null,
				0,
				0,
				'Tool Node',
				[],
				{},
				'manual',
				{},
				undefined,
				undefined,
				undefined,
				'ai_tool',
			).getDataProxy();

			expect(() => proxy.$('Agent Memory')).toThrow();
		});
	});

	describe('Tool Chain Workflows', () => {
		test('should fail: Sequential AI tools cannot pass data between each other', () => {
			// Pattern: Tool A -> Agent -> Tool B workflow
			// Impact: Tool B cannot access Tool A's output via $fromAI

			const workflow = {
				nodes: [
					{
						id: 'tool-a',
						name: 'Calendar Tool',
						type: 'n8n-nodes-base.googleCalendarTool',
						typeVersion: 1.3,
						parameters: {
							start: '={{ $fromAI("start_time") }}',
						},
					},
					{
						id: 'coordinator-agent',
						name: 'Coordinator Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.8,
					},
					{
						id: 'tool-b',
						name: 'Sheets Tool',
						type: 'n8n-nodes-base.googleSheetsTool',
						typeVersion: 4.5,
						parameters: {
							columns: {
								value: {
									event_date: '={{ $fromAI("start_time") }}', // Should access Tool A's data
								},
							},
						},
					},
				],
				connections: {
					'Calendar Tool': {
						['ai_tool']: [[{ node: 'Coordinator Agent', type: 'ai_tool', index: 0 }]],
					},
					'Sheets Tool': {
						['ai_tool']: [[{ node: 'Coordinator Agent', type: 'ai_tool', index: 0 }]],
					},
				},
			};

			const wf = new Workflow({
				id: 'tool-chain-test',
				name: 'Tool Chain Test',
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: false,
				nodeTypes: Helpers.NodeTypes(),
			});

			// Sheets Tool trying to access Calendar Tool data should fail
			const proxy = new WorkflowDataProxy(
				wf,
				null,
				0,
				0,
				'Sheets Tool',
				[],
				{},
				'manual',
				{},
				undefined,
				undefined,
				undefined,
				'ai_tool',
			).getDataProxy();

			expect(() => proxy.$('Calendar Tool')).toThrow();
		});

		test('should fail: Parallel AI tools cannot share context in the same agent', () => {
			// Pattern: Multiple tools connected to same agent in parallel
			// Impact: Tools cannot see each other's outputs during agent execution

			const workflow = {
				nodes: [
					{
						id: 'wikipedia-tool',
						name: 'Wikipedia Tool',
						type: '@n8n/n8n-nodes-langchain.toolWikipedia',
						typeVersion: 1,
					},
					{
						id: 'calculator-tool',
						name: 'Calculator Tool',
						type: '@n8n/n8n-nodes-langchain.toolCalculator',
						typeVersion: 1,
					},
					{
						id: 'research-agent',
						name: 'Research Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.8,
					},
					{
						id: 'summary-tool',
						name: 'Summary Tool',
						type: 'n8n-nodes-base.googleSheetsTool',
						typeVersion: 4.5,
						parameters: {
							columns: {
								value: {
									wiki_data: '={{ $fromAI("wiki_result") }}', // Should access Wikipedia Tool
									calc_result: '={{ $fromAI("calculation") }}', // Should access Calculator Tool
								},
							},
						},
					},
				],
				connections: {
					'Wikipedia Tool': {
						['ai_tool']: [[{ node: 'Research Agent', type: 'ai_tool', index: 0 }]],
					},
					'Calculator Tool': {
						['ai_tool']: [[{ node: 'Research Agent', type: 'ai_tool', index: 0 }]],
					},
					'Summary Tool': {
						['ai_tool']: [[{ node: 'Research Agent', type: 'ai_tool', index: 0 }]],
					},
				},
			};

			const wf = new Workflow({
				id: 'parallel-tools-test',
				name: 'Parallel Tools Test',
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: false,
				nodeTypes: Helpers.NodeTypes(),
			});

			// Summary Tool should be able to access other tools' data but can't
			const proxy = new WorkflowDataProxy(
				wf,
				null,
				0,
				0,
				'Summary Tool',
				[],
				{},
				'manual',
				{},
				undefined,
				undefined,
				undefined,
				'ai_tool',
			).getDataProxy();

			expect(() => proxy.$('Wikipedia Tool')).toThrow();
			expect(() => proxy.$('Calculator Tool')).toThrow();
		});
	});

	describe('Nested AI Workflows', () => {
		test('should fail: Nested agents cannot access parent agent context', () => {
			// Pattern: Parent Agent -> Child Agent -> Tool workflow
			// Impact: Tool in child context cannot access parent agent data

			const workflow = {
				nodes: [
					{
						id: 'parent-agent',
						name: 'Parent Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.8,
					},
					{
						id: 'child-agent',
						name: 'Child Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.8,
					},
					{
						id: 'nested-tool',
						name: 'Nested Tool',
						type: 'n8n-nodes-base.googleSheetsTool',
						typeVersion: 4.5,
						parameters: {
							columns: {
								value: {
									parent_context: '={{ $fromAI("parent_data") }}', // Should access parent
								},
							},
						},
					},
				],
				connections: {
					'Parent Agent': {
						main: [[{ node: 'Child Agent', type: 'main', index: 0 }]],
					},
					'Child Agent': {
						main: [[{ node: 'Nested Tool', type: 'main', index: 0 }]],
					},
					'Nested Tool': {
						['ai_tool']: [[{ node: 'Child Agent', type: 'ai_tool', index: 0 }]],
					},
				},
			};

			const wf = new Workflow({
				id: 'nested-agents-test',
				name: 'Nested Agents Test',
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: false,
				nodeTypes: Helpers.NodeTypes(),
			});

			// Nested tool cannot traverse back to parent agent
			const proxy = new WorkflowDataProxy(
				wf,
				null,
				0,
				0,
				'Nested Tool',
				[],
				{},
				'manual',
				{},
				undefined,
				undefined,
				undefined,
				'ai_tool',
			).getDataProxy();

			expect(() => proxy.$('Parent Agent')).toThrow();
		});
	});

	describe('Manual Execution Scenarios', () => {
		test('should fail: Manual AI workflow execution with trimmed data', () => {
			// Pattern: Manual execution where some nodes are trimmed from workflow
			// Impact: AI tools cannot find referenced nodes that exist but are trimmed

			const fullWorkflow = {
				nodes: [
					{
						id: 'data-source',
						name: 'Data Source',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
					},
					{
						id: 'preprocessor',
						name: 'Preprocessor',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
					},
					{
						id: 'ai-tool',
						name: 'AI Tool',
						type: 'n8n-nodes-base.googleSheetsTool',
						typeVersion: 4.5,
						parameters: {
							columns: {
								value: {
									processed_data: '={{ $fromAI("processed_value") }}', // References Preprocessor
								},
							},
						},
					},
					{
						id: 'final-agent',
						name: 'Final Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.8,
					},
				],
				connections: {
					'Data Source': {
						main: [[{ node: 'Preprocessor', type: 'main', index: 0 }]],
					},
					Preprocessor: {
						main: [[{ node: 'Final Agent', type: 'main', index: 0 }]],
					},
					'AI Tool': {
						['ai_tool']: [[{ node: 'Final Agent', type: 'ai_tool', index: 0 }]],
					},
				},
			};

			// Simulate trimmed workflow (common in manual execution)
			const trimmedWorkflow = {
				...fullWorkflow,
				nodes: fullWorkflow.nodes.filter((n) => n.id !== 'Data Source'), // Remove trigger
			};

			const wf = new Workflow({
				id: 'manual-exec-test',
				name: 'Manual Execution Test',
				nodes: trimmedWorkflow.nodes,
				connections: trimmedWorkflow.connections,
				active: false,
				nodeTypes: Helpers.NodeTypes(),
			});

			// AI Tool trying to access Preprocessor in trimmed context should fail
			const proxy = new WorkflowDataProxy(
				wf,
				null,
				0,
				0,
				'AI Tool',
				[],
				{},
				'manual',
				{},
				undefined,
				undefined,
				undefined,
				'ai_tool',
			).getDataProxy();

			expect(() => proxy.$('Preprocessor')).toThrow();
		});

		test('should fail: AI workflow error messages are not user-friendly', () => {
			// Pattern: User gets generic error instead of helpful AI-specific error
			// Impact: Poor UX for AI workflow debugging

			const workflow = {
				nodes: [
					{
						id: 'disconnected-tool',
						name: 'Disconnected Tool',
						type: 'n8n-nodes-base.googleSheetsTool',
						typeVersion: 4.5,
						parameters: {
							columns: {
								value: {
									missing_data: '={{ $fromAI("nonexistent") }}', // References non-existent data
								},
							},
						},
					},
					{
						id: 'isolated-agent',
						name: 'Isolated Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.8,
					},
				],
				connections: {
					// No connections between nodes - isolated
				},
			};

			const wf = new Workflow({
				id: 'error-message-test',
				name: 'Error Message Test',
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: false,
				nodeTypes: Helpers.NodeTypes(),
			});

			const proxy = new WorkflowDataProxy(
				wf,
				null,
				0,
				0,
				'Disconnected Tool',
				[],
				{},
				'manual',
				{},
				undefined,
				undefined,
				undefined,
				'ai_tool',
			).getDataProxy();

			// Should get generic unhelpful error instead of AI-specific guidance
			let caughtError: Error | null = null;
			try {
				proxy.$('Isolated Agent');
			} catch (error) {
				caughtError = error as Error;
			}

			expect(caughtError).toBeDefined();
			// Current behavior: generic error message
			expect(caughtError!.message).not.toContain('AI tool connection');
			expect(caughtError!.message).not.toContain('Make sure the node you referenced is connected');
			// Shows the problem: no AI-specific error guidance
		});
	});

	describe('Complex AI Workflow Patterns', () => {
		test('should fail: Multi-step AI workflow with branching logic', () => {
			// Pattern: Agent -> Multiple Tools -> Conditional Logic -> Final Processing
			// Impact: Later stages cannot access early stage data through complex paths

			const workflow = {
				nodes: [
					{
						id: 'input-agent',
						name: 'Input Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.8,
					},
					{
						id: 'analysis-tool',
						name: 'Analysis Tool',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
					},
					{
						id: 'condition-node',
						name: 'Condition',
						type: 'n8n-nodes-base.if',
						typeVersion: 2,
					},
					{
						id: 'branch-a-tool',
						name: 'Branch A Tool',
						type: 'n8n-nodes-base.googleSheetsTool',
						typeVersion: 4.5,
					},
					{
						id: 'branch-b-tool',
						name: 'Branch B Tool',
						type: 'n8n-nodes-base.googleCalendarTool',
						typeVersion: 1.3,
					},
					{
						id: 'final-processor',
						name: 'Final Processor',
						type: 'n8n-nodes-base.googleSheetsTool',
						typeVersion: 4.5,
						parameters: {
							columns: {
								value: {
									original_input: '={{ $fromAI("input_data") }}', // Should reach Input Agent
									analysis_result: '={{ $fromAI("analysis") }}', // Should reach Analysis Tool
								},
							},
						},
					},
				],
				connections: {
					'Input Agent': {
						main: [[{ node: 'Analysis Tool', type: 'main', index: 0 }]],
					},
					'Analysis Tool': {
						['ai_tool']: [[{ node: 'Input Agent', type: 'ai_tool', index: 0 }]],
						main: [[{ node: 'Condition', type: 'main', index: 0 }]],
					},
					Condition: {
						main: [
							[{ node: 'Branch A Tool', type: 'main', index: 0 }],
							[{ node: 'Branch B Tool', type: 'main', index: 0 }],
						],
					},
					'Branch A Tool': {
						main: [[{ node: 'Final Processor', type: 'main', index: 0 }]],
					},
					'Branch B Tool': {
						main: [[{ node: 'Final Processor', type: 'main', index: 0 }]],
					},
				},
			};

			const wf = new Workflow({
				id: 'complex-workflow-test',
				name: 'Complex Workflow Test',
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: false,
				nodeTypes: Helpers.NodeTypes(),
			});

			// Final Processor cannot traverse complex path back to Input Agent
			const proxy = new WorkflowDataProxy(
				wf,
				null,
				0,
				0,
				'Final Processor',
				[],
				{},
				'manual',
				{},
				undefined,
				undefined,
				undefined,
				'main',
			).getDataProxy();

			expect(() => proxy.$('Input Agent')).toThrow();
			expect(() => proxy.$('Analysis Tool')).toThrow();
		});
	});
});
