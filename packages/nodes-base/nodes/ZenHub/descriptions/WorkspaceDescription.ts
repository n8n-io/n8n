import {
	INodeProperties,
} from 'n8n-workflow';

export const workspaceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'workspace',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Gets all Workspaces containing a given repository',
			},
			{
				name: 'Get Board',
				value: 'getBoard',
				description: 'Get ZenHub Board data for a repository within a Workspace',
			},
		],
		default: 'get',
		description: 'The operation to perform',
		noDataExpression: true,
	},
];

export const workspaceFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                workspace:get                               */
/* -------------------------------------------------------------------------- */

	// Uses repoID

/* -------------------------------------------------------------------------- */
/*                                workspace:getBoard                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace ID',
		name: 'workspaceId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'workspace',
				],
				operation: [
					'getBoard',
				],
			}
		},
		required: true
	},
];
