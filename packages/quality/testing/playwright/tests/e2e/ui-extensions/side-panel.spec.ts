import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

/**
 * The side panel at the right edge of the editor. Its tabs are views: the
 * built-in "Page summary", and views that an MCP client adds with the
 * `create_side_panel_view` tool. Each view runs in a sandboxed frame and gets the
 * page context.
 */

// One MCP API key exists per user, and rotation invalidates the previous key.
test.use({ capability: { env: { TEST_ISOLATION: 'ui-extensions-side-panel' } } });

async function createWorkflow(api: ApiHelpers, options: { availableInMCP?: boolean } = {}) {
	const name = `Side panel ${nanoid()}`;
	const workflow = await api.workflows.createWorkflow({
		name,
		nodes: [
			{
				id: nanoid(),
				name: 'Start here',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
		settings: { availableInMCP: options.availableInMCP ?? false },
	});
	return { id: String(workflow.id), name };
}

/**
 * A view that sends the editor a command to replace the open workflow, then
 * waits, so that a command the editor took would show on the canvas by the time
 * the view says that it is done.
 */
const INJECTING_VIEW_SOURCE = `export default {
	setup() {
		const context = n8n.useContext();
		const state = Vue.ref('waiting');
		Vue.watchEffect(() => {
			if (context.value.page !== 'workflow' || state.value !== 'waiting') return;
			state.value = 'sent';
			window.parent.postMessage(
				JSON.stringify({
					command: 'openWorkflow',
					workflow: {
						name: 'Replaced by a side panel view',
						nodes: [
							{
								id: 'injected',
								name: 'Injected by view',
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [0, 0],
								parameters: {},
							},
						],
						connections: {},
					},
				}),
				'*',
			);
			setTimeout(() => { state.value = 'done'; }, 1500);
		});
		return { state };
	},
	template: '<p data-test-id="injector-state">{{ state }}</p>',
};`;

/** A view that shows its context and whether it can reach n8n over the network. */
const PROBE_VIEW_SOURCE = `export default {
	setup() {
		const context = n8n.useContext();
		const network = Vue.ref('pending');
		const request = new XMLHttpRequest();
		request.onload = () => { network.value = 'open'; };
		request.onerror = () => { network.value = 'blocked'; };
		request.open('GET', '/rest/login');
		request.send();
		return { context, network };
	},
	template: \`<div>
		<p data-test-id="probe-page">{{ context.page }}</p>
		<p data-test-id="probe-workflow">{{ context.workflow ? context.workflow.name : 'hidden' }}</p>
		<p data-test-id="probe-network">{{ network }}</p>
	</div>\`,
};`;

test.describe(
	'UI extensions side panel',
	{
		annotation: [{ type: 'owner', description: 'Context' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });

		test('shows the panel with the Page summary tab on the main pages', async ({ n8n, api }) => {
			const workflow = await createWorkflow(api);

			await n8n.navigate.toWorkflow(workflow.id);
			await n8n.sidePanel.open();
			await expect(n8n.sidePanel.getTab('Page summary')).toBeVisible();

			await n8n.navigate.toWorkflows();
			await n8n.sidePanel.open();
			await expect(n8n.sidePanel.getTab('Page summary')).toBeVisible();

			await n8n.navigate.toPersonalSettings();
			await n8n.sidePanel.open();
			await expect(n8n.sidePanel.getTab('Page summary')).toBeVisible();
			await expect(n8n.sidePanel.getViewElement('page-summary-route')).toHaveText(
				'PersonalSettings',
			);
		});

		test('changes the Page summary between the workflow page and the workflows list without a reload', async ({
			n8n,
			api,
		}) => {
			const workflow = await createWorkflow(api);

			await n8n.navigate.toWorkflows();
			await n8n.sidePanel.open();
			await n8n.sidePanel.selectTab('Page summary');
			await expect(n8n.sidePanel.getViewElement('page-summary-workflows-heading')).toBeVisible();

			// A marker on the window shows that the app did not reload.
			await n8n.page.evaluate(() => {
				(window as unknown as { sidePanelMarker: string }).sidePanelMarker = 'kept';
			});

			await n8n.workflows.cards.clickWorkflowCard(workflow.name);
			await expect(n8n.sidePanel.getViewElement('page-summary-workflow-name')).toHaveText(
				workflow.name,
			);
			await expect(n8n.sidePanel.getViewText('n8n-nodes-base.manualTrigger')).toBeVisible();

			await n8n.page.goBack();
			await expect(n8n.sidePanel.getViewElement('page-summary-workflows-heading')).toBeVisible();
			await expect(n8n.sidePanel.getViewElement('page-summary-workflow-name')).toBeHidden();

			const marker = await n8n.page.evaluate(
				() => (window as unknown as { sidePanelMarker?: string }).sidePanelMarker,
			);
			expect(marker).toBe('kept');
		});

		test('adds a tab for a view from an MCP client, with the context it may see, and keeps it after a reload', async ({
			n8n,
			api,
		}) => {
			const exposed = await createWorkflow(api, { availableInMCP: true });
			const hidden = await createWorkflow(api, { availableInMCP: false });
			await api.setMcpAccess(true);
			const { apiKey } = await api.rotateMcpApiKey();

			await n8n.navigate.toWorkflows();
			await n8n.sidePanel.open();
			// The built-in view has loaded, so the panel has fetched the views and holds its push connection.
			await expect(n8n.sidePanel.getViewElement('page-summary-workflows-heading')).toBeVisible();

			const title = `Probe ${nanoid(6)}`;
			const result = await api.mcp.internalMcpCreateSidePanelView(apiKey, {
				title,
				source: PROBE_VIEW_SOURCE,
			});
			expect(result).toMatchObject({ title, created: true });

			// No reload: the push message adds the tab and makes it the active one.
			await expect(n8n.sidePanel.getTab(title)).toBeVisible();
			await expect(n8n.sidePanel.getViewElement('probe-page')).toHaveText('workflows');
			await expect(n8n.sidePanel.getViewElement('probe-workflow')).toHaveText('hidden');
			await expect(n8n.sidePanel.getViewElement('probe-network')).toHaveText('blocked');

			await n8n.workflows.cards.clickWorkflowCard(exposed.name);
			await expect(n8n.sidePanel.getViewElement('probe-page')).toHaveText('workflow');
			await expect(n8n.sidePanel.getViewElement('probe-workflow')).toHaveText(exposed.name);

			// The built-in view shows the name once the workflow has loaded. A view frame
			// renders only from the context it gets when it opens, so the probe that opens
			// next sees the loaded workflow and not the empty context of the page load.
			await n8n.navigate.toWorkflow(hidden.id);
			await n8n.sidePanel.open();
			await n8n.sidePanel.selectTab('Page summary');
			await expect(n8n.sidePanel.getViewElement('page-summary-workflow-name')).toHaveText(
				hidden.name,
			);
			await n8n.sidePanel.selectTab(title);
			await expect(n8n.sidePanel.getViewElement('probe-page')).toHaveText('workflow');
			await expect(n8n.sidePanel.getViewElement('probe-workflow')).toHaveText('hidden');

			await n8n.page.reload();
			await n8n.sidePanel.open();
			await expect(n8n.sidePanel.getTab(title)).toBeVisible();
		});

		test('ignores a command from a view to replace the open workflow', async ({ n8n, api }) => {
			const workflow = await createWorkflow(api, { availableInMCP: false });
			await api.setMcpAccess(true);
			const { apiKey } = await api.rotateMcpApiKey();
			const title = `Injector ${nanoid(6)}`;
			await api.mcp.internalMcpCreateSidePanelView(apiKey, {
				title,
				source: INJECTING_VIEW_SOURCE,
			});

			await n8n.navigate.toWorkflow(workflow.id);
			await expect(n8n.canvas.nodeByName('Start here')).toBeVisible();
			await n8n.sidePanel.open();
			await n8n.sidePanel.selectTab(title);

			await expect(n8n.sidePanel.getViewElement('injector-state')).toHaveText('done');
			await expect(n8n.canvas.nodeByName('Injected by view')).toHaveCount(0);
			await expect(n8n.canvas.nodeByName('Start here')).toBeVisible();
		});
	},
);
