import { INodeProperties } from 'n8n-workflow';

export const eventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['event'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an event',
				action: 'Create an event',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all events',
				action: 'Get all events',
			},
		],
		default: 'getAll',
	},
];

export const eventFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                event:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['event'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['event'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                event:create                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Event Type',
		name: 'eventType',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['event'],
			},
		},
		required: true,
		default: '',
		description: 'The Entity ID for which an event will be created',
	},
	{
		displayName: 'Event Attributes',
		name: 'eventAttributes',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Attribute',
		default: {},
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Attributes',
				name: 'attributes',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the attribute',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the attribute',
					},
				],
			},
		],
	},
];
