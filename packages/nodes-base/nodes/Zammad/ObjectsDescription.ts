import {
	INodeProperties,
} from 'n8n-workflow';

export const ObjectsDescription = [
			// ----------------------------------
			//         Operation: object
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['object'],
						api: ['rest']
					}
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an entry.'
					},
					{
						name: 'Show',
						value: 'show',
						description: 'Get data of an entry.'
					},
					{
						name: 'List',
						value: 'list',
						description: 'Get data of all entries.'
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an entry.'
					},
					{
						name: 'Execute Database Migrations',
						value: 'executeDatabaseMigrations',
						description: 'Execute database migrations.'
					},
				],
				default: 'create',
				description: 'The operation to perform.'
			},
			// ----------------------------------
			//         Fields: object
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['update', 'show'],
						resource: ['object'],
						api: ['rest'],
					}
				},
				description: 'The ID of the object.'
			},
			{
				displayName: 'Data',
				name: 'data',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['update', 'create'],
						resource: ['object'],
						api: ['rest'],
					},
				},
				default: '',
				description: "The data in JSON format to send to the Zammad Objects API. Doesn't need to contain ID when updating. Objects endpoints aren't well documented so this approach was chosen to not exclude potential usecases.",
			},
] as INodeProperties[];
