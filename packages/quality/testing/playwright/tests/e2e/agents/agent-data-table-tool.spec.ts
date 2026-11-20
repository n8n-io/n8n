import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';

test.use({
	capability: {
		env: {
			N8N_ENABLED_MODULES: 'agents',
			TEST_ISOLATION: 'agent-data-table-tool',
		},
	},
});

// AGENT-1620: A member must be able to choose a table while adding the tool.
test(
	'lists project tables and loads the selected table columns in the Data table tool @auth:member',
	{ annotation: [{ type: 'owner', description: 'Agent' }] },
	async ({ n8n, api }) => {
		const project = await api.projects.getMyPersonalProject();
		const agent = await api.agents.create(project.id, `Data table agent ${nanoid(6)}`);
		const columnName = 'contactName';
		const table = await api.dataTables.create(project.id, {
			name: `Contacts ${nanoid(6)}`,
			columns: [{ name: columnName, type: 'string' }],
		});

		await n8n.start.fromHome();
		await n8n.agentBuilder.goto(project.id, agent.id);
		await n8n.agentBuilder.openToolConfig('Data table');
		await expect(n8n.agentBuilder.getToolParameterSelect('resource')).toHaveValue('Row');
		await expect(n8n.agentBuilder.getToolParameterSelect('operation')).toHaveValue('Insert');

		const locator = n8n.agentBuilder.toolResourceLocator;
		await locator.open('dataTableId');
		const tableOption = n8n.agentBuilder.getToolResourceOption(table.name);
		const loadError = locator.getErrorMessage('dataTableId');
		// Include the dropdown error in the failure output.
		await expect(tableOption.or(loadError)).toHaveText(table.name);
		await tableOption.click();
		await expect(n8n.agentBuilder.getToolMappingField(columnName)).toBeVisible();
	},
);
