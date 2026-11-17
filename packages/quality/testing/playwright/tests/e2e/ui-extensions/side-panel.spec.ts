import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';
import { createSlackWorkflow } from './ui-extensions-helpers';

/**
 * The side panel at the right edge of the editor. Its tabs are views: the
 * built-in "Recent runs" and "Service data", and views that an MCP client adds with the
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

/** Whether a request is the side panel's own fetch of the latest runs. */
function isPanelFetch(url: string) {
	const { pathname, searchParams } = new URL(url);
	return pathname.endsWith('/rest/executions') && searchParams.get('limit') === '10';
}

/**
 * A view that keeps sending the editor a command to replace the open workflow:
 * every few milliseconds while it runs, and again while the editor removes its
 * frame. It says that it is done after a pause, so that a command the editor
 * took would show on the canvas by then.
 */
const INJECTING_VIEW_SOURCE = `export default {
	setup() {
		const context = n8n.useContext();
		const state = Vue.ref('waiting');
		const command = JSON.stringify({
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
		});
		const send = () => window.parent.postMessage(command, '*');
		window.addEventListener('pagehide', send);
		window.addEventListener('unload', send);
		Vue.watchEffect(() => {
			if (context.value.page !== 'workflow' || state.value !== 'waiting') return;
			state.value = 'sending';
			setInterval(send, 2);
			setTimeout(() => { state.value = 'done'; }, 1500);
		});
		return { state };
	},
	template: '<p data-test-id="injector-state">{{ state }}</p>',
};`;

/**
 * A view that shows its context, whether it can reach n8n over the network, and
 * whether it gets the run data that only built-in views get.
 */
const PROBE_VIEW_SOURCE = `export default {
	setup() {
		const context = n8n.useContext();
		const network = Vue.ref('pending');
		const request = new XMLHttpRequest();
		request.onload = () => { network.value = 'open'; };
		request.onerror = () => { network.value = 'blocked'; };
		request.open('GET', '/rest/login');
		request.send();
		return { context, network, data: n8n.useData(), openExecutionType: typeof n8n.openExecution };
	},
	template: \`<div>
		<p data-test-id="probe-page">{{ context.page }}</p>
		<p data-test-id="probe-workflow">{{ context.workflow ? context.workflow.name : 'hidden' }}</p>
		<p data-test-id="probe-network">{{ network }}</p>
		<p data-test-id="probe-data">{{ data === null ? 'no-data' : 'has-data' }}</p>
		<p data-test-id="probe-api">{{ openExecutionType }}</p>
	</div>\`,
};`;

