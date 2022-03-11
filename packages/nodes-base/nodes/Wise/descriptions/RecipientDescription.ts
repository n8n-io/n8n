import {
	INodeProperties,
} from 'n8n-workflow';

export const recipientOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'getAll',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'recipient',
				],
			},
		},
	},
];

export const recipientFields: INodeProperties[] = [
	// ----------------------------------
	//        recipient: getAll
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
					'recipient',
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
					'recipient',
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
