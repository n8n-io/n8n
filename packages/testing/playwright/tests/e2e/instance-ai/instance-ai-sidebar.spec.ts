import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

test.describe(
	'Instance AI sidebar @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('should create new thread via sidebar button', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			// Send a message to establish the current thread
			await n8n.instanceAi.sendMessage('First thread message');
			await n8n.instanceAi.waitForResponseComplete();

			const threadCountBefore = await n8n.instanceAi.sidebar.getThreadItems().count();

			// Click new thread button
			await n8n.instanceAi.sidebar.getNewThreadButton().click();

			// Should show empty input in the new thread
			await expect(n8n.instanceAi.getChatInput()).toBeVisible({ timeout: 10_000 });

			// Send a message to materialize the new thread in the sidebar
			await n8n.instanceAi.sendMessage('Second thread message');
			await n8n.instanceAi.waitForResponseComplete();

			// Thread count should increase
			await expect(n8n.instanceAi.sidebar.getThreadItems()).toHaveCount(threadCountBefore + 1, {
				timeout: 10_000,
			});
		});

		test('should switch between threads', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			// Create first thread with a unique message
			await n8n.instanceAi.sendMessage('Message in first thread');
			await n8n.instanceAi.waitForResponseComplete();

			// Create second thread
			await n8n.instanceAi.sidebar.getNewThreadButton().click();
			await expect(n8n.instanceAi.getChatInput()).toBeVisible({ timeout: 10_000 });

			await n8n.instanceAi.sendMessage('Message in second thread');
			await n8n.instanceAi.waitForResponseComplete();

			// Switch back to first thread by its title (LLM-generated from recording)
			await n8n.instanceAi.sidebar.getThreadByTitle('First Thread Message').click();

			// Should show the first thread's user message (messages load async)
			await expect(n8n.instanceAi.getUserMessages().first()).toContainText(
				'Message in first thread',
				{ timeout: 30_000 },
			);
		});

		test('should rename thread via double-click', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage('Thread to rename');
			await n8n.instanceAi.waitForResponseComplete();

			// Double-click the thread to enter rename mode
			const thread = n8n.instanceAi.sidebar.getThreadItems().first();
			await thread.dblclick();

			// Find the rename input and type a new name
			const input = n8n.instanceAi.sidebar.getRenameInput();
			await expect(input).toBeVisible({ timeout: 5_000 });
			await input.fill('Renamed Thread Title');
			await input.press('Enter');

			// Thread should show the new name
			await expect(n8n.instanceAi.sidebar.getThreadByTitle('Renamed Thread Title')).toBeVisible({
				timeout: 5_000,
			});
		});

		test('should delete thread via action menu', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			// Create a thread with a recognizable message
			await n8n.instanceAi.sendMessage('Thread to delete');
			await n8n.instanceAi.waitForResponseComplete();

			// Verify target thread is visible in the sidebar
			const targetThread = n8n.instanceAi.sidebar.getThreadByTitle('Thread to Delete');
			await expect(targetThread).toBeVisible({ timeout: 10_000 });

			// Hover the target thread to reveal the three-dots button, then click it
			await targetThread.hover();
			const actionButton = n8n.instanceAi.sidebar.getThreadActionsTrigger(targetThread);
			await expect(actionButton).toBeVisible({ timeout: 5_000 });
			await actionButton.click();

			// Click delete option in the dropdown
			await expect(n8n.instanceAi.sidebar.getDeleteMenuItem()).toBeVisible({ timeout: 5_000 });
			await n8n.instanceAi.sidebar.getDeleteMenuItem().click();

			// Thread should no longer be visible
			await expect(n8n.instanceAi.sidebar.getThreadByTitle('Thread to Delete')).toBeHidden({
				timeout: 5_000,
			});
		});
	},
);