test.describe(
	'UI extensions side panel',
	{
		annotation: [{ type: 'owner', description: 'Context' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });

		test('shows the panel with the Recent runs tab on the main pages', async ({ n8n, api }) => {
			const workflow = await createWorkflow(api);

			await n8n.navigate.toWorkflow(workflow.id);
			await n8n.sidePanel.open();
			await expect(n8n.sidePanel.getTab('Recent runs')).toBeVisible();
			await expect(n8n.sidePanel.getViewElement('recent-runs-subtitle')).toHaveText(workflow.name);

			await n8n.navigate.toWorkflows();
			await n8n.sidePanel.open();
			await expect(n8n.sidePanel.getViewElement('recent-runs-subtitle')).toHaveText(
				'All workflows',
			);

			await n8n.navigate.toPersonalSettings();
			await n8n.sidePanel.open();
			await expect(n8n.sidePanel.getTab('Recent runs')).toBeVisible();
			await expect(n8n.sidePanel.getViewElement('recent-runs-other-page')).toBeVisible();
		});

		test('changes Recent runs between the workflow page and the workflows list without a reload', async ({
			n8n,
			api,
		}) => {
			const workflow = await createWorkflow(api);

			await n8n.navigate.toWorkflows();
			await n8n.sidePanel.open();
			await n8n.sidePanel.selectTab('Recent runs');
			await expect(n8n.sidePanel.getViewElement('recent-runs-subtitle')).toHaveText(
				'All workflows',
			);

			// A marker on the window shows that the app did not reload.
			await n8n.page.evaluate(() => {
				(window as unknown as { sidePanelMarker: string }).sidePanelMarker = 'kept';
			});

			await n8n.workflows.cards.clickWorkflowCard(workflow.name);
			await expect(n8n.sidePanel.getViewElement('recent-runs-subtitle')).toHaveText(workflow.name);
			await expect(n8n.sidePanel.getViewElement('recent-runs-empty')).toContainText(
				'This workflow has no runs yet.',
			);

			await n8n.page.goBack();
			await expect(n8n.sidePanel.getViewElement('recent-runs-subtitle')).toHaveText(
				'All workflows',
			);

			const marker = await n8n.page.evaluate(
				() => (window as unknown as { sidePanelMarker?: string }).sidePanelMarker,
			);
			expect(marker).toBe('kept');
		});

		test('shows the data a service node read in its last run', async ({ n8n, api }) => {
			const { id: workflowId, credential } = await createSlackWorkflow(api);

			await n8n.navigate.toWorkflow(workflowId);
			await n8n.sidePanel.open();
			await n8n.sidePanel.selectTab('Recent runs');
			await expect(n8n.sidePanel.getViewElement('recent-runs-empty')).toBeVisible();

			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(
				n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
			).toBeVisible();

			// The finished run reaches the panel over the push connection, with no reload.
			const run = n8n.sidePanel.getViewElement('recent-runs-run');
			await expect(run).toHaveCount(1);
			await expect(run).toHaveAttribute('data-status', 'success');
			await expect(run).toContainText('Succeeded');
			await expect(n8n.sidePanel.getViewElement('recent-runs-stat-runs')).toHaveText('Runs shown1');
			await expect(n8n.sidePanel.getViewElement('recent-runs-stat-successRate')).toHaveText(
				'Success rate100%',
			);
			await expect(n8n.sidePanel.getViewElement('recent-runs-bar')).toHaveCount(1);

			await n8n.sidePanel.selectTab('Service data');
			const card = n8n.sidePanel.getViewElement('service-data-card');
			await expect(card).toHaveCount(1);
			await expect(card).toContainText('Slack');
			await expect(card).toContainText('Message › Send');
			await expect(n8n.sidePanel.getViewElement('service-data-target')).toHaveText(
				'Channel: #qa-alerts',
			);
			await expect(n8n.sidePanel.getViewElement('service-data-target-link')).toBeVisible();
			await expect(n8n.sidePanel.getViewElement('service-data-account')).toHaveText(
				`Account: ${credential.name}`,
			);
			await expect(n8n.sidePanel.getViewElement('service-data-items')).toHaveText('Items: 2');
			await expect(n8n.sidePanel.getViewElement('service-data-item').first()).toContainText(
				'hello from qa',
			);
			await expect(n8n.sidePanel.getViewElement('service-data-stat-services')).toHaveText(
				'Services1',
			);
			await expect(n8n.sidePanel.getViewElement('service-data-field')).toHaveText(['ts', 'text']);

			await n8n.sidePanel.selectTab('Recent runs');
			await expect(run).toHaveAttribute('data-execution-id', /^\d+$/);
			const executionId = await run.getAttribute('data-execution-id');
			await run.click();
			// The executions list opens the newest run by itself, so check the id.
			await expect(n8n.page).toHaveURL((url) =>
				url.pathname.endsWith(`/workflow/${workflowId}/executions/${executionId}`),
			);
		});

		test('plays the dinosaur game in the Arcade tab, and fetches no run data for it', async ({
			n8n,
			api,
		}) => {
			const workflow = await createWorkflow(api);

			await n8n.navigate.toWorkflows();
			await n8n.sidePanel.open();
			await n8n.sidePanel.selectTab('Arcade');
			const arcade = n8n.sidePanel.getViewElement('arcade');
			await expect(arcade).toHaveAttribute('data-state', 'idle');

			const requests: string[] = [];
			n8n.page.on('request', (request) => requests.push(request.url()));

			// Opening a workflow makes a data view fetch. With Arcade open, nothing fetches.
			await n8n.workflows.cards.clickWorkflowCard(workflow.name);
			await expect(n8n.canvas.nodeByName('Start here')).toBeVisible();

			await n8n.sidePanel.getViewElement('arcade-play').click();
			await expect(arcade).toHaveAttribute('data-state', 'running');
			await expect(n8n.sidePanel.getViewElement('arcade-score')).not.toHaveText('Score: 0');

			await n8n.page.keyboard.press('Space');
			await expect(arcade).toHaveAttribute('data-jumping', 'true');

			// With no more jumps, the dinosaur runs into a node.
			await expect(arcade).toHaveAttribute('data-state', 'over', { timeout: 20_000 });
			await expect(n8n.sidePanel.getViewElement('arcade-best')).not.toHaveText('Best: 0');
			expect(requests.filter(isPanelFetch)).toEqual([]);

			// The same page fetches as soon as a data view opens.
			const fetched = n8n.page.waitForRequest((request) => isPanelFetch(request.url()));
			await n8n.sidePanel.selectTab('Recent runs');
			expect(new URL((await fetched).url()).searchParams.get('filter')).toContain(workflow.id);
		});

		test('adds a tab for a view from an MCP client, with the context it may see, and keeps it after a reload', async ({
			n8n,
			api,
		}) => {
			const exposed = await createWorkflow(api, { availableInMCP: true });
			const hidden = await createWorkflow(api, { availableInMCP: false });
			await api.setMcpAccess(true);
			const { apiKey } = await api.rotateMcpApiKey();

			// A run, so the built-in view has data in this session before the MCP view opens.
			await n8n.navigate.toWorkflow(exposed.id);
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(
				n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
			).toBeVisible();

			await n8n.navigate.toWorkflows();
			await n8n.sidePanel.open();
			await n8n.sidePanel.selectTab('Recent runs');
			// The built-in view has its data, so the panel has fetched the views and the run
			// data, and it holds its push connection.
			await expect(n8n.sidePanel.getViewElement('recent-runs-run').first()).toBeVisible();

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
			// A view from an MCP client has the same API, but never gets the run data.
			await expect(n8n.sidePanel.getViewElement('probe-data')).toHaveText('no-data');
			await expect(n8n.sidePanel.getViewElement('probe-api')).toHaveText('function');

			await n8n.workflows.cards.clickWorkflowCard(exposed.name);
			await expect(n8n.sidePanel.getViewElement('probe-page')).toHaveText('workflow');
			await expect(n8n.sidePanel.getViewElement('probe-workflow')).toHaveText(exposed.name);

			// The built-in view shows the name once the workflow has loaded. The probe
			// opens after that, so the first context it gets is the loaded workflow and
			// not the empty context of the page load.
			await n8n.navigate.toWorkflow(hidden.id);
			await n8n.sidePanel.open();
			await n8n.sidePanel.selectTab('Recent runs');
			await expect(n8n.sidePanel.getViewElement('recent-runs-subtitle')).toHaveText(hidden.name);
			await n8n.sidePanel.selectTab(title);
			await expect(n8n.sidePanel.getViewElement('probe-page')).toHaveText('workflow');
			await expect(n8n.sidePanel.getViewElement('probe-workflow')).toHaveText('hidden');

			await n8n.page.reload();
			await n8n.sidePanel.open();
			await expect(n8n.sidePanel.getTab(title)).toBeVisible();
		});

		test('lines up the tab row with the main header and shows no panel title', async ({
			n8n,
			api,
		}, testInfo) => {
			const workflow = await createWorkflow(api);

			await n8n.navigate.toWorkflow(workflow.id);
			await expect(n8n.canvas.nodeByName('Start here')).toBeVisible();
			await n8n.sidePanel.open();
			await expect(n8n.sidePanel.getRegion()).toBeVisible();
			await expect(n8n.sidePanel.getVisibleTitle()).toHaveCount(0);

			const header = n8n.sidePanel.getMainHeader();
			const headerBox = await header.boundingBox();
			const rowBox = await n8n.sidePanel.getTabRow().boundingBox();
			expect(headerBox).not.toBeNull();
			expect(rowBox).not.toBeNull();
			expect(
				Math.abs(rowBox!.y + rowBox!.height - (headerBox!.y + headerBox!.height)),
			).toBeLessThanOrEqual(1);
			await n8n.page.screenshot({ path: testInfo.outputPath('side-panel-workflow-page.png') });

			await n8n.navigate.toWorkflows();
			await expect(n8n.sideBar.getSettings()).toBeVisible();
			await n8n.sidePanel.open();
			await expect(n8n.sidePanel.getViewElement('recent-runs-subtitle')).toHaveText(
				'All workflows',
			);
			const listRowBox = await n8n.sidePanel.getTabRow().boundingBox();
			expect(Math.abs(listRowBox!.height - 65)).toBeLessThanOrEqual(1);
			await n8n.page.screenshot({ path: testInfo.outputPath('side-panel-workflows-list.png') });
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

			// While the view frame is open.
			await n8n.sidePanel.selectTab(title);
			await expect(n8n.sidePanel.getViewElement('injector-state')).toHaveText('done');
			await expect(n8n.canvas.nodeByName('Injected by view')).toHaveCount(0);

			// While the frame is removed for another tab. Opening the view again waits
			// long enough for a command from the removed frame to show.
			await n8n.sidePanel.selectTab('Recent runs');
			await expect(n8n.sidePanel.getViewElement('recent-runs-subtitle')).toHaveText(workflow.name);
			await n8n.sidePanel.selectTab(title);
			await expect(n8n.sidePanel.getViewElement('injector-state')).toHaveText('done');
			await expect(n8n.canvas.nodeByName('Injected by view')).toHaveCount(0);

			// While the frame is removed because the panel closes.
			await n8n.sidePanel.close();
			await n8n.sidePanel.open();
			await expect(n8n.sidePanel.getViewElement('injector-state')).toHaveText('done');
			await expect(n8n.canvas.nodeByName('Injected by view')).toHaveCount(0);
			await expect(n8n.canvas.nodeByName('Start here')).toBeVisible();
		});
	},
);
