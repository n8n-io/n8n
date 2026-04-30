/**
 * Bug N8N-9955: Execution data in agent execution never loads
 *
 * Description:
 * When executing a workflow with an AI Agent node, the execution data
 * in the logs panel never loads, leaving the panel empty or in a loading state.
 *
 * Expected: Log entries should be visible after agent execution completes
 * Actual: Execution data doesn't load in the logs panel
 *
 * Reference: https://linear.app/n8n/issue/N8N-9955
 */

import { test, expect } from '../../../fixtures/base';
import { nanoid } from 'nanoid';

test.use({
	capability: {
		services: ['proxy'],
		env: {
			N8N_COMMUNITY_PACKAGES_ENABLED: 'false',
		},
	},
});

test.describe(
	'N8N-9955: Agent execution data loading @capability:proxy',
	{
		annotation: [
			{ type: 'owner', description: 'AI' },
			{ type: 'issue', description: 'N8N-9955' },
		],
	},
	() => {
		test.beforeEach(async ({ n8n, services }) => {
			await services.proxy.clearAllExpectations();
			await services.proxy.loadExpectations('langchain');
		});

		test('should load execution data for AI Agent workflow', async ({ n8n }) => {
			// Create a new workflow with AI Agent
			const workflowName = `Agent Workflow ${nanoid()}`;
			await n8n.start.fromBlankCanvas(workflowName);

			// Add Manual Chat Trigger
			await n8n.canvas.addNode('When chat message received', { closeNDV: true });

			// Add AI Agent node
			await n8n.canvas.addNode('AI Agent', { closeNDV: true });

			// Add OpenAI Language Model to Agent
			await n8n.canvas.addSupplementalNodeToParent(
				'OpenAI Chat Model',
				'ai_languageModel',
				'AI Agent',
				{ exactMatch: true, closeNDV: false },
			);

			// Create credential for OpenAI
			await n8n.credentialsComposer.createFromNdv({
				apiKey: 'test-api-key',
			});
			await n8n.ndv.clickBackToCanvasButton();

			// Open logs panel
			await n8n.canvas.logsPanel.open();

			// Verify logs panel is open but empty before execution
			await expect(n8n.canvas.logsPanel.getLogEntries()).toHaveCount(0);

			// Execute the workflow via chat
			await n8n.canvas.logsPanel.sendManualChatMessage('Hello, test!');

			// Wait for execution to complete
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully', {
				timeout: 10000,
			});

			// BUG REPRODUCTION: This assertion should fail if the bug exists
			// The execution data should load and show log entries for:
			// 1. When chat message received
			// 2. AI Agent
			// 3. OpenAI Chat Model (supplemental node)
			await expect(n8n.canvas.logsPanel.getLogEntries().first()).toBeVisible({
				timeout: 5000,
			});

			// Verify we have at least the agent node in logs
			const logEntries = n8n.canvas.logsPanel.getLogEntries();
			await expect(logEntries).not.toHaveCount(0);

			// Verify the agent node appears in the logs
			await expect(
				logEntries.filter({ hasText: 'AI Agent' }).or(logEntries.filter({ hasText: 'Agent' })),
			).toBeVisible();

			// Verify execution data is actually loaded (not just placeholder UI)
			// by checking that we can select a log entry and see its output
			await n8n.canvas.logsPanel.getLogEntries().first().click();
			await expect(n8n.canvas.logsPanel.outputPanel.get()).toBeVisible();
		});

		test('should load execution data after navigating to existing agent execution', async ({
			n8n,
			api,
		}) => {
			// Import the test workflow
			const workflow = await api.workflows.importWorkflow('Workflow_ai_agent.json');

			// Create Anthropic credential for the workflow
			const credential = await api.credentials.createCredential({
				name: `Anthropic cred ${nanoid()}`,
				type: 'anthropicApi',
				data: { apiKey: process.env.ANTHROPIC_API_KEY ?? 'mock-key' },
			});

			// Navigate to the workflow
			await n8n.navigate.toWorkflow(workflow.id);

			// Open the E2E Chat Model node to set credential
			await n8n.canvas.openNode('E2E Chat Model');
			await n8n.ndv.getCredentialSelect().selectOption(credential.name);
			await n8n.ndv.close();

			// Open logs panel
			await n8n.canvas.logsPanel.open();

			// Execute workflow
			await n8n.canvas.logsPanel.sendManualChatMessage('Test message');

			// Wait for execution to complete
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully', {
				timeout: 10000,
			});

			// Get the execution ID from the current execution
			const executionId = await n8n.page.evaluate(() => {
				// Access the workflows store to get current execution ID
				const workflowsStore = (window as any).__stores?.workflows;
				return workflowsStore?.workflowExecutionData?.id;
			});

			expect(executionId).toBeDefined();

			// Navigate away and back to simulate the bug scenario
			await n8n.navigate.toWorkflows();
			await n8n.navigate.toWorkflow(workflow.id);

			// BUG REPRODUCTION: Load the execution
			// In the bug scenario, navigating to a past agent execution shows empty logs
			await n8n.page.goto(
				`/workflow/${workflow.id}/executions/${executionId}?projectId=${workflow.homeProject.id}`,
			);

			// Wait for page to load
			await n8n.canvas.logsPanel.waitForLogsPanelToBeVisible();

			// BUG: Execution data should be visible but it never loads
			await expect(n8n.canvas.logsPanel.getLogEntries().first()).toBeVisible({
				timeout: 10000,
			});

			// Verify we have log entries
			const logEntries = n8n.canvas.logsPanel.getLogEntries();
			await expect(logEntries).not.toHaveCount(0);

			// Verify we can see the agent execution data
			await expect(
				logEntries
					.filter({ hasText: 'AI Agent' })
					.or(logEntries.filter({ hasText: 'E2E Chat Model' })),
			).toBeVisible();
		});
	},
);
