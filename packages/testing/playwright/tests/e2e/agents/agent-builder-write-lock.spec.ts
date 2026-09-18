import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';

test.use({
	capability: {
		env: {
			N8N_ENABLED_MODULES: 'agents',
			TEST_ISOLATION: 'agent-builder-write-lock',
		},
	},
});

test.describe(
	'Agent builder write lock',
	{ annotation: [{ type: 'owner', description: 'AI' }] },
	() => {
		/**
		 * Two tabs of the same user open the same agent. The first tab acquires the
		 * write lock on first edit (lazy acquisition); the second tab is read-only
		 * and shows the collaboration banner until the first tab closes and
		 * releases the lock.
		 */
		test('second tab is read-only until the first tab closes', async ({ n8n, api }) => {
			const project = await api.projects.getMyPersonalProject();
			const projectId = project.id;

			const { id: agentId } = await api.agents.create(projectId, `Write lock E2E ${nanoid(6)}`);

			// First tab opens the builder. With lazy acquisition, no lock is
			// held until the user makes an edit.
			await n8n.start.fromHome();
			await n8n.agentBuilder.goto(projectId, agentId);
			await expect(n8n.agentBuilder.getHeader()).toBeVisible();
			await expect(n8n.agentBuilder.getCollaborationBanner()).toBeHidden();

			// Make an edit to acquire the write lock.
			await n8n.agentBuilder.editAgentName('Edited agent name');

			// Wait for the first tab to acquire the write lock before opening
			// the second tab — the lock is acquired asynchronously via WebSocket
			// round-trip, and the second tab must see it.
			await expect
				.poll(
					async () => {
						const lock = await api.agents.getWriteLock(projectId, agentId);
						return lock?.userId;
					},
					{ timeout: 15_000, intervals: [500] },
				)
				.toBeTruthy();

			// Second tab in the same browser context (same user, different push-ref).
			const secondTab = await n8n.start.newTab();
			await secondTab.agentBuilder.goto(projectId, agentId);
			await expect(secondTab.agentBuilder.getHeader()).toBeVisible();

			await expect(secondTab.agentBuilder.getCollaborationBanner()).toBeVisible();
			await expect(secondTab.agentBuilder.getCollaborationBanner()).toContainText(/another tab/i);
			await expect(secondTab.agentBuilder.getCollaborationTakeOverButton()).toBeVisible();

			// The first tab keeps write access.
			await expect(n8n.agentBuilder.getCollaborationBanner()).toBeHidden();

			// Closing the first tab sends `agentClosed`, which releases the lock and
			// pushes `writeAccessReleased` to the second tab.
			await n8n.page.close();
			await expect(secondTab.agentBuilder.getCollaborationBanner()).toBeHidden({
				timeout: 30_000,
			});
		});
	},
);
