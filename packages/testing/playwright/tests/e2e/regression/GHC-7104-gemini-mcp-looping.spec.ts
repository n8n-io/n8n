import { test, expect } from '../../../fixtures/base';
import { nanoid } from 'nanoid';

/**
 * Regression test for GHC-7104: Gemini looping when using MCP Tools
 *
 * Bug description:
 * - When using Gemini model in an AI agent with MCP Client tool
 * - First tool call works correctly
 * - Subsequent tool calls loop/fail instead of completing
 * - Issue does NOT occur with OpenAI or other models, only Gemini
 *
 * Related GitHub issue: https://github.com/n8n-io/n8n/issues/26561
 */

test.describe(
	'GHC-7104: Gemini + MCP Tool Looping Bug',
	{
		annotation: [{ type: 'owner', description: 'AI' }],
	},
	() => {
		test('should handle multiple MCP tool calls with Gemini without looping @flaky', async ({
			n8n,
			api,
		}) => {
			// Create a simple MCP server workflow that provides multiple tools
			const mcpWorkflow = await api.workflows.createWorkflow({
				name: `MCP Test Workflow ${nanoid()}`,
				nodes: [
					{
						parameters: {
							authentication: 'none',
							path: `mcp-test-${nanoid()}`,
						},
						id: 'mcp-trigger',
						name: 'MCP Server Trigger',
						type: '@n8n/n8n-nodes-langchain.mcpTrigger',
						typeVersion: 2,
						position: [300, 300],
					},
					{
						parameters: {
							name: 'get_info',
							description: 'Gets information about a topic',
							specifyInputSchema: true,
							jsonSchemaExample: '{\n\t"topic": "example"\n}',
							jsCode: 'return `Info about ${query.topic}`;',
						},
						id: 'get-info-tool',
						name: 'Get Info Tool',
						type: '@n8n/n8n-nodes-langchain.toolCode',
						typeVersion: 1.1,
						position: [500, 200],
					},
					{
						parameters: {
							name: 'process_data',
							description: 'Processes data from the info',
							specifyInputSchema: true,
							jsonSchemaExample: '{\n\t"data": "example"\n}',
							jsCode: 'return `Processed: ${query.data}`;',
						},
						id: 'process-data-tool',
						name: 'Process Data Tool',
						type: '@n8n/n8n-nodes-langchain.toolCode',
						typeVersion: 1.1,
						position: [500, 400],
					},
					{
						parameters: {
							name: 'finalize',
							description: 'Finalizes the result',
							specifyInputSchema: true,
							jsonSchemaExample: '{\n\t"result": "example"\n}',
							jsCode: 'return `Final: ${query.result}`;',
						},
						id: 'finalize-tool',
						name: 'Finalize Tool',
						type: '@n8n/n8n-nodes-langchain.toolCode',
						typeVersion: 1.1,
						position: [500, 600],
					},
				],
				connections: {
					'Get Info Tool': {
						ai_tool: [
							[
								{
									node: 'MCP Server Trigger',
									type: 'ai_tool',
									index: 0,
								},
							],
						],
					},
					'Process Data Tool': {
						ai_tool: [
							[
								{
									node: 'MCP Server Trigger',
									type: 'ai_tool',
									index: 0,
								},
							],
						],
					},
					'Finalize Tool': {
						ai_tool: [
							[
								{
									node: 'MCP Server Trigger',
									type: 'ai_tool',
									index: 0,
								},
							],
						],
					},
				},
				settings: {
					executionOrder: 'v1',
				},
			});

			await api.workflows.activate(mcpWorkflow.id, mcpWorkflow.versionId!);

			// Get the MCP endpoint URL
			const mcpNode = mcpWorkflow.nodes?.find((n) =>
				n.type.includes('mcpTrigger'),
			) as any;
			const mcpPath = mcpNode.parameters.path as string;
			const mcpEndpoint = `${api.getBaseUrl()}/webhook/${mcpPath}`;

			// Create Gemini API credential (mock for testing)
			const geminiCredential = await api.credentials.createCredential({
				type: 'googlePalmApi',
				name: `Gemini Test ${nanoid()}`,
				data: {
					apiKey: 'test-api-key',
				},
			});

			// Create AI Agent workflow with Gemini + MCP Client
			const agentWorkflowName = `Gemini MCP Agent ${nanoid()}`;
			const agentWorkflow = await api.workflows.createWorkflow({
				name: agentWorkflowName,
				nodes: [
					{
						parameters: {
							options: {},
						},
						id: 'chat-trigger',
						name: 'When chat message received',
						type: '@n8n/n8n-nodes-langchain.chatTrigger',
						typeVersion: 1.1,
						position: [0, 0],
						webhookId: nanoid(),
					},
					{
						parameters: {
							options: {
								maxIterations: 5, // Limit iterations to detect looping
							},
						},
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.9,
						position: [220, 0],
						id: 'ai-agent',
						name: 'AI Agent',
					},
					{
						parameters: {
							modelName: 'models/gemini-2.5-flash',
							options: {
								temperature: 0.7,
							},
						},
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						typeVersion: 1,
						position: [308, 220],
						id: 'gemini-model',
						name: 'Google Gemini Chat Model',
						credentials: {
							googlePalmApi: {
								id: geminiCredential.id,
								name: geminiCredential.name,
							},
						},
					},
					{
						parameters: {
							endpointUrl: mcpEndpoint,
							serverTransport: 'httpStreamable',
							authentication: 'none',
							include: 'all',
						},
						type: '@n8n/n8n-nodes-langchain.mcpClientTool',
						typeVersion: 1.2,
						position: [308, -100],
						id: 'mcp-client',
						name: 'MCP Client',
					},
				],
				connections: {
					'When chat message received': {
						main: [
							[
								{
									node: 'AI Agent',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					'AI Agent': {
						main: [[]],
					},
					'Google Gemini Chat Model': {
						ai_languageModel: [
							[
								{
									node: 'AI Agent',
									type: 'ai_languageModel',
									index: 0,
								},
							],
						],
					},
					'MCP Client': {
						ai_tool: [
							[
								{
									node: 'AI Agent',
									type: 'ai_tool',
									index: 0,
								},
							],
						],
					},
				},
			});

			// Navigate to the workflow
			await n8n.navigate.toWorkflow(agentWorkflow.id);
			await n8n.canvas.clickZoomToFitButton();

			// Open chat modal
			await n8n.canvas.clickManualChatButton();

			// Send a message that requires multiple tool calls
			// This should call: get_info -> process_data -> finalize
			const testMessage =
				'Get information about "weather", then process the data you received, and finally finalize the result';

			await n8n.canvas.logsPanel.sendManualChatMessage(testMessage);

			// Wait for execution to complete
			// BUG: With Gemini, this will loop and hit max iterations (5)
			// With OpenAI or other models, it completes successfully
			await n8n.notifications.waitForNotification(
				/Workflow executed|execution failed|max iterations/i,
				{
					timeout: 30000,
				},
			);

			// Verify the execution completed without hitting max iterations
			// This assertion will FAIL due to the bug
			const notification = await n8n.notifications.getLastNotification();
			expect(notification).not.toContain('max iterations');
			expect(notification).not.toContain('execution failed');

			// Verify we got multiple tool calls (at least 2-3)
			const logEntries = n8n.canvas.logsPanel.getLogEntries();
			const toolCallCount = await logEntries.count();

			// Should have: Chat Trigger + Agent + Gemini Model + at least 2-3 tool executions
			// BUG: Due to looping, we'll see many repeated tool calls
			expect(toolCallCount).toBeGreaterThan(4);
			expect(toolCallCount).toBeLessThan(15); // Should not loop excessively

			// Verify the chat response is present and reasonable
			const chatMessages = n8n.canvas.getManualChatMessages();
			await expect(chatMessages.last()).toBeVisible();

			const lastMessage = await chatMessages.last().textContent();
			expect(lastMessage).toBeTruthy();

			// Clean up
			await n8n.canvas.closeManualChatModal();
		});

		test('should complete multiple MCP tool calls with OpenAI (control test)', async ({
			n8n,
			api,
			services,
		}) => {
			// This test demonstrates that the same workflow works with OpenAI
			// Use proxy service to mock OpenAI responses
			await services.proxy.clearAllExpectations();
			await services.proxy.loadExpectations('langchain');

			// Create a simple MCP server workflow
			const mcpWorkflow = await api.workflows.createWorkflow({
				name: `MCP Control Test ${nanoid()}`,
				nodes: [
					{
						parameters: {
							authentication: 'none',
							path: `mcp-control-${nanoid()}`,
						},
						id: 'mcp-trigger',
						name: 'MCP Server Trigger',
						type: '@n8n/n8n-nodes-langchain.mcpTrigger',
						typeVersion: 2,
						position: [300, 300],
					},
					{
						parameters: {
							name: 'echo',
							description: 'Echoes the input',
							specifyInputSchema: true,
							jsonSchemaExample: '{\n\t"message": "test"\n}',
							jsCode: 'return `Echo: ${query.message}`;',
						},
						id: 'echo-tool',
						name: 'Echo Tool',
						type: '@n8n/n8n-nodes-langchain.toolCode',
						typeVersion: 1.1,
						position: [500, 300],
					},
				],
				connections: {
					'Echo Tool': {
						ai_tool: [
							[
								{
									node: 'MCP Server Trigger',
									type: 'ai_tool',
									index: 0,
								},
							],
						],
					},
				},
			});

			await api.workflows.activate(mcpWorkflow.id, mcpWorkflow.versionId!);

			const mcpNode = mcpWorkflow.nodes?.find((n) =>
				n.type.includes('mcpTrigger'),
			) as any;
			const mcpPath = mcpNode.parameters.path as string;
			const mcpEndpoint = `${api.getBaseUrl()}/webhook/${mcpPath}`;

			// Create AI Agent workflow with OpenAI + MCP Client
			await n8n.start.fromBlankCanvas();

			// Add nodes via canvas
			await n8n.canvas.addNode('AI Agent', { closeNDV: true });

			// Add OpenAI Chat Model
			await n8n.canvas.addSupplementalNodeToParent(
				'OpenAI Chat Model',
				'ai_languageModel',
				'AI Agent',
				{ closeNDV: false },
			);

			// Create OpenAI credentials
			await n8n.credentialsComposer.createFromNdv({
				apiKey: 'test-key',
			});
			await n8n.ndv.clickBackToCanvasButton();

			// Add MCP Client
			await n8n.canvas.addSupplementalNodeToParent('MCP Client', 'ai_tool', 'AI Agent', {
				closeNDV: false,
			});

			// Configure MCP Client
			await n8n.ndv.setParameterInputByName('endpointUrl', mcpEndpoint);

			await n8n.ndv.clickBackToCanvasButton();

			// Open chat and send message
			await n8n.canvas.clickManualChatButton();
			await n8n.canvas.logsPanel.sendManualChatMessage('Hello!');

			// Wait for successful execution
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully', {
				timeout: 10000,
			});

			// Verify chat response
			const chatMessages = n8n.canvas.getManualChatMessages();
			await expect(chatMessages).toHaveCount(2); // User message + bot response
			await expect(chatMessages.last()).toBeVisible();
		});
	},
);
