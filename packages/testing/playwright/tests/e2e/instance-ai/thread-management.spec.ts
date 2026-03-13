import { nanoid } from 'nanoid';

import { setupInstanceAiMocks } from '../../../composables/InstanceAiComposer';
import { buildSimpleChatSSE } from '../../../config/instance-ai-fixtures';
import { test, expect } from '../../../fixtures/base';

test.describe('Instance AI - Thread Management', () => {
	test('should create a new thread via sidebar button', async ({ n8n }) => {
		await setupInstanceAiMocks(n8n.page, buildSimpleChatSSE('Hello!'));
		await n8n.navigate.toInstanceAi();

		// Verify initial state shows at least one thread
		await expect(n8n.instanceAi.getThreadItems().first()).toBeVisible();

		// Click new thread button
		await n8n.instanceAi.getNewThreadButton().click();

		// Empty state should reappear for the new thread
		await expect(n8n.instanceAi.getEmptyState()).toBeVisible();
	});

	test('should switch between threads', async ({ n8n }) => {
		const threadA = {
			id: nanoid(),
			title: `Thread Alpha ${nanoid()}`,
			createdAt: new Date().toISOString(),
		};
		const threadB = {
			id: nanoid(),
			title: `Thread Beta ${nanoid()}`,
			createdAt: new Date().toISOString(),
		};

		await setupInstanceAiMocks(n8n.page, buildSimpleChatSSE('Hello!'), {
			threads: [threadA, threadB],
		});
		await n8n.navigate.toInstanceAi();

		// Both threads should be visible in the sidebar
		await expect(n8n.instanceAi.getThreadList().getByText(threadA.title)).toBeVisible();
		await expect(n8n.instanceAi.getThreadList().getByText(threadB.title)).toBeVisible();

		// Click the second thread
		await n8n.instanceAi.getThreadList().getByText(threadB.title).click();

		// URL should contain the second thread's ID
		await expect(n8n.page).toHaveURL(new RegExp(threadB.id));
	});

	test('should delete a thread', async ({ n8n }) => {
		const threadToDelete = {
			id: nanoid(),
			title: `Delete Me ${nanoid()}`,
			createdAt: new Date().toISOString(),
		};

		await setupInstanceAiMocks(n8n.page, buildSimpleChatSSE('Hello!'), {
			threads: [threadToDelete],
		});
		await n8n.navigate.toInstanceAi();

		// Thread should be visible
		const threadItem = n8n.instanceAi.getThreadItems().filter({ hasText: threadToDelete.title });
		await expect(threadItem).toBeVisible();

		// Hover over the thread item to reveal the action dropdown trigger
		await threadItem.hover();

		// Click the ellipsis button to open the action dropdown
		await threadItem.getByRole('button').click();

		// Click the delete action in the dropdown
		await n8n.page.getByRole('menuitem', { name: 'Delete' }).click();

		// Thread should no longer be visible
		await expect(threadItem).toBeHidden();
	});
});
