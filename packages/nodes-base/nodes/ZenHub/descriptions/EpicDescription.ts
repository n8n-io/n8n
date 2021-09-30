import {
	INodeProperties,
} from 'n8n-workflow';

export const epicOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'epic',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get all Epics for a repository',
			},
			{
				name: 'Get Epic',
				value: 'getEpic',
				description: 'Get the data for an Epic issue',
			},
		],
		default: 'get',
		description: 'The operation to perform',
		noDataExpression: true,
	},
];

export const epicFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                epic:get                                    */
/* -------------------------------------------------------------------------- */

	// Uses repoID

/* -------------------------------------------------------------------------- */
/*                                epic:getEpics                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Epic ID',
		name: 'epicId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'epic',
				],
				operation: [
					'getEpic',
				],
			}
		},
		required: true
	},
];
