import { AGENT_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'mcp-registry-node' } } });

test.describe(
	'MCP Registry node',
	{
		annotation: [{ type: 'owner', description: 'AI' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test('exposes the Notion MCP entry in the node creator search', async ({ n8n }) => {
			await n8n.canvas.clickNodeCreatorPlusButton();
			await n8n.canvas.fillNodeCreatorSearchBar('Notion MCP');

			await expect(
				n8n.canvas.nodeCreator.getNodeItems().filter({ hasText: 'Notion MCP' }).first(),
			).toBeVisible();
		});

		test('renders the AI tool side panel without endpoint, transport, or auth fields', async ({
			n8n,
		}) => {
			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });
			await n8n.canvas.addSupplementalNodeToParent('Notion MCP', 'ai_tool', AGENT_NODE_NAME, {
				exactMatch: true,
			});

			await expect(n8n.ndv.getParameterInput('endpointUrl')).toBeHidden();
			await expect(n8n.ndv.getParameterInput('serverTransport')).toBeHidden();
			await expect(n8n.ndv.getParameterInput('authentication')).toBeHidden();

			await expect(n8n.ndv.getParameterInput('include')).toBeVisible();
		});
	},
);
