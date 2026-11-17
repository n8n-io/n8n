import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import { UiExtensionsPages } from '../../../pages/components/ui-extensions-side-panel';
import { createSlackWorkflow } from './ui-extensions-helpers';

/**
 * Pages in the main sidebar. An MCP client adds one with `create_custom_page`,
 * and removes it with `delete_ui_extension`. A user removes it from the sidebar.
 * A page runs in the same sandboxed frame as a side panel view.
 */

// One MCP API key exists per user, and rotation invalidates the previous key.
test.use({ capability: { env: { TEST_ISOLATION: 'ui-extensions-pages' } } });

/** A page that shows its context and whether it can reach n8n over the network. */
const PROBE_PAGE_SOURCE = `export default {
	setup() {
		const context = n8n.useContext();
		const network = Vue.ref('pending');
		const request = new XMLHttpRequest();
		request.onload = () => { network.value = 'open'; };
		request.onerror = () => { network.value = 'blocked'; };
		request.open('GET', '/rest/login');
		request.send();
		return { context, network, data: n8n.useData() };
	},
	template: \`<div>
		<p data-test-id="probe-page">{{ context.page }}</p>
		<p data-test-id="probe-network">{{ network }}</p>
		<p data-test-id="probe-data">{{ data === null ? 'no-data' : 'has-data' }}</p>
	</div>\`,
};`;

const VIEW_SOURCE = 'export default { template: \'<p data-test-id="mcp-view">view</p>\' };';

