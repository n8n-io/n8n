import type { McpRegistryServerResponse } from '@n8n/api-types';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const viewport = { width: 1536, height: 1100 };

test.use({
	viewport,
	capability: {
		env: {
			TEST_ISOLATION: 'instance-ai-connector-menu',
			N8N_ENABLED_MODULES: 'instance-ai',
			N8N_INSTANCE_AI_MODEL_API_KEY: 'test-model-key',
			N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
			N8N_INSTANCE_AI_BROWSER_USE_ENABLED: 'false',
		},
	},
});

test.describe(
	'n8n Assistant connector menu',
	{ annotation: [{ type: 'owner', description: 'instanceAI' }] },
	() => {
		test('shows the full Connect menu for an MCP server near the bottom of the modal', async ({
			n8n,
			api,
			setupRequirements,
		}) => {
			const credential = await api.credentials.createCredential({
				name: `MCP account ${nanoid()}`,
				type: 'mcpOAuth2Api',
				data: {},
			});
			const servers: McpRegistryServerResponse[] = Array.from({ length: 20 }, (_, index) => ({
				slug: `test-mcp-${index}`,
				nodeTypeName: `@n8n/mcp-registry.test-mcp-${index}`,
				name: `test-mcp-${index}`,
				title: `Test MCP server ${String(index).padStart(2, '0')}`,
				description: 'Test MCP connector',
				tagline: 'Test MCP connector',
				version: '1.0.0',
				updatedAt: '2026-09-04T00:00:00.000Z',
				icons: [],
				credentials: [{ credentialType: credential.type, name: 'OAuth2', value: 'oauth2' }],
				tools: [],
				isTemplated: false,
				isOfficial: false,
				status: 'active',
			}));

			try {
				await api.updateInstanceAiSettings({ enabled: true, searchDisabled: true });
				await setupRequirements({
					config: {
						moduleSettings: {
							'instance-ai': {
								enabled: true,
								setupCompleted: true,
								mcpConnectionsAvailable: true,
								workflowBuilderAvailable: true,
								sandboxEnabled: true,
								sandboxUnavailableReason: null,
							},
						},
					},
					intercepts: {
						catalog: {
							url: '**/rest/mcp-registry/servers',
							response: { data: servers },
						},
						connections: {
							url: '**/rest/instance-ai/mcp/connections',
							response: { data: [] },
						},
					},
				});
				await n8n.start.fromHome();
				// Load the saved account and its credential type before opening the Assistant.
				await n8n.navigate.toCredentials();
				await expect(n8n.credentials.cards.getCredential(credential.name)).toBeVisible();
				await n8n.instanceAi.getNewThreadButton().click();
				await expect(n8n.instanceAi.getChatInput()).toBeEnabled();
				await n8n.instanceAi.openConnectors();

				// The same menu works when the server has space below it.
				await n8n.instanceAi.getConnectorConnectButton(servers[0].title).click();
				await expect(n8n.instanceAi.getConnectorCredentialMenu()).toBeInViewport({ ratio: 1 });
				await n8n.instanceAi.getConnectorCreateCredentialButton().click({ trial: true });
				await n8n.instanceAi.getConnectorCreateCredentialButton().press('Escape');
				await expect(n8n.instanceAi.getConnectorCredentialMenu()).toBeHidden();

				await n8n.instanceAi.scrollConnectorsToBottom();
				const connectButton = n8n.instanceAi.getConnectorConnectButton(servers[19].title);
				await expect(connectButton).toBeInViewport({ ratio: 1 });
				await connectButton.click();
				const menu = n8n.instanceAi.getConnectorCredentialMenu();
				await expect(menu).toBeVisible();
				const menuBounds = await menu.boundingBox();
				// The menu fits on the screen. Its scroll container clips it.
				expect(menuBounds?.y).toBeGreaterThanOrEqual(0);
				expect(menuBounds && menuBounds.y + menuBounds.height).toBeLessThanOrEqual(viewport.height);

				// NODE-5913: The menu must remain visible outside the list's clipped area.
				await expect(
					menu,
					'The Connect menu must be fully visible at the bottom of the modal',
				).toBeInViewport({ ratio: 1 });
				await n8n.instanceAi.getConnectorCreateCredentialButton().click({ trial: true });
			} finally {
				await api.credentials.deleteCredential(credential.id);
			}
		});
	},
);
