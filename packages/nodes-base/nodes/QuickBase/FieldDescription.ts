import { INodeProperties } from 'n8n-workflow';

export const fieldOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['field'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many fields',
				action: 'Get many fields',
			},
		],
		default: 'getAll',
	},
];

export const fieldFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                field:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['field'],
				operation: ['getAll'],
			},
		},
		description: 'The table identifier',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['field'],
				operation: ['getAll'],
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
				resource: ['field'],
				operation: ['getAll'],
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['field'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Include Field Perms',
				name: 'includeFieldPerms',
				type: 'boolean',
				default: false,
				description: 'Whether to get back the custom permissions for the field(s)',
			},
		],
	},
];
