import { INodeProperties } from 'n8n-workflow';

export const mentionsDescription: INodeProperties[] = [
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
					'mention',
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
				name: 'Delete',
				value: 'delete',
				description: 'Delete an entry',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all entries',
			},
		],
		default: 'create',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'Mentionable Type',
		name: 'mentionable_type',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'mention',
				],
				api: [
					'rest',
				],
			},
		},
	},
	{
		displayName: 'Mentionable ID',
		name: 'mentionable_id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'mention',
				],
				api: [
					'rest',
				],
			},
		},
	},
	{
		displayName: 'Mention ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'mention',
				],
				api: [
					'rest',
				],
			},
		},
	},
];
