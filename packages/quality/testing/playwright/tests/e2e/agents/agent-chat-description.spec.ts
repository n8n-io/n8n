import type { AgentN8nChatAgentDetails } from '@n8n/api-types';
import { nanoid } from 'nanoid';

import { setContextModuleSettings } from '../../../config/intercepts';
import { expect, test } from '../../../fixtures/base';

test.use({
	capability: {
		env: { N8N_ENABLED_MODULES: 'agents,instance-ai', TEST_ISOLATION: 'agent-chat-description' },
	},
});

test.describe(
	'Agent chat description',
	{ annotation: [{ type: 'owner', description: 'Agent' }] },
	() => {
		test('wraps the full description on desktop and mobile', async ({
			n8n,
			api,
			setupRequirements,
		}) => {
			await setupRequirements({
				storage: {
					N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ '125_agents_n8n_chat': 'variant-a' }),
				},
			});
			setContextModuleSettings(n8n.page.context(), {
				'instance-ai': { enabled: true, setupCompleted: true },
			});
			const { id, name } = await api.projects.getMyPersonalProject();
			const text =
				'Turn completed work into clear release notes. Summarize the changes, explain why they matter, and flag anything users need to do before they upgrade.';
			const agent: AgentN8nChatAgentDetails = {
				id: nanoid(),
				name: 'Release notes assistant',
				description: text,
				project: { id, name },
				attachments: { image: false, pdf: false, audio: false },
				availableInChat: true,
				subAgents: [],
			};
			await n8n.page.route(`**/rest/agents/v2/n8n-chat/agents/${agent.id}`, async (route) => {
				await route.fulfill({ json: { data: agent } });
			});
			await n8n.page.setViewportSize({ width: 1536, height: 960 });
			await n8n.start.fromHome();
			await n8n.instanceAi.gotoAgentChat(agent.id);

			const description = n8n.instanceAi.agentChatEmptyState.getDescription();
			await expect(description).toHaveText(text);
			await n8n.page.evaluate(async () => {
				await document.fonts.ready;
			});
			// AGENT-1686: The full description must not fit on one line on a wide screen.
			expect(
				await description.evaluate((element) => {
					const range = document.createRange();
					range.selectNodeContents(element);
					return range.getClientRects().length;
				}),
			).toBeGreaterThan(1);
			expect(await description.evaluate((element) => element.clientWidth)).toBeLessThan(640);

			await n8n.page.setViewportSize({ width: 375, height: 667 });
			await expect(description).toBeInViewport({ ratio: 1 });
			expect(await description.evaluate((element) => element.scrollWidth)).toBe(
				await description.evaluate((element) => element.clientWidth),
			);
		});
	},
);
