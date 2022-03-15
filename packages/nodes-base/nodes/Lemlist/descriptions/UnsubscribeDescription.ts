import {
	INodeProperties,
} from 'n8n-workflow';

export const unsubscribeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'add',
		description: 'Operation to perform',
		options: [
			{
				name: 'Add',
				value: 'add',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get All',
				value: 'getAll',
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
		default: '',
		description: 'Email to add to the unsubscribes.',
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
		default: '',
		description: 'Email to delete from the unsubscribes.',
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
		description: 'Return all results.',
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
		description: 'The number of results to return.',
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
