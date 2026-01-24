import type { INodeProperties } from 'n8n-workflow';

export const unsubscribeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'add',
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add an email to the unsubscribe list',
				action: 'Add an email to an unsubscribe list',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an email from the unsubscribe list',
				action: 'Delete an email from an unsubscribe list',
			},
			{
				name: 'Export',
				value: 'export',
				description: 'Export unsubscribe list to CSV',
				action: 'Export unsubscribe list',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific unsubscribe entry',
				action: 'Get an unsubscribe entry',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many unsubscribed emails',
				action: 'Get many unsubscribed emails',
			},
		],
		displayOptions: {
			show: {
				resource: ['unsubscribe'],
			},
		},
	},
];

export const unsubscribeFields: INodeProperties[] = [
	// ----------------------------------
	//        unsubscribe: add
	// ----------------------------------
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'Email to add to the unsubscribes',
		displayOptions: {
			show: {
				resource: ['unsubscribe'],
				operation: ['add'],
			},
		},
	},

	// ----------------------------------
	//        unsubscribe: delete
	// ----------------------------------
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'Email to delete from the unsubscribes',
		displayOptions: {
			show: {
				resource: ['unsubscribe'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------
	//        unsubscribe: get
	// ----------------------------------
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'Email to retrieve unsubscribe information for',
		displayOptions: {
			show: {
				resource: ['unsubscribe'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------
	//       unsubscribe: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['unsubscribe'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['unsubscribe'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------
	//       unsubscribe: export
	// ----------------------------------
	// No additional fields required - returns CSV
];
