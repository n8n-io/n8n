import { test, expect } from '../../../fixtures/base';
import { nanoid } from 'nanoid';

/**
 * Regression test for NODE-4587: Chat Trigger - Public Chat Broken
 *
 * Bug: When using Chat Trigger node with public chat enabled and "When Last Node Finishes"
 * response mode, the chat UI loads and accepts messages but never returns a response.
 *
 * Expected: After sending a message to the public chat webhook, the workflow should execute
 * and return the response from the last node.
 *
 * Actual: No response is returned, no WebSocket activity, and no errors are shown.
 */
test.describe(
	'NODE-4587: Chat Trigger - Public Chat Broken',
	{
		annotation: [{ type: 'owner', description: 'Chat' }],
	},
	() => {
		test('should return response when sending message to public chat with "When Last Node Finishes" mode', async ({
			n8n,
		}) => {
			// Import workflow with Chat Trigger node set to public chat + lastNode response mode
			await n8n.start.fromImportedWorkflow('chat-trigger-public-chat.json');
			await n8n.notifications.quickCloseAll();

			// Activate the workflow to enable the webhook
			await n8n.canvas.activateWorkflow();

			// Get the webhook URL for the chat trigger
			await n8n.canvas.openNode('When chat message received');
			const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();
			await n8n.ndv.close();

			// Send a chat message to the public webhook
			const chatMessage = `Test message ${nanoid()}`;
			const webhookUrl = `/webhook-test/${webhookPath}`;

			// Make a POST request to the chat webhook with a chat message
			const response = await n8n.page.request.post(webhookUrl, {
				data: {
					action: 'sendMessage',
					chatInput: chatMessage,
					sessionId: `test-session-${nanoid()}`,
				},
				headers: {
					'Content-Type': 'application/json',
				},
			});

			// Verify that the webhook responds with 200 status
			expect(response.ok(), 'Webhook should respond successfully').toBe(true);
			expect(response.status()).toBe(200);

			// Verify that the response contains the expected data from the last node
			const responseData = await response.json();
			expect(responseData).toHaveProperty('response');
			expect(responseData.response).toContain('Echo:');
			expect(responseData.response).toContain(chatMessage);
		});

		test('should return response when using public chat with responseNode mode', async ({ n8n }) => {
			// Create a workflow with Chat Trigger and Respond to Webhook nodes
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode('Chat Trigger');

			// Configure Chat Trigger for public chat with responseNode mode
			await n8n.ndv.getAddOptionDropdown().click();
			await n8n.page.getByRole('option', { name: 'Response Mode' }).click();
			await n8n.ndv.selectOptionInParameterDropdown('responseMode', 'responseNode');

			// Get webhook path before closing NDV
			const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();
			await n8n.ndv.close();

			// Add Edit Fields node to process the message
			await n8n.canvas.addNode('Edit Fields', { closeNDV: false });
			await n8n.canvas.nodeByName('Edit Fields').actions.select();
			const editFieldsNode = new (await import('../../../pages/nodes/EditFieldsNode')).EditFieldsNode(
				n8n.page,
			);
			await editFieldsNode.addAssignment({
				name: 'response',
				value: '=Echo: {{ $json.chatInput }}',
				type: 'String',
			});
			await n8n.ndv.close();

			// Add Respond to Webhook node
			await n8n.canvas.addNode('Respond to Webhook', { closeNDV: true });

			// Activate the workflow
			await n8n.canvas.activateWorkflow();

			// Send a chat message
			const chatMessage = `Test message ${nanoid()}`;
			const webhookUrl = `/webhook-test/${webhookPath}`;

			const response = await n8n.page.request.post(webhookUrl, {
				data: {
					action: 'sendMessage',
					chatInput: chatMessage,
					sessionId: `test-session-${nanoid()}`,
				},
				headers: {
					'Content-Type': 'application/json',
				},
			});

			// Verify response
			expect(response.ok(), 'Webhook should respond successfully').toBe(true);
			expect(response.status()).toBe(200);

			const responseData = await response.json();
			expect(responseData).toHaveProperty('response');
			expect(responseData.response).toContain('Echo:');
			expect(responseData.response).toContain(chatMessage);
		});
	},
);