test.describe(
	'UI extensions pages',
	{
		annotation: [{ type: 'owner', description: 'Context' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });

		test('adds a page from an MCP client under Inbox, opens it at its own route, and keeps it after a reload', async ({
			n8n,
			api,
		}) => {
			await api.setMcpAccess(true);
			const { apiKey } = await api.rotateMcpApiKey();

			await n8n.navigate.toWorkflows();
			await n8n.sideBar.expand();
			await expect(n8n.uiExtensionPages.getMenuItem('Services overview')).toBeVisible();

			const title = `Probe ${nanoid(6)}`;
			const { pageId, created } = await api.mcp.internalMcpCreateCustomPage(apiKey, {
				title,
				source: PROBE_PAGE_SOURCE,
			});
			expect(created).toBe(true);

			// No reload: the push message adds the item.
			const item = n8n.uiExtensionPages.getMenuItem(title);
			await expect(item).toBeVisible();
			// A new page opens nothing by itself.
			await expect(n8n.sidePanel.getContent()).toBeHidden();

			const anchor = await n8n.uiExtensionPages.getAnchorItem();
			const anchorBox = await anchor.boundingBox();
			const groupBox = await n8n.uiExtensionPages.getGroup().boundingBox();
			expect(groupBox!.y).toBeGreaterThanOrEqual(anchorBox!.y + anchorBox!.height - 1);
			await n8n.page.screenshot({ path: test.info().outputPath('sidebar-pages.png') });

			await n8n.uiExtensionPages.open(title);
			await expect(n8n.page).toHaveURL((url) =>
				url.pathname.endsWith(`/extensions/pages/${pageId}`),
			);
			await expect(n8n.uiExtensionPages.getElement('probe-page')).toHaveText('other');
			await expect(n8n.uiExtensionPages.getElement('probe-network')).toHaveText('blocked');
			await expect(n8n.uiExtensionPages.getElement('probe-data')).toHaveText('no-data');

			await n8n.page.reload();
			await expect(n8n.uiExtensionPages.getMenuItem(title)).toBeVisible();
			await expect(n8n.uiExtensionPages.getElement('probe-page')).toHaveText('other');
		});

		test('removes a page from the sidebar after confirmation, in every open editor, and leaves the removed page', async ({
			n8n,
			api,
		}) => {
			await api.setMcpAccess(true);
			const { apiKey } = await api.rotateMcpApiKey();
			const title = `Remove me ${nanoid(6)}`;
			const { pageId } = await api.mcp.internalMcpCreateCustomPage(apiKey, {
				title,
				source: PROBE_PAGE_SOURCE,
			});

			// Tab B shows the workflows list in the same browser context.
			const pageB = await n8n.page.context().newPage();
			const pagesB = new UiExtensionsPages(pageB);
			await pageB.goto('/home/workflows');
			await expect(pagesB.getMenuItem(title)).toBeVisible();

			// Tab A opens the page. Tab B is not brought to the front again, so only the
			// push message can update it.
			await n8n.page.bringToFront();
			await n8n.page.goto(`/extensions/pages/${pageId}`);
			await n8n.sideBar.expand();
			await expect(n8n.uiExtensionPages.getElement('probe-page')).toHaveText('other');

			await (await n8n.uiExtensionPages.getRemoveButton(title)).click();
			await expect(n8n.uiExtensionPages.messageBox.root).toContainText(title);
			await n8n.uiExtensionPages.messageBox.cancelButton.click();
			await expect(n8n.uiExtensionPages.getMenuItem(title)).toBeVisible();

			await (await n8n.uiExtensionPages.getRemoveButton(title)).click();
			await n8n.uiExtensionPages.messageBox.confirmButton.click();

			await expect(n8n.page).not.toHaveURL((url) => url.pathname.includes('/extensions/pages/'));
			await expect(n8n.uiExtensionPages.getMenuItem(title)).toHaveCount(0);
			await expect(pagesB.getMenuItem(title)).toHaveCount(0);
			await expect(
				n8n.notifications.getNotificationByTitle(`Removed the page "${title}"`),
			).toBeVisible();
			await expect(n8n.notifications.getNotificationByTitle('This page was removed')).toHaveCount(
				0,
			);

			await n8n.page.reload();
			await expect(n8n.uiExtensionPages.getMenuItem('Services overview')).toBeVisible();
			await expect(n8n.uiExtensionPages.getMenuItem(title)).toHaveCount(0);

			const { items } = await api.mcp.internalMcpListUiExtensions(apiKey);
			expect(items.map((listed) => listed.id)).not.toContain(pageId);
			await pageB.close();
		});

		test('removes a view from its tab and a page through MCP', async ({ n8n, api }) => {
			await api.setMcpAccess(true);
			const { apiKey } = await api.rotateMcpApiKey();
			const viewTitle = `View ${nanoid(6)}`;
			const pageTitle = `Page ${nanoid(6)}`;
			await api.mcp.internalMcpCreateSidePanelView(apiKey, {
				title: viewTitle,
				source: VIEW_SOURCE,
			});
			const { pageId } = await api.mcp.internalMcpCreateCustomPage(apiKey, {
				title: pageTitle,
				source: PROBE_PAGE_SOURCE,
			});

			await n8n.navigate.toWorkflows();
			await n8n.sideBar.expand();
			await n8n.sidePanel.open();
			await n8n.sidePanel.selectTab(viewTitle);
			await expect(n8n.sidePanel.getViewElement('mcp-view')).toHaveText('view');
			// Built-in tabs and the built-in page have no remove button.
			await expect(n8n.sidePanel.getTabCloseButton(viewTitle)).toBeVisible();
			for (const builtin of ['Recent runs', 'Service data', 'Arcade']) {
				await expect(n8n.sidePanel.getTabCloseButton(builtin)).toHaveCount(0);
			}
			await expect(await n8n.uiExtensionPages.getRemoveButton(pageTitle)).toBeVisible();
			await expect(await n8n.uiExtensionPages.getRemoveButton('Services overview')).toHaveCount(0);

			await n8n.sidePanel.getTabCloseButton(viewTitle).click();
			await n8n.uiExtensionPages.messageBox.confirmButton.click();
			await expect(n8n.sidePanel.getTab(viewTitle)).toHaveCount(0);
			await expect(n8n.sidePanel.getViewElement('recent-runs-subtitle')).toHaveText(
				'All workflows',
			);

			await expect(n8n.uiExtensionPages.getMenuItem(pageTitle)).toBeVisible();
			const removed = await api.mcp.internalMcpDeleteUiExtension(apiKey, pageId);
			expect(removed).toMatchObject({ id: pageId, kind: 'page', title: pageTitle });
			await expect(n8n.uiExtensionPages.getMenuItem(pageTitle)).toHaveCount(0);

			// The page is gone, so a second call is an error and changes nothing.
			await expect(api.mcp.internalMcpDeleteUiExtension(apiKey, pageId)).rejects.toThrow(pageId);
		});

		test("shows the services that the user's workflows connect to on the Services overview page", async ({
			n8n,
			api,
		}) => {
			const slack = await createSlackWorkflow(api, `Overview ${nanoid()}`);
			const failingName = `Failing ${nanoid()}`;
			await api.workflows.createWorkflow({
				name: failingName,
				nodes: [
					{
						id: nanoid(),
						name: 'Start here',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: nanoid(),
						name: 'Stop here',
						type: 'n8n-nodes-base.stopAndError',
						typeVersion: 1,
						position: [200, 0],
						parameters: { errorMessage: 'Stopped on purpose' },
					},
				],
				connections: {
					'Start here': { main: [[{ node: 'Stop here', type: 'main', index: 0 }]] },
				},
			});

			await n8n.navigate.toWorkflow(slack.id);
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(
				n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
			).toBeVisible();

			await n8n.navigate.toWorkflows();
			await n8n.workflows.cards.clickWorkflowCard(failingName);
			await expect(n8n.canvas.nodeByName('Stop here')).toBeVisible();
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.nodeByName('Stop here')).toBeVisible();
			await expect(n8n.notifications.getNotificationByTitle(/Problem in node/)).toBeVisible();

			await n8n.uiExtensionPages.open('Services overview');
			// Other specs can share the instance, so find the card and rows by name, not by count.
			const pages = n8n.uiExtensionPages;
			const card = pages.getOverviewCard(slack.name);
			await expect(card).toHaveCount(1);
			await expect(pages.getOverviewCardPart(card, 'services-overview-service')).toHaveText(
				'Slack',
			);
			await expect(pages.getOverviewCardPart(card, 'services-overview-usage')).toHaveText(
				/^Used in (1 workflow|\d+ workflows) \(\d+ active\)$/,
			);
			await expect(pages.getOverviewCardPart(card, 'services-overview-accounts')).toContainText(
				slack.credential.name,
			);
			await expect(pages.getOverviewCardPart(card, 'services-overview-health')).toHaveText(
				'Healthy',
			);
			await expect(pages.getOverviewFailure(failingName)).toHaveCount(1);
			await n8n.page.screenshot({ path: test.info().outputPath('services-overview.png') });

			await pages.getOverviewCardWorkflow(card, slack.name).click();
			await expect(n8n.page).toHaveURL((url) => url.pathname.endsWith(`/workflow/${slack.id}`));
		});
	},
);
