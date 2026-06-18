import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';
import { n8nPage } from '../../../pages/n8nPage';
import type { TestRequirements } from '../../../Types';

// Enable the CRDT collaboration experiment. The override is applied at the
// browser-context level, so a second tab opened in the same context inherits it.
const requirements: TestRequirements = {
	storage: {
		N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ '089_crdt_collaboration': 'variant' }),
	},
};

test.describe('CRDT cross-tab collaboration', () => {
	test('syncs edits and shows remote presence across tabs', async ({
		n8n,
		api,
		setupRequirements,
	}) => {
		// Register the experiment override on the context before any navigation.
		await setupRequirements(requirements);

		const workflow = await api.workflows.createWorkflow({
			name: `CRDT collab ${nanoid()}`,
			nodes: [],
			connections: {},
		});

		// Tab 1.
		await n8n.navigate.toWorkflow(workflow.id);
		await n8n.canvas.waitForCanvasReady();

		// Tab 2 — same browser context so the BroadcastChannel transport connects.
		const secondPage = await n8n.page.context().newPage();
		const n8nSecondTab = new n8nPage(secondPage, api);
		await n8nSecondTab.navigate.toWorkflow(workflow.id);
		await n8nSecondTab.canvas.waitForCanvasReady();

		// An edit in tab 1 propagates to tab 2 (document sync).
		await n8n.canvas.addNode('Manual Trigger');
		await expect(n8nSecondTab.canvas.nodeByName('Manual Trigger')).toBeVisible();

		// Selecting the node in tab 1 surfaces its cursor + selection in tab 2.
		await n8n.canvas.nodeByName('Manual Trigger').click();
		await expect(n8nSecondTab.canvas.getRemoteCursors().first()).toBeVisible();
		await expect(n8nSecondTab.canvas.getRemoteSelections().first()).toBeVisible();

		await secondPage.close();
	});

	test('a tab opened mid-edit catches up to current state', async ({
		n8n,
		api,
		setupRequirements,
	}) => {
		await setupRequirements(requirements);

		const workflow = await api.workflows.createWorkflow({
			name: `CRDT late join ${nanoid()}`,
			nodes: [],
			connections: {},
		});

		await n8n.navigate.toWorkflow(workflow.id);
		await n8n.canvas.waitForCanvasReady();

		// Edit before the second tab joins.
		await n8n.canvas.addNode('Manual Trigger');
		await expect(n8n.canvas.nodeByName('Manual Trigger')).toBeVisible();

		// A late-joining tab must catch up via the state-vector handshake.
		const secondPage = await n8n.page.context().newPage();
		const n8nSecondTab = new n8nPage(secondPage, api);
		await n8nSecondTab.navigate.toWorkflow(workflow.id);
		await n8nSecondTab.canvas.waitForCanvasReady();

		await expect(n8nSecondTab.canvas.nodeByName('Manual Trigger')).toBeVisible();

		await secondPage.close();
	});
});
