import {
	INodeProperties,
} from 'n8n-workflow';

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
				action: 'Add an email to an unsubscribe list',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an email from an unsubscribe list',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all unsubscribed emails',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'unsubscribe',
				],
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
				resource: [
					'unsubscribe',
				],
				operation: [
					'add',
				],
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
				resource: [
					'unsubscribe',
				],
				operation: [
					'delete',
				],
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
				resource: [
					'unsubscribe',
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
		default: 5,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: [
					'unsubscribe',
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
