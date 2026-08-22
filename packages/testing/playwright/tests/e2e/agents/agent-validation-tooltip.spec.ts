import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';

test.use({
	capability: {
		env: {
			N8N_ENABLED_MODULES: 'agents',
			TEST_ISOLATION: 'agent-validation-tooltip',
		},
	},
});

test.describe(
	'Agent config validation tooltip',
	{ annotation: [{ type: 'owner', description: 'AI' }] },
	() => {
		test('lists the specific missing fields on the disabled preview and publish buttons', async ({
			n8n,
			api,
		}) => {
			const project = await api.projects.getMyPersonalProject();
			const agent = await api.agents.createAgent(project.id, `Agent ${nanoid(8)}`);

			await n8n.start.fromHome();
			await n8n.agentBuilder.goto(project.id, agent.id);

			await n8n.agentBuilder.getPreviewButton().hover();
			await expect(n8n.agentBuilder.getVisibleTooltip()).toContainText(
				'Instructions: A required field is missing',
			);
			await expect(n8n.agentBuilder.getVisibleTooltip()).toContainText(
				'Model: A required field is missing',
			);

			await n8n.agentBuilder.getPublishButton().hover();
			await expect(n8n.agentBuilder.getVisibleTooltip()).toContainText(
				'Instructions: A required field is missing',
			);
			await expect(n8n.agentBuilder.getVisibleTooltip()).toContainText(
				'Model: A required field is missing',
			);
		});
	},
);
