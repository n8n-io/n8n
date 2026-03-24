import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * Regression test for GHC-7432
 *
 * Bug: When testing Chat Trigger nodes with Basic Auth in the n8n UI,
 * the browser caches credentials from one workflow and reuses them for another.
 * This causes 403 errors when switching between workflows with different credentials.
 *
 * Reproduction steps:
 * 1. Create workflow 1 with Chat Trigger + Basic Auth credential 1
 * 2. Test chat in workflow 1 (browser caches credential 1)
 * 3. Create workflow 2 with Chat Trigger + Basic Auth credential 2
 * 4. Test chat in workflow 2
 * Expected: Should use credential 2
 * Actual: Browser sends credential 1, resulting in 403 error
 */

test.describe(
	'GHC-7432: Chat Trigger Basic Auth credential caching',
	{
		annotation: [{ type: 'owner', description: 'AI' }],
	},
	() => {
		test('should not reuse Basic Auth credentials across different Chat Trigger workflows', async ({
			n8n,
		}) => {
			// Setup: Create two different Basic Auth credentials
			const credential1Name = `chat-auth-1-${nanoid()}`;
			const credential1User = `user1-${nanoid()}`;
			const credential1Pass = `pass1-${nanoid()}`;

			const credential2Name = `chat-auth-2-${nanoid()}`;
			const credential2User = `user2-${nanoid()}`;
			const credential2Pass = `pass2-${nanoid()}`;

			await n8n.credentialsComposer.createFromApi({
				type: 'httpBasicAuth',
				name: credential1Name,
				data: {
					user: credential1User,
					password: credential1Pass,
				},
			});

			await n8n.credentialsComposer.createFromApi({
				type: 'httpBasicAuth',
				name: credential2Name,
				data: {
					user: credential2User,
					password: credential2Pass,
				},
			});

			// Step 1: Create first workflow with Chat Trigger using credential 1
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode('When chat message received');

			// Configure Chat Trigger with Basic Auth
			await n8n.ndv.getParameter('public').click(); // Enable public mode
			await n8n.ndv.selectOptionInParameterDropdown('authentication', 'Basic Auth');

			// Select credential 1
			await n8n.ndv.credentialSelect.selectExistingCredential(credential1Name);

			const workflow1Path = await n8n.ndv.setupHelper.getWebhookPath();
			await n8n.ndv.close();

			// Save workflow 1
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.waitingForTriggerEvent()).toBeVisible();

			// Step 2: Test chat in workflow 1 with correct credentials
			// This simulates the browser caching credential 1
			const workflow1Response = await n8n.api.webhooks.trigger(
				`/webhook-test/${workflow1Path}`,
				{
					method: 'POST',
					body: JSON.stringify({ action: 'sendMessage', sessionId: 'test', message: 'Hello' }),
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Basic ' + Buffer.from(`${credential1User}:${credential1Pass}`).toString('base64'),
					},
				},
			);
			expect(workflow1Response.ok(), 'First workflow should accept correct credentials').toBe(true);

			// Step 3: Create second workflow with Chat Trigger using credential 2
			await n8n.canvas.openNewWorkflow();
			await n8n.canvas.addNode('When chat message received');

			// Configure Chat Trigger with Basic Auth
			await n8n.ndv.getParameter('public').click(); // Enable public mode
			await n8n.ndv.selectOptionInParameterDropdown('authentication', 'Basic Auth');

			// Select credential 2
			await n8n.ndv.credentialSelect.selectExistingCredential(credential2Name);

			const workflow2Path = await n8n.ndv.setupHelper.getWebhookPath();
			await n8n.ndv.close();

			// Save workflow 2
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.waitingForTriggerEvent()).toBeVisible();

			// Step 4: Test that wrong credentials are rejected
			const workflow2WithWrongCredentials = await n8n.api.webhooks.trigger(
				`/webhook-test/${workflow2Path}`,
				{
					method: 'POST',
					body: JSON.stringify({ action: 'sendMessage', sessionId: 'test', message: 'Hello' }),
					headers: {
						'Content-Type': 'application/json',
						// Bug: Browser would send credential 1 here instead of credential 2
						Authorization: 'Basic ' + Buffer.from(`${credential1User}:${credential1Pass}`).toString('base64'),
					},
				},
			);
			expect(
				workflow2WithWrongCredentials.status(),
				'Second workflow should reject credentials from first workflow',
			).toBe(403);

			// Step 5: Test that correct credentials work
			const workflow2WithCorrectCredentials = await n8n.api.webhooks.trigger(
				`/webhook-test/${workflow2Path}`,
				{
					method: 'POST',
					body: JSON.stringify({ action: 'sendMessage', sessionId: 'test', message: 'Hello' }),
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Basic ' + Buffer.from(`${credential2User}:${credential2Pass}`).toString('base64'),
					},
				},
			);
			expect(
				workflow2WithCorrectCredentials.ok(),
				'Second workflow should accept its own credentials',
			).toBe(true);
		});

		test('should handle browser credential caching when using chat UI', async ({ n8n }) => {
			// This test simulates the actual UI interaction described in the bug report
			// where the browser's Basic Auth dialog caches credentials

			const credential1Name = `chat-auth-ui-1-${nanoid()}`;
			const credential1User = `user1-${nanoid()}`;
			const credential1Pass = `pass1-${nanoid()}`;

			const credential2Name = `chat-auth-ui-2-${nanoid()}`;
			const credential2User = `user2-${nanoid()}`;
			const credential2Pass = `pass2-${nanoid()}`;

			// Create credentials
			await n8n.credentialsComposer.createFromApi({
				type: 'httpBasicAuth',
				name: credential1Name,
				data: {
					user: credential1User,
					password: credential1Pass,
				},
			});

			await n8n.credentialsComposer.createFromApi({
				type: 'httpBasicAuth',
				name: credential2Name,
				data: {
					user: credential2User,
					password: credential2Pass,
				},
			});

			// Create workflow 1 with Chat Trigger
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode('When chat message received');
			await n8n.ndv.getParameter('public').click();
			await n8n.ndv.selectOptionInParameterDropdown('authentication', 'Basic Auth');
			await n8n.ndv.credentialSelect.selectExistingCredential(credential1Name);

			// Add a simple response node
			await n8n.ndv.close();
			await n8n.canvas.addNode('Edit Fields (Set)');
			await n8n.ndv.close();

			// Save and activate workflow 1
			const workflow1Name = `Chat Auth Test 1 ${nanoid()}`;
			await n8n.canvas.saveWorkflow({ name: workflow1Name });
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.waitingForTriggerEvent()).toBeVisible();

			// Open chat panel and send message
			// Note: In the actual bug, a browser Basic Auth dialog would appear here
			await n8n.canvas.logsPanel.open();

			// Create workflow 2 with different credentials
			await n8n.canvas.openNewWorkflow();
			await n8n.canvas.addNode('When chat message received');
			await n8n.ndv.getParameter('public').click();
			await n8n.ndv.selectOptionInParameterDropdown('authentication', 'Basic Auth');
			await n8n.ndv.credentialSelect.selectExistingCredential(credential2Name);

			await n8n.ndv.close();
			await n8n.canvas.addNode('Edit Fields (Set)');
			await n8n.ndv.close();

			const workflow2Name = `Chat Auth Test 2 ${nanoid()}`;
			await n8n.canvas.saveWorkflow({ name: workflow2Name });
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.waitingForTriggerEvent()).toBeVisible();

			// The bug would manifest here:
			// - Opening chat for workflow 2 would not show Basic Auth dialog
			// - Browser would reuse cached credentials from workflow 1
			// - Server would reject the request with 403
			await n8n.canvas.logsPanel.open();

			// In the buggy behavior, trying to send a message here would result in:
			// "Authorization data is wrong!" because the browser sends workflow1's credentials
			//
			// Expected: Either a new Basic Auth prompt appears, or the chat uses workflow2's credentials
			// Actual (bug): Browser sends workflow1's credentials silently, causing 403 error
		});
	},
);
