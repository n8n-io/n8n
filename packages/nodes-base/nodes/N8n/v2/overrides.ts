import { defineOverrides, param } from './define-overrides';
import { getProjectRoles } from './methods';
import { searchWorkflows, workflowIdLocator } from '../shared/WorkflowLocator';

const workflow = param(
	{
		...workflowIdLocator,
		description: 'Choose the workflow from the list, or enter its URL or ID',
	},
	{ listSearch: searchWorkflows },
);

const projectRole = param(
	{
		displayName: 'Role Name or ID',
		type: 'options',
		default: 'project:viewer',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{ loadOptions: getProjectRoles },
);

export default defineOverrides({
	include: [
		'audit',
		'credential:create',
		'credential:delete',
		'credential:getType',
		'execution:delete',
		'execution:get',
		'execution:getAll',
		'project',
		'user',
		'workflow:create',
		'workflow:delete',
		'workflow:get',
		'workflow:getAll',
		'workflow:getVersion',
		'workflow:publish',
		'workflow:unpublish',
		'workflow:update',
	],
	exclude: {
		getDiscover: 'Describes the API for API clients. Not useful as a workflow step.',
	},
	rules: [
		{ api: 'path:workflowId', use: workflow },
		{ api: 'query:workflowId', use: workflow },
		{ api: 'body:role', resource: 'project', use: projectRole },
		{
			api: 'query:redactExecutionData',
			use: param({
				description:
					'Whether to redact the execution output data. Leave it out to follow the workflow redaction policy. Revealing the data needs the `execution:reveal` scope.',
			}),
		},
		{
			api: 'query:includeParentFolder',
			use: param({ description: 'Whether to add the parent folder to each workflow' }),
		},
	],
	operations: {
		'project:addUser': {
			api: 'addUsersToProject',
			displayName: 'Add User',
			action: 'Add a user to a project',
			description: 'Add a user to a project with a project role.',
			flatten: 'relations',
		},
	},
});
