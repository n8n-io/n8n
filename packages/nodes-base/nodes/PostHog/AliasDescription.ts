import type { INodeProperties } from 'n8n-workflow';

export const aliasOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['alias'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an alias',
				action: 'Create an alias',
			},
		],
		default: 'create',
	},
];

export const aliasFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 alias:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Alias',
		name: 'alias',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['alias'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The name of the alias',
	},
	{
		displayName: 'Distinct ID',
		name: 'distinctId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['alias'],
				operation: ['create'],
			},
		},
		default: '',
		description: "The user's distinct ID",
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['alias'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Context',
				name: 'contextUi',
				type: 'fixedCollection',
				placeholder: 'Add Property',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Context',
						name: 'contextValues',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Timestamp',
				name: 'timestamp',
				type: 'dateTime',
				default: '',
				description: "If not set, it'll automatically be set to the current time",
			},
		],
	},
];
