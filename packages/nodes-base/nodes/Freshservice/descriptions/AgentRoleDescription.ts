import {
	INodeProperties,
} from 'n8n-workflow';

export const agentRoleOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'agentRole',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an agent role',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all agent roles',
			},
		],
		default: 'get',
	},
];

export const agentRoleFields: INodeProperties[] = [
	// ----------------------------------------
	//              agentRole: get
	// ----------------------------------------
	{
		displayName: 'Agent Role ID',
		name: 'agentRoleId',
		description: 'ID of the agent role to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'agentRole',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//            agentRole: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'agentRole',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'How many results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'agentRole',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
];
