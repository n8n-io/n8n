import { test, expect } from '../../../../fixtures/base';

const MOCK_PACKAGE = {
	createdAt: '2024-07-22T19:08:06.505Z',
	updatedAt: '2024-07-22T19:08:06.505Z',
	packageName: 'n8n-nodes-chatwork',
	installedVersion: '1.0.0',
	authorName: null,
	authorEmail: null,
	installedNodes: [
		{
			name: 'Chatwork',
			type: 'n8n-nodes-chatwork.chatwork',
			latestVersion: 1,
		},
	],
	updateAvailable: '1.1.2',
};

test.describe('Community nodes management', {
	annotation: [
		{ type: 'owner', description: 'NODES' },
	],
}, () => {
	test('can install, update and uninstall community nodes', async ({ n8n }) => {
		await n8n.page.route('**/api.npms.io/v2/search*', async (route) => {
			await route.fulfill({ status: 200, json: {} });
		});

		await n8n.page.route('/rest/community-packages', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({ status: 200, json: { data: [] } });
			}
		});

		await n8n.navigate.toCommunityNodes();

		await n8n.page.route('/rest/community-packages', async (route) => {
			if (route.request().method() === 'POST') {
				await route.fulfill({ status: 200, json: { data: MOCK_PACKAGE } });
			} else if (route.request().method() === 'GET') {
				await route.fulfill({ status: 200, json: { data: [MOCK_PACKAGE] } });
			}
		});

		await n8n.communityNodes.installPackage('n8n-nodes-chatwork@1.0.0');
		await expect(n8n.communityNodes.getCommunityCards()).toHaveCount(1);
		await expect(n8n.communityNodes.getCommunityCards().first()).toContainText('v1.0.0');

		const updatedPackage = {
			...MOCK_PACKAGE,
			installedVersion: '1.2.0',
			updateAvailable: undefined,
		};
		await n8n.page.route('/rest/community-packages', async (route) => {
			if (route.request().method() === 'PATCH') {
				await route.fulfill({ status: 200, json: { data: updatedPackage } });
			}
		});

		await n8n.communityNodes.updatePackage();
		await expect(n8n.communityNodes.getCommunityCards()).toHaveCount(1);
		await expect(n8n.communityNodes.getCommunityCards().first()).not.toContainText('v1.0.0');

		await n8n.page.route('/rest/community-packages*', async (route) => {
			if (route.request().method() === 'DELETE') {
				await route.fulfill({ status: 204 });
			}
		});

		await n8n.communityNodes.uninstallPackage();
		await expect(n8n.communityNodes.getActionBox()).toBeVisible();
	});
});
