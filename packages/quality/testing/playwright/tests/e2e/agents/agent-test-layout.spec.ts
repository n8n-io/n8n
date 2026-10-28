import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';

test.use({
	capability: {
		env: {
			N8N_ENABLED_MODULES: 'agents',
			TEST_ISOLATION: 'agent-preview-layout',
		},
	},
});

test.describe(
	'Agent preview layout',
	{ annotation: [{ type: 'owner', description: 'AI' }] },
	() => {
		test('fills the builder when full width is selected', async ({ n8n, api }) => {
			const project = await api.projects.getMyPersonalProject();
			const { id: agentId } = await api.agents.create(project.id, `Preview layout ${nanoid(6)}`);

			await n8n.start.fromHome();
			await n8n.agentBuilder.goto(project.id, agentId, { openPreview: true });

			const builder = n8n.agentBuilder.getBuilderContainer();
			const dock = n8n.agentBuilder.getPreviewDock();
			await expect(builder).toBeVisible();
			await expect(dock).toBeVisible();
			await expect(dock).toHaveAttribute('data-preview-layout', 'docked');

			expect(await n8n.agentBuilder.getPreviewWidthDifference()).toBeGreaterThan(10);

			await n8n.agentBuilder.getPreviewMoreButton().click();
			await n8n.agentBuilder.getFullWidthMenuItem().click();
			await expect(dock).toHaveAttribute('data-preview-layout', 'fullpage');

			await expect
				.poll(async () => await n8n.agentBuilder.getPreviewWidthDifference())
				.toBeLessThan(2);

			await n8n.page.setViewportSize({ width: 375, height: 667 });
			await n8n.page.emulateMedia({ colorScheme: 'dark' });
			await expect
				.poll(async () => await n8n.agentBuilder.getPreviewWidthDifference())
				.toBeLessThan(2);
		});
	},
);
