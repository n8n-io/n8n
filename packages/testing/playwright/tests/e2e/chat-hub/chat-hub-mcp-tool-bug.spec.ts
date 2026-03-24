import { test, expect } from './fixtures';
import type { Route } from '@playwright/test';

test.describe(
	'MCP Client Tool dynamic options @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Chat' }],
	},
	() => {
		test('should send non-null parameters when fetching tool options in Chat Hub', async ({
			n8n,
			page,
			anthropicCredential: _,
		}) => {
			// Track the request payload for dynamic node parameter options
			let capturedPayload: Record<string, unknown> | null = null;

			await page.route('**/rest/dynamic-node-parameters/options**', async (route: Route) => {
				const request = route.request();
				const postData = request.postData();

				if (postData) {
					capturedPayload = JSON.parse(postData);
				}

				// Continue with the request (it will fail, but we're just testing the payload)
				await route.continue();
			});

			// Navigate to Chat Hub
			await n8n.navigate.toChatHub();
			await n8n.chatHubChat.dismissWelcomeScreen();

			// Open Personal Agents view
			await n8n.chatHubSidebar.getPersonalAgentsLink().click();
			await expect(page).toHaveURL(/.*chat-hub\/personal-agents$/);

			// Create a new agent
			await n8n.chatHubPersonalAgents.getNewAgentButton().click();

			// Wait for modal to open
			await expect(n8n.chatHubPersonalAgents.agentModal.getRoot()).toBeVisible();

			// Fill in agent name
			const agentName = `Test Agent ${crypto.randomUUID().slice(0, 8)}`;
			await n8n.chatHubPersonalAgents.agentModal.getNameInput().fill(agentName);

			// Open tools manager
			await n8n.chatHubPersonalAgents.agentModal.getAddToolsButton().click();
			await expect(n8n.chatHubChat.toolsModal.getRoot()).toBeVisible();

			// Add MCP Client tool
			await n8n.chatHubChat.toolsModal.getAddButton('MCP Client').click();

			// Fill in the endpoint URL
			const endpointUrl = 'https://example.com/mcp';
			const endpointInput = n8n.chatHubChat.toolsModal.getParameterInput('endpointUrl');
			await endpointInput.locator('input').fill(endpointUrl);

			// Select server transport (should default to httpStreamable for version 1.2+)
			const transportSelect = n8n.chatHubChat.toolsModal.getParameterInput('serverTransport');
			await expect(transportSelect).toBeVisible();

			// Change "Tools to Include" from "All" to "Selected"
			// This should trigger loading of dynamic options for includeTools
			const includeSelect = n8n.chatHubChat.toolsModal.getParameterInput('include');
			await includeSelect.click();

			// Select "Selected" option
			await n8n.chatHubChat.getVisiblePopoverOption('Selected').click();

			// Wait for the dynamic options request to be made
			await page.waitForTimeout(1000);

			// Verify the request was captured
			expect(capturedPayload).not.toBeNull();

			// The bug is that currentNodeParameters are sent as null
			// Instead of the actual values that were entered in the form
			const currentNodeParameters = capturedPayload?.currentNodeParameters as Record<
				string,
				unknown
			>;

			expect(currentNodeParameters).toBeDefined();

			// BUG: These assertions will FAIL because the frontend sends null values
			// instead of the actual form values
			expect(currentNodeParameters?.endpointUrl).not.toBeNull();
			expect(currentNodeParameters?.endpointUrl).toBe(endpointUrl);
			expect(currentNodeParameters?.serverTransport).not.toBeNull();
			expect(currentNodeParameters?.serverTransport).toBe('httpStreamable');
		});

		test('MCP Client Tool works correctly in regular workflow editor', async ({
			n8n,
			page,
		}) => {
			// Track the request payload for comparison
			let capturedPayload: Record<string, unknown> | null = null;

			await page.route('**/rest/dynamic-node-parameters/options**', async (route: Route) => {
				const request = route.request();
				const postData = request.postData();

				if (postData) {
					capturedPayload = JSON.parse(postData);
				}

				await route.continue();
			});

			// Create a new workflow
			const workflow = await n8n.api.workflows.createWorkflow({
				name: `Test Workflow ${crypto.randomUUID().slice(0, 8)}`,
			});

			await n8n.navigate.toWorkflow(workflow.id);
			await n8n.canvas.addNodeFromNodeCreatorPanel('AI Agent');

			// Add MCP Client Tool to the AI Agent
			await n8n.canvas.openNode('AI Agent');
			await n8n.ndv.getters.nodeExecuteButton().click();
			await n8n.ndv.actions.switchOutputTab('tools');

			// Add MCP Client Tool
			await n8n.ndv.getters.addToolButton().click();
			await n8n.nodeCreatorPanel.searchForItem('MCP Client Tool');
			await n8n.nodeCreatorPanel.getCreatorItemByText('MCP Client Tool').click();

			// Wait for the node to be added and selected
			await page.waitForTimeout(500);

			// Fill in the endpoint URL
			const endpointUrl = 'https://example.com/mcp';
			await n8n.ndv.getters.parameterInput('endpointUrl').locator('input').fill(endpointUrl);

			// Change "Tools to Include" from "All" to "Selected"
			await n8n.ndv.getters.parameterInput('include').click();
			await page.getByRole('option', { name: 'Selected' }).click();

			// Wait for the dynamic options request
			await page.waitForTimeout(1000);

			// Verify the request was captured
			expect(capturedPayload).not.toBeNull();

			const currentNodeParameters = capturedPayload?.currentNodeParameters as Record<
				string,
				unknown
			>;

			expect(currentNodeParameters).toBeDefined();

			// In the regular workflow editor, these should work correctly
			expect(currentNodeParameters?.endpointUrl).not.toBeNull();
			expect(currentNodeParameters?.endpointUrl).toBe(endpointUrl);
			expect(currentNodeParameters?.serverTransport).not.toBeNull();
		});
	},
);
