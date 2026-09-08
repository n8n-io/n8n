import { nanoid } from 'nanoid';

import { test, expect } from '../../../../../fixtures/base';

/**
 * `?settings=1` on an editor route opens the workflow settings modal from
 * `NodeView`'s mount hook, then strips the query. `WORKFLOW_SETTINGS_MODAL_KEY`
 * has the widest consumer set of the keyed modals, so a registration change
 * that breaks this entry point breaks it silently: no other test observes the
 * deep link.
 */
test.describe(
	'Workflow settings deep link',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('opens the workflow settings modal from the ?settings=1 query', async ({ n8n, api }) => {
			const workflow = await api.workflows.createWorkflow({
				name: `Settings deep link ${nanoid(8)}`,
				nodes: [],
				connections: {},
			});

			await n8n.navigate.toWorkflow(workflow.id, { query: { settings: '1' } });

			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();
			await expect(n8n.workflowSettingsModal.getErrorWorkflowField()).toBeVisible();

			// The mount hook replaces the route once it has consumed the query, so a
			// reload does not reopen the modal.
			await expect(n8n.page).toHaveURL(`/workflow/${workflow.id}`);
		});
	},
);
