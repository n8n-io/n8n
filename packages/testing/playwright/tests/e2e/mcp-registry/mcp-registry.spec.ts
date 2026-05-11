import { AGENT_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'mcp-registry',
			N8N_ENABLED_MODULES: 'mcp-registry',
		},
	},
});

test.describe(
	'MCP Registry',
	{
		annotation: [{ type: 'owner', description: 'AI' }],
	},
	() => {
		test('exposes Notion MCP as a tool with hidden connection fields', async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();

			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });
			await n8n.canvas.addSupplementalNodeToParent('Notion MCP', 'ai_tool', AGENT_NODE_NAME, {
				exactMatch: true,
				subcategory: 'MCP',
				exactSubcategory: true,
			});

			await expect(n8n.ndv.getParameterInput('endpointUrl')).toBeHidden();
			await expect(n8n.ndv.getParameterInput('serverTransport')).toBeHidden();
			await expect(n8n.ndv.getParameterInput('authentication')).toBeHidden();

			await expect(n8n.ndv.getNodeCredentialsQuickConnectEmptyState()).toBeVisible();
			await expect(n8n.ndv.getParameterInput('include')).toBeVisible();
		});
	},
);
