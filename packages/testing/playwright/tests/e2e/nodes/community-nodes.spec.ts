import { MANUAL_TRIGGER_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';
import customCredential from '../../../workflows/Custom_credential.json';
import customNodeFixture from '../../../workflows/Custom_node.json';
import customNodeWithCustomCredentialFixture from '../../../workflows/Custom_node_custom_credential.json';
import customNodeWithN8nCredentialFixture from '../../../workflows/Custom_node_n8n_credential.json';

const CUSTOM_NODE_NAME = 'E2E Node';
const CUSTOM_NODE_WITH_N8N_CREDENTIAL = 'E2E Node with native n8n credential';
const CUSTOM_NODE_WITH_CUSTOM_CREDENTIAL = 'E2E Node with custom credential';

test.describe('Community and custom nodes in canvas', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.page.route('/types/nodes.json', async (route) => {
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

		await n8n.page.route('/types/credentials.json', async (route) => {
			const response = await route.fetch();
			const credentials = await response.json();
			credentials.push(customCredential);
			await route.fulfill({
				response,
				json: credentials,
				headers: { 'cache-control': 'no-cache, no-store' },
			});
		});

		await n8n.page.route('/community-node-types', async (route) => {
			await route.fulfill({ status: 200, json: { data: [] } });
		});

		await n8n.page.route('**/community-node-types/*', async (route) => {
			await route.fulfill({ status: 200, json: null });
		});

		await n8n.page.route('https://registry.npmjs.org/*', async (route) => {
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
