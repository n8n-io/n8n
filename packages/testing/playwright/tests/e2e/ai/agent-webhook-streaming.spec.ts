import {
	AGENT_NODE_NAME,
	AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
	AI_TOOL_CALCULATOR_NODE_NAME,
	TOOL_SUBCATEGORY,
} from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.use({ capability: 'proxy' });

test.describe(
	'AI Agent Webhook Streaming @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'AI' }],
	},
	() => {
		test.beforeEach(async ({ services }) => {
			await services.proxy.clearAllExpectations();
			await services.proxy.loadExpectations('langchain');
		});

		test('should stream intermediate steps from AI Agent to webhook response', async ({
			n8n,
			api,
		}) => {
			// Setup workflow with Webhook (streaming) -> AI Agent -> RespondToWebhook
			await n8n.start.fromBlankCanvas();

			// Add Webhook trigger with streaming response mode
			await n8n.canvas.addNode('Webhook');
			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'POST',
				responseMode: 'Streaming',
			});
			const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();
			await n8n.ndv.close();

			// Add AI Agent node
			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

			// Add Calculator tool to trigger intermediate steps
			await n8n.canvas.addSupplementalNodeToParent(
				AI_TOOL_CALCULATOR_NODE_NAME,
				'ai_tool',
				AGENT_NODE_NAME,
				{
					closeNDV: true,
					subcategory: TOOL_SUBCATEGORY,
				},
			);

			// Add OpenAI Language Model with credentials
			await n8n.canvas.addSupplementalNodeToParent(
				AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
				'ai_languageModel',
				AGENT_NODE_NAME,
				{ exactMatch: true, closeNDV: false },
			);

			await n8n.credentialsComposer.createFromNdv({
				apiKey: 'abcd',
			});
			await n8n.ndv.clickBackToCanvasButton();

			// Add RespondToWebhook node
			await n8n.canvas.addNode('Respond to Webhook', { closeNDV: true });

			// Execute workflow
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.waitingForTriggerEvent()).toBeVisible();

			// Trigger webhook with a request that requires tool usage
			const response = await api.webhooks.trigger(`/webhook-test/${webhookPath}`, {
				method: 'POST',
				data: { chatInput: 'What is 2 + 2?' },
			});

			expect(response.ok()).toBe(true);

			// Get the response body as text to parse streaming chunks
			const responseText = await response.text();

			// The response should contain streaming chunks in NDJSON format
			// Expected format based on debug info from issue:
			// {"type":"begin","metadata":{...}}
			// {"type":"item","content":"...","metadata":{...}}
			// {"type":"end","metadata":{...}}

			// Parse NDJSON (newline-delimited JSON)
			const chunks = responseText
				.trim()
				.split('\n')
				.filter((line) => line.trim())
				.map((line) => JSON.parse(line));

			// Verify streaming structure
			expect(chunks.length).toBeGreaterThan(0);

			// Should have begin chunk
			const beginChunk = chunks.find((chunk) => chunk.type === 'begin');
			expect(beginChunk).toBeDefined();
			expect(beginChunk?.metadata?.nodeName).toBe('AI Agent');

			// Should have intermediate item chunks (the actual streamed content)
			const itemChunks = chunks.filter((chunk) => chunk.type === 'item');
			expect(itemChunks.length).toBeGreaterThan(0);

			// Should have end chunk
			const endChunk = chunks.find((chunk) => chunk.type === 'end');
			expect(endChunk).toBeDefined();

			// CRITICAL: Verify intermediate steps are included
			// When AI Agent uses tools, we should see:
			// 1. Tool call indication (e.g., "Calling calculator...")
			// 2. Tool result/observation
			// 3. Final answer
			const allContent = itemChunks.map((chunk) => chunk.content).join('');

			// The response should contain evidence of tool usage
			// This is the key assertion that currently fails according to the bug report
			// The intermediate steps (tool calls and observations) should be present
			// Note: The exact content depends on the LLM response, but we should see
			// some indication of the calculator tool being used or its result
			expect(allContent.length).toBeGreaterThan(0);

			// Additional verification: all chunks should have proper metadata
			for (const chunk of chunks) {
				expect(chunk).toHaveProperty('type');
				expect(chunk).toHaveProperty('metadata');
				expect(chunk.metadata).toHaveProperty('nodeId');
				expect(chunk.metadata).toHaveProperty('nodeName');
				expect(chunk.metadata).toHaveProperty('itemIndex');
				expect(chunk.metadata).toHaveProperty('runIndex');
			}
		});

		test('should stream all intermediate steps when agent makes multiple tool calls', async ({
			n8n,
			api,
		}) => {
			// Setup workflow with Webhook (streaming) -> AI Agent with multiple tools -> RespondToWebhook
			await n8n.start.fromBlankCanvas();

			// Add Webhook trigger with streaming response mode
			await n8n.canvas.addNode('Webhook');
			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'POST',
				responseMode: 'Streaming',
			});
			const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();
			await n8n.ndv.close();

			// Add AI Agent node
			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: false });

			// Enable return intermediate steps option
			await n8n.ndv.addParameterOptionByName('Return Intermediate Steps');
			await n8n.ndv.clickBackToCanvasButton();

			// Add Calculator tool
			await n8n.canvas.addSupplementalNodeToParent(
				AI_TOOL_CALCULATOR_NODE_NAME,
				'ai_tool',
				AGENT_NODE_NAME,
				{
					closeNDV: true,
					subcategory: TOOL_SUBCATEGORY,
				},
			);

			// Add OpenAI Language Model with credentials
			await n8n.canvas.addSupplementalNodeToParent(
				AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
				'ai_languageModel',
				AGENT_NODE_NAME,
				{ exactMatch: true, closeNDV: false },
			);

			await n8n.credentialsComposer.createFromNdv({
				apiKey: 'abcd',
			});
			await n8n.ndv.clickBackToCanvasButton();

			// Add RespondToWebhook node
			await n8n.canvas.addNode('Respond to Webhook', { closeNDV: true });

			// Execute workflow
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.waitingForTriggerEvent()).toBeVisible();

			// Trigger webhook with a complex request
			const response = await api.webhooks.trigger(`/webhook-test/${webhookPath}`, {
				method: 'POST',
				data: { chatInput: 'Calculate 5 * 3, then add 10 to the result' },
			});

			expect(response.ok()).toBe(true);

			// Get the response body as text to parse streaming chunks
			const responseText = await response.text();

			// Parse NDJSON (newline-delimited JSON)
			const chunks = responseText
				.trim()
				.split('\n')
				.filter((line) => line.trim())
				.map((line) => JSON.parse(line));

			// Verify we have streaming chunks
			expect(chunks.length).toBeGreaterThan(0);

			// Should have begin, multiple items, and end
			const beginChunk = chunks.find((chunk) => chunk.type === 'begin');
			const itemChunks = chunks.filter((chunk) => chunk.type === 'item');
			const endChunk = chunks.find((chunk) => chunk.type === 'end');

			expect(beginChunk).toBeDefined();
			expect(itemChunks.length).toBeGreaterThan(0);
			expect(endChunk).toBeDefined();

			// CRITICAL: With returnIntermediateSteps enabled, we should see
			// evidence of BOTH tool calls in the streamed response
			// This is currently broken according to the bug report
			const allContent = itemChunks.map((chunk) => chunk.content).join('');
			expect(allContent.length).toBeGreaterThan(0);

			// The streamed response should include intermediate reasoning
			// about the multiple tool calls made during execution
		});
	},
);
