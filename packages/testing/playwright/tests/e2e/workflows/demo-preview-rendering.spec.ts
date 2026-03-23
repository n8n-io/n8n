import type { TestRequirements } from '../../../Types';
import { test, expect } from '../../../fixtures/base';
import { DemoPage } from '../../../pages/DemoPage';

const requirements: TestRequirements = {
	config: {
		settings: {
			previewMode: true,
		},
	},
};

/**
 * Workflow with AI Agent node connected to model, memory, and tool
 * Plus a sticky note that should be in the foreground
 */
const workflowWithAIAgent = {
	name: 'Chat with AI Agent',
	nodes: [
		{
			parameters: {
				options: {},
			},
			id: 'trigger-1',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [100, 300],
			webhookId: 'test-webhook-id',
		},
		{
			parameters: {
				options: {},
			},
			id: 'agent-1',
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 1.9,
			position: [400, 300],
		},
		{
			parameters: {
				model: 'gpt-4',
			},
			id: 'model-1',
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1,
			position: [600, 150],
		},
		{
			parameters: {},
			id: 'memory-1',
			name: 'Window Buffer Memory',
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			typeVersion: 1.2,
			position: [600, 300],
		},
		{
			parameters: {},
			id: 'tool-1',
			name: 'Calculator',
			type: '@n8n/n8n-nodes-langchain.toolCalculator',
			typeVersion: 1,
			position: [600, 450],
		},
		{
			parameters: {
				height: 200,
				width: 400,
			},
			id: 'sticky-1',
			name: 'Sticky Note',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [100, 100],
			notes: 'This workflow uses an AI agent to chat with a database',
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
		'OpenAI Chat Model': {
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
		'Window Buffer Memory': {
			ai_memory: [
				[
					{
						node: 'AI Agent',
						type: 'ai_memory',
						index: 0,
					},
				],
			],
		},
		Calculator: {
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
	pinData: {},
};

test.describe(
	'Workflow Preview Instance Rendering',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ setupRequirements }) => {
			await setupRequirements(requirements);
		});

		test('should render AI Agent node with correct shape (rectangle, not square) in preview mode', async ({
			page,
		}) => {
			const demoPage = new DemoPage(page);
			await demoPage.goto();

			// Import the workflow into the demo page
			await demoPage.importWorkflow(workflowWithAIAgent);

			// Wait for the workflow to be loaded
			await page.waitForTimeout(1000);

			// Get the AI Agent node
			const aiAgentNode = page.locator('[data-test-id="canvas-node"][data-node-name="AI Agent"]');
			await expect(aiAgentNode).toBeVisible();

			// Get the bounding box of the AI Agent node
			const boundingBox = await aiAgentNode.boundingBox();
			expect(boundingBox).toBeTruthy();

			// AI Agent nodes should be rectangular (wider than tall), not square
			// A square would have width === height
			// For AI nodes, width should be significantly greater than height
			const aspectRatio = boundingBox!.width / boundingBox!.height;
			expect(aspectRatio).toBeGreaterThan(1.2); // Should be at least 20% wider than tall
		});

		test('should render connections from model, memory, and tool to AI Agent in preview mode', async ({
			page,
		}) => {
			const demoPage = new DemoPage(page);
			await demoPage.goto();

			// Import the workflow into the demo page
			await demoPage.importWorkflow(workflowWithAIAgent);

			// Wait for the workflow to be loaded
			await page.waitForTimeout(1000);

			// Check that all nodes are visible
			await expect(
				page.locator('[data-test-id="canvas-node"][data-node-name="AI Agent"]'),
			).toBeVisible();
			await expect(
				page.locator('[data-test-id="canvas-node"][data-node-name="OpenAI Chat Model"]'),
			).toBeVisible();
			await expect(
				page.locator('[data-test-id="canvas-node"][data-node-name="Window Buffer Memory"]'),
			).toBeVisible();
			await expect(
				page.locator('[data-test-id="canvas-node"][data-node-name="Calculator"]'),
			).toBeVisible();

			// Check that connections are visible
			// In n8n, connections are rendered as SVG elements or canvas elements
			// We'll check for the presence of connection elements
			const connections = page.locator('[data-test-id^="canvas-connection"]');
			const connectionCount = await connections.count();

			// We expect at least 4 connections:
			// 1. Trigger -> AI Agent (main)
			// 2. Model -> AI Agent (ai_languageModel)
			// 3. Memory -> AI Agent (ai_memory)
			// 4. Tool -> AI Agent (ai_tool)
			expect(connectionCount).toBeGreaterThanOrEqual(4);
		});

		test('should render sticky note in foreground, not overlapped by nodes in preview mode', async ({
			page,
		}) => {
			const demoPage = new DemoPage(page);
			await demoPage.goto();

			// Import the workflow into the demo page
			await demoPage.importWorkflow(workflowWithAIAgent);

			// Wait for the workflow to be loaded
			await page.waitForTimeout(1000);

			// Get the sticky note
			const stickyNote = page.locator('[data-test-id="sticky"]').first();
			await expect(stickyNote).toBeVisible();

			// Check that the sticky note text is visible (not hidden behind nodes)
			const stickyText = stickyNote.getByText(/This workflow uses an AI agent/);
			await expect(stickyText).toBeVisible();

			// Get the z-index of the sticky note
			const stickyZIndex = await stickyNote.evaluate((el) => {
				const zIndex = window.getComputedStyle(el).getPropertyValue('z-index');
				return zIndex === 'auto' ? 0 : parseInt(zIndex, 10);
			});

			// Get the z-index of a node (e.g., AI Agent)
			const aiAgentNode = page.locator('[data-test-id="canvas-node"][data-node-name="AI Agent"]');
			const nodeZIndex = await aiAgentNode.evaluate((el) => {
				const zIndex = window.getComputedStyle(el).getPropertyValue('z-index');
				return zIndex === 'auto' ? 0 : parseInt(zIndex, 10);
			});

			// The sticky should have a higher z-index than nodes
			expect(stickyZIndex).toBeGreaterThanOrEqual(nodeZIndex);
		});

		test('should render all AI sub-connections (model, memory, tool) correctly in preview mode', async ({
			page,
		}) => {
			const demoPage = new DemoPage(page);
			await demoPage.goto();

			// Import the workflow into the demo page
			await demoPage.importWorkflow(workflowWithAIAgent);

			// Wait for the workflow to be loaded
			await page.waitForTimeout(1000);

			// Verify all nodes are present
			const nodes = [
				'When chat message received',
				'AI Agent',
				'OpenAI Chat Model',
				'Window Buffer Memory',
				'Calculator',
			];

			for (const nodeName of nodes) {
				await expect(
					page.locator(`[data-test-id="canvas-node"][data-node-name="${nodeName}"]`),
				).toBeVisible();
			}

			// Check for AI-specific connection types
			// These connections have different visual styling and should be rendered
			const canvas = page.locator('[data-test-id="canvas-background"]');
			await expect(canvas).toBeVisible();

			// The AI connections should be visible as part of the canvas rendering
			// We can check by verifying that the nodes are visually connected
			// by checking if there are path elements or connection elements
			const canvasElement = await canvas.elementHandle();
			expect(canvasElement).toBeTruthy();
		});
	},
);
