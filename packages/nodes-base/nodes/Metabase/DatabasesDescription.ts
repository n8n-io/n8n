import {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

export const databasesOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'databases',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all the databases',
				routing: {
					request: {
						method: 'GET',
						url: '/api/database/',
					},
				},
			},
			{
				name: 'Get Fields',
				value: 'getFields',
				description: 'Get fields from database',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/api/databse/" + $parameter.databaseId} + "/fields"}',
						returnFullResponse: true,
					},
				},
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
];

export const databasesFields: INodeProperties[] = [
	{
		displayName: 'Database Id',
		name: 'databaseId',
		type: 'string',
		required: true,
		placeholder: '0',
		displayOptions: {
			show: {
				resource: [
					'databases',
				],
								operation: [
										'getFields',
								],
			},
		},
		default: '',
	},
];
