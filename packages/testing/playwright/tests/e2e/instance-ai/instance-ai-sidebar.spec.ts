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
			await expect(n8n.page).toHaveURL(/\/instance-ai\/[^/]+$/);
			const firstThreadPath = new URL(n8n.page.url()).pathname;

			// Sidebar starts collapsed; open it so the thread list is queryable.
			await n8n.instanceAi.openSidebar();

			// Click new thread button
			await n8n.instanceAi.sidebar.getNewThreadButton().click();

			// Should show empty input in the new thread
			await expect(n8n.instanceAi.getChatInput()).toBeVisible({ timeout: 10_000 });

			// Send a message to materialize the new thread in the sidebar
			await n8n.instanceAi.sendMessage('Second thread message');
			await n8n.instanceAi.waitForResponseComplete();
			await expect(n8n.page).toHaveURL(/\/instance-ai\/[^/]+$/);
			const secondThreadPath = new URL(n8n.page.url()).pathname;
			expect(secondThreadPath).not.toBe(firstThreadPath);

			// Assert specific threads instead of a count, which can include stray rows.
			await expect(n8n.instanceAi.sidebar.getThreadByHref(firstThreadPath)).toBeVisible();
			await expect(n8n.instanceAi.sidebar.getThreadByHref(secondThreadPath)).toBeVisible();
		});

		test('should switch between threads', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			// Create first thread with a unique message
			await n8n.instanceAi.sendMessage(
				'For this thread switch test, reply with exactly: first thread ready',
			);
			await n8n.instanceAi.waitForResponseComplete();
			await expect(n8n.page).toHaveURL(/\/instance-ai\/[^/]+$/);
			const firstThreadPath = new URL(n8n.page.url()).pathname;

			// Sidebar starts collapsed; open it so the new-thread button and
			// thread list are queryable.
			await n8n.instanceAi.openSidebar();

			// Create second thread
			await n8n.instanceAi.sidebar.getNewThreadButton().click();
			await expect(n8n.instanceAi.getChatInput()).toBeVisible({ timeout: 10_000 });

			await n8n.instanceAi.sendMessage(
				'For this thread switch test, reply with exactly: second thread ready',
			);
			await n8n.instanceAi.waitForResponseComplete();

			const firstThread = n8n.instanceAi.sidebar.getThreadByHref(firstThreadPath);
			await expect(firstThread).toBeVisible({ timeout: 10_000 });
			await firstThread.click();

			// Should show the first thread's user message (messages load async)
			await expect(n8n.instanceAi.getUserMessages().first()).toContainText('first thread ready', {
				timeout: 30_000,
			});
		});

		test('should rename thread via double-click', async ({ n8n }) => {
			const thread = await n8n.api.createInstanceAiThread();
			await n8n.api.renameInstanceAiThread(thread.id, 'Thread to rename');
			await n8n.instanceAi.gotoThread(thread.id);

			// Sidebar starts collapsed; open it so the thread list is queryable.
			await n8n.instanceAi.openSidebar();

			await n8n.instanceAi.sidebar.renameThreadByTitle('Thread to rename', 'Renamed Thread Title');

			// Thread should show the new name
			await expect(n8n.instanceAi.sidebar.getThreadByTitle('Renamed Thread Title')).toBeVisible({
				timeout: 5_000,
			});
		});

		test('should delete thread via action menu', async ({ n8n }) => {
			const thread = await n8n.api.createInstanceAiThread();
			await n8n.api.renameInstanceAiThread(thread.id, 'Thread to delete');
			await n8n.instanceAi.gotoThread(thread.id);

			// Sidebar starts collapsed; open it so the thread list is queryable.
			await n8n.instanceAi.openSidebar();

			const targetThread = n8n.instanceAi.sidebar.getThreadByTitle('Thread to delete');
			await expect(targetThread).toBeVisible({ timeout: 10_000 });
			const threadCountBefore = await n8n.instanceAi.sidebar.getThreadItems().count();

			// Hover the target thread to reveal the three-dots button, then click it
			await targetThread.hover();
			const actionButton = n8n.instanceAi.sidebar.getThreadActionsTrigger(targetThread);
			await expect(actionButton).toBeVisible({ timeout: 5_000 });
			await actionButton.click();

			// Click delete option in the dropdown
			await expect(n8n.instanceAi.sidebar.getDeleteMenuItem()).toBeVisible({ timeout: 5_000 });
			await n8n.instanceAi.sidebar.getDeleteMenuItem().click();

			// Thread should no longer be visible
			await expect(n8n.instanceAi.sidebar.getThreadItems()).toHaveCount(threadCountBefore - 1, {
				timeout: 10_000,
			});
		});
	},
);
