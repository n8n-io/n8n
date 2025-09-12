import { MANUAL_TRIGGER_NODE_NAME } from '../../config/constants';
import { test, expect } from '../../fixtures/base';
import customCredential from '../../workflows/Custom_credential.json';
import customNodeFixture from '../../workflows/Custom_node.json';
import customNodeWithCustomCredentialFixture from '../../workflows/Custom_node_custom_credential.json';
import customNodeWithN8nCredentialFixture from '../../workflows/Custom_node_n8n_credential.json';

const CUSTOM_NODE_NAME = 'E2E Node';
const CUSTOM_NODE_WITH_N8N_CREDENTIAL = 'E2E Node with native n8n credential';
const CUSTOM_NODE_WITH_CUSTOM_CREDENTIAL = 'E2E Node with custom credential';
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

test.describe('Community and custom nodes in canvas', () => {
	test.beforeEach(async ({ page }) => {
		await page.route('/types/nodes.json', async (route) => {
			const response = await route.fetch();
			const nodes = await response.json();
			nodes.push(
				customNodeFixture,
				customNodeWithN8nCredentialFixture,
				customNodeWithCustomCredentialFixture,
			);
			await route.fulfill({
				response,
				json: nodes,
				headers: { 'cache-control': 'no-cache, no-store' },
			});
		});

		await page.route('/types/credentials.json', async (route) => {
			const response = await route.fetch();
			const credentials = await response.json();
			credentials.push(customCredential);
			await route.fulfill({
				response,
				json: credentials,
				headers: { 'cache-control': 'no-cache, no-store' },
			});
		});

		await page.route('/community-node-types', async (route) => {
			await route.fulfill({ status: 200, json: { data: [] } });
		});

		await page.route('**/community-node-types/*', async (route) => {
			await route.fulfill({ status: 200, json: null });
		});

		await page.route('https://registry.npmjs.org/*', async (route) => {
			await route.fulfill({ status: 404, json: {} });
		});
	});

	test('should render and select community node', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();

		await n8n.canvas.clickCanvasPlusButton();
		await n8n.canvas.fillNodeCreatorSearchBar(CUSTOM_NODE_NAME);
		await n8n.canvas.clickNodeCreatorItemName(CUSTOM_NODE_NAME);
		await n8n.canvas.clickAddToWorkflowButton();

		await expect(n8n.ndv.getNodeParameters()).toBeVisible();

		await expect(n8n.ndv.getParameterInputField('testProp')).toHaveValue('Some default');
		await expect(n8n.ndv.getParameterInputField('resource')).toHaveValue('option2');

		await n8n.ndv.selectOptionInParameterDropdown('resource', 'option4');
		await expect(n8n.ndv.getParameterInputField('resource')).toHaveValue('option4');
	});

	test('should render custom node with n8n credential', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);

		await n8n.canvas.clickNodeCreatorPlusButton();
		await n8n.canvas.fillNodeCreatorSearchBar(CUSTOM_NODE_WITH_N8N_CREDENTIAL);
		await n8n.canvas.clickNodeCreatorItemName(CUSTOM_NODE_WITH_N8N_CREDENTIAL);
		await n8n.canvas.clickAddToWorkflowButton();

		await n8n.page.getByTestId('credentials-label').click();
		await n8n.page.getByTestId('node-credentials-select-item-new').click();

		await expect(n8n.page.getByTestId('editCredential-modal')).toContainText('Notion API');
	});

	test('should render custom node with custom credential', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);

		await n8n.canvas.clickNodeCreatorPlusButton();
		await n8n.canvas.fillNodeCreatorSearchBar(CUSTOM_NODE_WITH_CUSTOM_CREDENTIAL);
		await n8n.canvas.clickNodeCreatorItemName(CUSTOM_NODE_WITH_CUSTOM_CREDENTIAL);
		await n8n.canvas.clickAddToWorkflowButton();

		await n8n.page.getByTestId('credentials-label').click();
		await n8n.page.getByTestId('node-credentials-select-item-new').click();

		await expect(n8n.page.getByTestId('editCredential-modal')).toContainText(
			'Custom E2E Credential',
		);
	});
});

test.describe('Community nodes management', () => {
	test('can install, update and uninstall community nodes', async ({ n8n, page }) => {
		await page.route('**/api.npms.io/v2/search*', async (route) => {
			await route.fulfill({ status: 200, json: {} });
		});

		await page.route('/rest/community-packages', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({ status: 200, json: { data: [] } });
			}
		});

		await n8n.navigate.toCommunityNodes();

		await page.route('/rest/community-packages', async (route) => {
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
		await page.route('/rest/community-packages', async (route) => {
			if (route.request().method() === 'PATCH') {
				await route.fulfill({ status: 200, json: { data: updatedPackage } });
			}
		});

		await n8n.communityNodes.updatePackage();
		await expect(n8n.communityNodes.getCommunityCards()).toHaveCount(1);
		await expect(n8n.communityNodes.getCommunityCards().first()).not.toContainText('v1.0.0');

		await page.route('/rest/community-packages*', async (route) => {
			if (route.request().method() === 'DELETE') {
				await route.fulfill({ status: 204 });
			}
		});

		await n8n.communityNodes.uninstallPackage();
		await expect(n8n.communityNodes.getActionBox()).toBeVisible();
	});
});
