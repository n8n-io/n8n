import {
	INodeProperties,
} from 'n8n-workflow';

export const objectsDescription: INodeProperties[] = [
	// ----------------------------------
	//           operations
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'object',
				],
				api: [
					'rest',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an entry',
			},
			{
				name: 'Execute Database Migrations',
				value: 'executeDatabaseMigrations',
				description: 'Execute database migrations',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an entry',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all entries',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an entry',
			},
		],
		default: 'create',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
					'get',
				],
				resource: [
					'object',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The ID of the object',
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
					'create',
				],
				resource: [
					'object',
				],
				api: [
					'rest',
				],
			},
		},
		default: '',
		description: 'The data in JSON format to send to the Zammad Objects API. Does not need to contain ID when updating. Objects endpoints are not well documented so this approach was chosen to not exclude potential usecases.',
	},
];
