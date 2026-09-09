import { nanoid } from 'nanoid';

import { test, expect, instanceAiTestConfig, SKIP_PROXY_SETUP_ANNOTATION } from './fixtures';
import type { TestRequirements } from '../../../Types';

const requirements: TestRequirements = {
	storage: {
		N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ '108_open_workflow_in_assistant': 'variant' }),
	},
};

test.use(instanceAiTestConfig);

test.describe(
	'Open workflows in assistant by default @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test(
			'treatment user opens a workflow card into the AI Assistant',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ n8n, api, setupRequirements }) => {
				await setupRequirements(requirements);
				const workflow = await api.workflows.createWorkflow({
					name: `Open by default ${nanoid()}`,
					nodes: [],
					connections: {},
				});

				await n8n.navigate.toWorkflows();
				await n8n.workflows.cards.getWorkflow(workflow.name).click();

				await expect(n8n.page).toHaveURL(/\/assistant\/[0-9a-f-]+$/, { timeout: 15_000 });
			},
		);

		test(
			'workflow deep-link creates a thread and redirects to it',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ n8n, api }) => {
				const workflow = await api.workflows.createWorkflow({
					name: `Open by default ${nanoid()}`,
					nodes: [],
					connections: {},
				});
				await n8n.navigate.toInstanceAi();

				await n8n.page.goto(`/assistant/new?workflowId=${workflow.id}`);

				// The guard fetches the workflow, provisions a thread, and redirects
				// with no query — back-button safe, same as the template deep-link.
				await expect(n8n.page).toHaveURL(/\/assistant\/[0-9a-f-]+$/, { timeout: 15_000 });
			},
		);

		test(
			'malformed workflow id lands on the assistant empty view',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ n8n }) => {
				await n8n.navigate.toInstanceAi();

				await n8n.page.goto('/assistant/new?workflowId=%25%25');

				await expect(n8n.page).toHaveURL(/\/assistant$/, { timeout: 15_000 });
				await expect(n8n.instanceAi.getChatInput()).toBeVisible();
			},
		);
	},
);
