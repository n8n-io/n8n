import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const TEST_API_KEY = 'test-api-key';

test.describe(
	'Node Credential Picker Scoping',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('offers only credentials the project can use, across an unscoped credential fetch', async ({
			n8n,
			api,
		}) => {
			// The picker asks the backend which credentials this workflow may use, but
			// several everyday actions fetch every credential the *user* can read. Those
			// answers used to share one store slot, so the last fetch to land owned the
			// dropdown — offering credentials the workflow cannot use, which the backend
			// then rejects or silently discards on save.
			const personalCredName = `Personal Notion ${nanoid()}`;
			await api.credentials.createCredential({
				name: personalCredName,
				type: 'notionApi',
				data: { apiKey: TEST_API_KEY },
			});

			const project = await api.projects.createProject(`Team ${nanoid()}`);
			const teamCredName = `Team Notion ${nanoid()}`;
			const teamCred = await api.credentials.createCredential({
				name: teamCredName,
				type: 'notionApi',
				data: { apiKey: TEST_API_KEY },
				projectId: project.id,
			});

			const workflow = await api.workflows.createWorkflow(
				{
					name: `Credential scope ${nanoid()}`,
					nodes: [
						{
							id: nanoid(),
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [250, 300],
							parameters: {},
						},
						{
							id: nanoid(),
							name: 'Notion',
							type: 'n8n-nodes-base.notion',
							typeVersion: 2.2,
							position: [450, 300],
							parameters: { resource: 'database', operation: 'get' },
							credentials: {
								notionApi: { id: teamCred.id, name: teamCredName },
							},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'Notion', type: 'main', index: 0 }]],
						},
					},
					active: false,
					settings: {},
				},
				project.id,
			);

			await n8n.navigate.toWorkflow(workflow.id);
			await n8n.canvas.openNode('Notion');
			await expect(n8n.ndv.container).toBeVisible();

			await n8n.ndv.getNodeCredentialsSelect().click();
			await expect(n8n.ndv.credentials.getOptionByText(teamCredName)).toBeVisible();
			await expect(n8n.ndv.credentials.getOptionByText(personalCredName)).toBeHidden();
			await n8n.page.keyboard.press('Escape');
			await n8n.ndv.close();

			// "Change owner" loads every credential the user can read, personal ones
			// included, without leaving the workflow. The picker must not widen because
			// of it.
			const unscopedFetch = n8n.page.waitForResponse(
				(response) =>
					new URL(response.url()).pathname === '/rest/credentials' &&
					response.request().method() === 'GET',
			);
			await n8n.workflowMenu.openChangeOwner();
			await unscopedFetch;
			await n8n.page.keyboard.press('Escape');

			await n8n.canvas.openNode('Notion');
			await n8n.ndv.getNodeCredentialsSelect().click();
			await expect(n8n.ndv.credentials.getOptionByText(teamCredName)).toBeVisible();
			await expect(n8n.ndv.credentials.getOptionByText(personalCredName)).toBeHidden();
		});
	},
);
